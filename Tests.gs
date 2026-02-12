/**
 * Test functions for SecureChoice Backend
 * 
 * To run tests:
 * 1. Open the Apps Script editor (clasp open)
 * 2. Copy a test function to the editor
 * 3. Select the function from the dropdown
 * 4. Click Run
 */

/**
 * Test: Basic lead submission with PHC data
 */
function testLeadSubmissionWithPHC() {
  const testPayload = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com', // Replace with your test email
    phone: '555-123-4567',
    zip: '81501',
    policyHealthScore: 75,
    policyHealthLabel: 'yellow',
    policyHealthTriggers: 'Recent home remodel; No policy review in 3+ years',
    policyHealthAnswers: JSON.stringify({
      'homeRemodel': 'yes',
      'lastReview': '3+ years',
      'bundledPolicies': 'no'
    }),
    pageUrl: 'https://securechoiceinsurance.net/test',
    userAgent: 'Test Agent',
    createdAt: new Date().toISOString()
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testPayload)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

/**
 * Test: Lead submission without PHC data
 */
function testLeadSubmissionWithoutPHC() {
  const testPayload = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'test2@example.com', // Replace with your test email
    phone: '555-987-6543',
    zip: '80302',
    pageUrl: 'https://securechoiceinsurance.net/test',
    userAgent: 'Test Agent',
    createdAt: new Date().toISOString()
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testPayload)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

/**
 * Test: PDF generation only
 */
function testPdfGeneration() {
  const testPayload = {
    mode: 'pdf_results',
    email: 'test@example.com', // Replace with your test email
    leadData: {
      firstName: 'Test',
      lastName: 'User'
    },
    phcData: {
      label: 'green',
      score: 90,
      triggers: ['Well-maintained home', 'Recent policy review'],
      answers: {
        'homeRemodel': 'no',
        'lastReview': 'within 6 months',
        'bundledPolicies': 'yes'
      }
    }
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testPayload)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('Test result:', result.getContent());
}

/**
 * Test: Idempotency check
 * Run this twice with the same email to verify no duplicate sends
 */
function testIdempotency() {
  const testEmail = 'idempotency-test@example.com';
  
  const testPayload = {
    firstName: 'Idempotency',
    lastName: 'Test',
    email: testEmail,
    phone: '555-111-2222',
    zip: '81501',
    policyHealthScore: 80,
    policyHealthLabel: 'green',
    pageUrl: 'https://securechoiceinsurance.net/test',
    createdAt: new Date().toISOString()
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testPayload)
    }
  };
  
  console.log('First submission:');
  const result1 = doPost(mockEvent);
  console.log('Result 1:', result1.getContent());
  
  console.log('\nSecond submission (should be blocked):');
  const result2 = doPost(mockEvent);
  console.log('Result 2:', result2.getContent());
}

/**
 * Test: Helper function to clear idempotency cache
 * Use this to reset between tests if needed
 */
function clearIdempotencyCache() {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties();
  
  let cleared = 0;
  for (const key in allProps) {
    if (key.startsWith(CONFIG.SENT_EMAIL_PREFIX)) {
      props.deleteProperty(key);
      cleared++;
    }
  }
  
  console.log(`Cleared ${cleared} idempotency entries`);
}

/**
 * Test: Email HTML generation
 */
function testEmailHtmlGeneration() {
  const testLeadData = {
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah@example.com',
    phcData: {
      label: 'red',
      score: 45,
      triggers: ['Major coverage gap', 'Underinsured property'],
      answers: {
        'homeValue': '$500k',
        'coverageAmount': '$250k'
      }
    }
  };
  
  const html = generateEmailHtml(testLeadData);
  console.log('Generated HTML (first 500 chars):');
  console.log(html.substring(0, 500));
  
  const plain = generateEmailPlainText(testLeadData);
  console.log('\nGenerated plain text:');
  console.log(plain);
}

/**
 * Test: PDF HTML generation
 */
function testPdfHtmlGeneration() {
  const testLeadData = {
    firstName: 'Michael',
    lastName: 'Brown'
  };
  
  const testPhcData = {
    label: 'yellow',
    score: 65,
    triggers: ['Recent life change', 'Bundling opportunity'],
    answers: {
      'recentChange': 'New baby',
      'currentPolicies': 'Auto only'
    }
  };
  
  const html = generatePdfHtml(testLeadData, testPhcData);
  console.log('Generated PDF HTML (first 800 chars):');
  console.log(html.substring(0, 800));
}

/**
 * Test: Get request (health check)
 */
function testGetRequest() {
  const result = doGet({});
  console.log('Health check result:', result.getContent());
}
