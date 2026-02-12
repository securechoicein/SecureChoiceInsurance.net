/**
 * SecureChoice Insurance Lead Capture Backend
 * Google Apps Script Web App
 * 
 * Handles:
 * - Lead form submissions from "Check My Options"
 * - PDF generation for Policy Health Check results
 * - Confirmation email with PDF attachment
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Email settings
  EMAIL_FROM_NAME: 'SecureChoice Insurance',
  EMAIL_REPLY_TO: 'securechoicein@gmail.com',
  EMAIL_SUBJECT: 'Your SecureChoice Results + Next Steps',
  
  // Sheet configuration (if using Google Sheets for lead storage)
  SHEET_ID: '', // Set this to your Google Sheet ID if using Sheets
  SHEET_NAME: 'Leads',
  
  // Properties Service key prefix for idempotency
  SENT_EMAIL_PREFIX: 'sent_email_',
  
  // Drive folder ID for storing PDFs (optional)
  DRIVE_FOLDER_ID: '' // Set this if you want to store PDFs in Drive
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Handle POST requests from the frontend
 */
function doPost(e) {
  try {
    // Parse request
    const payload = parsePayload(e);
    
    // Log request for debugging
    console.log('Received request:', JSON.stringify(payload));
    
    // Route based on mode
    if (payload.mode === 'pdf_results') {
      return handlePdfRequest(payload);
    } else {
      // Default: lead submission
      return handleLeadSubmission(payload);
    }
    
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle GET requests (optional - for health checks)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// REQUEST PARSING
// ============================================================================

/**
 * Parse incoming request payload
 */
function parsePayload(e) {
  let payload = {};
  
  try {
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      payload = e.parameter;
    }
  } catch (error) {
    console.error('Error parsing payload:', error);
  }
  
  return payload;
}

// ============================================================================
// LEAD SUBMISSION HANDLER
// ============================================================================

/**
 * Handle lead form submission from "Check My Options"
 */
function handleLeadSubmission(payload) {
  try {
    // Extract lead data
    const leadData = extractLeadData(payload);
    
    // Generate unique lead ID
    const leadId = generateLeadId(leadData);
    leadData.leadId = leadId;
    
    // Check if we already sent confirmation email for this submission
    const emailKey = CONFIG.SENT_EMAIL_PREFIX + leadId;
    const alreadySent = PropertiesService.getScriptProperties().getProperty(emailKey);
    
    if (alreadySent) {
      console.log('Confirmation email already sent for lead:', leadId);
      return createSuccessResponse({ leadId, emailSent: false, reason: 'already_sent' });
    }
    
    // Save lead to sheet (if configured)
    if (CONFIG.SHEET_ID) {
      saveLead(leadData);
    }
    
    // Send confirmation email with PDF
    const emailResult = sendConfirmationEmail(leadData);
    
    // Mark email as sent
    if (emailResult.success) {
      PropertiesService.getScriptProperties().setProperty(emailKey, new Date().toISOString());
    }
    
    return createSuccessResponse({
      leadId,
      emailSent: emailResult.success,
      pdfAttached: emailResult.pdfAttached
    });
    
  } catch (error) {
    console.error('Error handling lead submission:', error);
    return createErrorResponse(error.toString());
  }
}

// ============================================================================
// PDF REQUEST HANDLER
// ============================================================================

/**
 * Handle standalone PDF generation request
 */
function handlePdfRequest(payload) {
  try {
    const email = payload.email;
    const phcData = payload.phcData;
    const leadData = payload.leadData || {};
    
    if (!email) {
      throw new Error('Email required for PDF generation');
    }
    
    // Generate PDF
    const pdfBlob = generatePdfBlob(leadData, phcData);
    
    // Send email with PDF
    GmailApp.sendEmail(email, CONFIG.EMAIL_SUBJECT, 
      'Your Policy Health Check results are attached.',
      {
        name: CONFIG.EMAIL_FROM_NAME,
        replyTo: CONFIG.EMAIL_REPLY_TO,
        htmlBody: '<p>Your Policy Health Check results are attached.</p>',
        attachments: [pdfBlob]
      }
    );
    
    return createSuccessResponse({ pdfSent: true });
    
  } catch (error) {
    console.error('Error handling PDF request:', error);
    return createErrorResponse(error.toString());
  }
}

// ============================================================================
// EMAIL FUNCTIONS
// ============================================================================

/**
 * Send confirmation email with PDF attachment
 */
function sendConfirmationEmail(leadData) {
  try {
    const email = leadData.email;
    if (!email) {
      console.warn('No email address provided in lead data');
      return { success: false, reason: 'no_email' };
    }
    
    // Generate email content
    const htmlBody = generateEmailHtml(leadData);
    const plainBody = generateEmailPlainText(leadData);
    
    // Generate PDF
    let pdfBlob = null;
    let pdfAttached = false;
    
    try {
      pdfBlob = generatePdfBlob(leadData, leadData.phcData);
      pdfAttached = true;
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue without PDF attachment
    }
    
    // Send email
    const emailOptions = {
      name: CONFIG.EMAIL_FROM_NAME,
      replyTo: CONFIG.EMAIL_REPLY_TO,
      htmlBody: htmlBody
    };
    
    if (pdfBlob) {
      emailOptions.attachments = [pdfBlob];
    }
    
    GmailApp.sendEmail(
      email,
      CONFIG.EMAIL_SUBJECT,
      plainBody,
      emailOptions
    );
    
    console.log('Confirmation email sent to:', email);
    
    return { success: true, pdfAttached };
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Generate HTML email body
 */
function generateEmailHtml(leadData) {
  const firstName = leadData.firstName || leadData.firstname || '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
  
  // Get PHC summary
  let phcSummary = '';
  if (leadData.phcData && leadData.phcData.label) {
    const label = leadData.phcData.label;
    let meaning = '';
    
    if (label === 'green' || label === 'Green') {
      meaning = 'Your coverage looks well-aligned with your current situation.';
    } else if (label === 'yellow' || label === 'Yellow') {
      meaning = 'There may be opportunities to optimize your coverage.';
    } else if (label === 'red' || label === 'Red') {
      meaning = 'We found some gaps that may need attention.';
    }
    
    if (meaning) {
      phcSummary = `
        <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 12px 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #0066cc;">Your Policy Health Check: ${label.toUpperCase()}</p>
          <p style="margin: 8px 0 0 0; color: #495057;">${meaning}</p>
        </div>
      `;
    }
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background-color: #0066cc; color: white; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">SecureChoice Insurance</h1>
  </div>
  
  <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; margin-top: 0;">${greeting},</p>
    
    <p style="font-size: 16px;">Thanks for checking your options with SecureChoice.</p>
    
    <p style="font-size: 16px;">We received your request and an agent will contact you shortly to discuss your coverage options.</p>
    
    ${phcSummary}
    
    <p style="font-size: 16px; margin-bottom: 24px;">Your detailed Policy Health Check results are attached to this email as a PDF.</p>
    
    <div style="background-color: #f8f9fa; border-radius: 4px; padding: 16px; margin: 24px 0;">
      <p style="margin: 0; font-size: 14px; color: #495057;">
        <strong>What happens next?</strong><br>
        One of our licensed insurance agents will reach out within 1-2 business days to review your results and answer any questions.
      </p>
    </div>
    
    <p style="font-size: 16px; margin-top: 24px;">— SecureChoice Insurance</p>
  </div>
  
  <div style="margin-top: 24px; padding: 16px; text-align: center; font-size: 12px; color: #6c757d; border-top: 1px solid #e0e0e0;">
    <p style="margin: 0;">
      If you prefer not to be contacted, reply to this email at 
      <a href="mailto:${CONFIG.EMAIL_REPLY_TO}" style="color: #0066cc;">${CONFIG.EMAIL_REPLY_TO}</a> 
      and tell us "Do not contact".
    </p>
  </div>
  
</body>
</html>
  `;
}

/**
 * Generate plain text email body
 */
function generateEmailPlainText(leadData) {
  const firstName = leadData.firstName || leadData.firstname || '';
  const greeting = firstName ? `Hi ${firstName}` : 'Hi there';
  
  let phcSummary = '';
  if (leadData.phcData && leadData.phcData.label) {
    const label = leadData.phcData.label;
    let meaning = '';
    
    if (label === 'green' || label === 'Green') {
      meaning = 'Your coverage looks well-aligned with your current situation.';
    } else if (label === 'yellow' || label === 'Yellow') {
      meaning = 'There may be opportunities to optimize your coverage.';
    } else if (label === 'red' || label === 'Red') {
      meaning = 'We found some gaps that may need attention.';
    }
    
    if (meaning) {
      phcSummary = `\n\nYour Policy Health Check: ${label.toUpperCase()}\n${meaning}\n`;
    }
  }
  
  return `${greeting},

Thanks for checking your options with SecureChoice.

We received your request and an agent will contact you shortly to discuss your coverage options.
${phcSummary}
Your detailed Policy Health Check results are attached to this email as a PDF.

What happens next?
One of our licensed insurance agents will reach out within 1-2 business days to review your results and answer any questions.

— SecureChoice Insurance

---
If you prefer not to be contacted, reply to this email at ${CONFIG.EMAIL_REPLY_TO} and tell us "Do not contact".
  `;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate PDF blob from lead data and PHC results
 */
function generatePdfBlob(leadData, phcData) {
  try {
    const htmlContent = generatePdfHtml(leadData, phcData);
    const blob = Utilities.newBlob(htmlContent, 'text/html', 'temp.html');
    
    // Convert HTML to PDF
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName('SecureChoice-Policy-Health-Check.pdf');
    
    return pdfBlob;
    
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    throw error;
  }
}

/**
 * Generate HTML content for PDF
 */
function generatePdfHtml(leadData, phcData) {
  const firstName = leadData.firstName || leadData.firstname || '';
  const lastName = leadData.lastName || leadData.lastname || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Customer';
  const timestamp = new Date().toLocaleString('en-US', { 
    timeZone: 'America/Denver',
    dateStyle: 'medium',
    timeStyle: 'short'
  });
  
  // PHC Rating
  let rating = 'N/A';
  let ratingColor = '#999999';
  let ratingText = 'Not Available';
  
  if (phcData && phcData.label) {
    rating = phcData.label.toUpperCase();
    
    if (rating === 'GREEN') {
      ratingColor = '#28a745';
      ratingText = 'Good - Your coverage appears well-aligned with your current situation.';
    } else if (rating === 'YELLOW') {
      ratingColor = '#ffc107';
      ratingText = 'Fair - There may be opportunities to optimize your coverage.';
    } else if (rating === 'RED') {
      ratingColor = '#dc3545';
      ratingText = 'Needs Attention - We found some gaps that may need immediate attention.';
    }
  }
  
  // Build answers/triggers section
  let detailsSection = '';
  if (phcData) {
    if (phcData.triggers && phcData.triggers.length > 0) {
      detailsSection += '<h3 style="color: #0066cc; margin-top: 24px;">Key Findings:</h3><ul style="line-height: 1.8;">';
      phcData.triggers.forEach(trigger => {
        detailsSection += `<li>${escapeHtml(trigger)}</li>`;
      });
      detailsSection += '</ul>';
    }
    
    if (phcData.answers) {
      detailsSection += '<h3 style="color: #0066cc; margin-top: 24px;">Your Responses:</h3><ul style="line-height: 1.8;">';
      const answers = typeof phcData.answers === 'string' ? JSON.parse(phcData.answers) : phcData.answers;
      for (const [question, answer] of Object.entries(answers)) {
        detailsSection += `<li><strong>${escapeHtml(question)}:</strong> ${escapeHtml(String(answer))}</li>`;
      }
      detailsSection += '</ul>';
    }
  }
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #0066cc;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #0066cc;
      margin-top: 30px;
    }
    h3 {
      color: #0066cc;
      margin-top: 24px;
    }
    .header-info {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 30px;
    }
    .rating-box {
      background-color: ${ratingColor};
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .rating-label {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
    }
    .cta-box {
      background-color: #e8f4ff;
      border-left: 4px solid #0066cc;
      padding: 16px;
      margin: 30px 0;
    }
    ul {
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <h1>Policy Health Check Results</h1>
  
  <div class="header-info">
    <p><strong>Customer:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Date:</strong> ${timestamp}</p>
  </div>
  
  <div class="rating-box">
    <div class="rating-label">${rating}</div>
    <div>${ratingText}</div>
  </div>
  
  ${detailsSection}
  
  <div class="cta-box">
    <h3 style="margin-top: 0;">Want help improving this?</h3>
    <p style="margin-bottom: 0;">An agent can review options with you. We'll be in touch within 1-2 business days.</p>
  </div>
  
  <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;">
  
  <p style="font-size: 12px; color: #6c757d; text-align: center;">
    © ${new Date().getFullYear()} SecureChoice Insurance<br>
    For questions, contact us at ${CONFIG.EMAIL_REPLY_TO}
  </p>
</body>
</html>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// DATA EXTRACTION & STORAGE
// ============================================================================

/**
 * Extract lead data from payload
 */
function extractLeadData(payload) {
  const leadData = {
    // Basic contact info
    firstName: payload.firstName || payload.firstname || '',
    lastName: payload.lastName || payload.lastname || '',
    email: payload.email || '',
    phone: payload.phone || '',
    zip: payload.zip || '',
    
    // Metadata
    pageUrl: payload.pageUrl || '',
    userAgent: payload.userAgent || '',
    createdAt: payload.createdAt || new Date().toISOString(),
    
    // PHC data
    phcData: null
  };
  
  // Extract PHC data if available
  if (payload.policyHealthScore || payload.policyHealthLabel) {
    leadData.phcData = {
      score: payload.policyHealthScore,
      label: payload.policyHealthLabel,
      triggers: payload.policyHealthTriggers ? payload.policyHealthTriggers.split('; ') : [],
      answers: payload.policyHealthAnswers
    };
  }
  
  return leadData;
}

/**
 * Generate unique lead ID
 */
function generateLeadId(leadData) {
  const timestamp = new Date().getTime();
  const emailHash = leadData.email ? 
    Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, leadData.email)
      .map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0'))
      .join('')
      .substring(0, 8) : 
    'unknown';
  return `${timestamp}-${emailHash}`;
}

/**
 * Save lead to Google Sheet (if configured)
 */
function saveLead(leadData) {
  try {
    if (!CONFIG.SHEET_ID) {
      console.log('No Sheet ID configured, skipping sheet save');
      return;
    }
    
    const sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.SHEET_NAME);
    if (!sheet) {
      console.error('Sheet not found:', CONFIG.SHEET_NAME);
      return;
    }
    
    // Prepare row data
    const row = [
      leadData.leadId,
      leadData.createdAt,
      leadData.firstName,
      leadData.lastName,
      leadData.email,
      leadData.phone,
      leadData.zip,
      leadData.phcData ? leadData.phcData.label : '',
      leadData.phcData ? leadData.phcData.score : '',
      leadData.phcData ? leadData.phcData.triggers.join('; ') : '',
      leadData.pageUrl,
      leadData.userAgent,
      'TRUE' // confirmationEmailSent flag
    ];
    
    sheet.appendRow(row);
    console.log('Lead saved to sheet:', leadData.leadId);
    
  } catch (error) {
    console.error('Error saving lead to sheet:', error);
    // Don't throw - continue even if sheet save fails
  }
}

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Create success response
 */
function createSuccessResponse(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    ...data
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Create error response
 */
function createErrorResponse(error) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    error: error
  })).setMimeType(ContentService.MimeType.JSON);
}
