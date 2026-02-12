# SecureChoiceInsurance.net

## Overview

SecureChoice Insurance landing page with lead capture and Policy Health Check features.

## Components

### Frontend
- `index.html` - Landing page with PHC form and lead capture modal

### Backend (Google Apps Script)
- `Code.gs` - Main backend logic for handling lead submissions and sending confirmation emails
- `appsscript.json` - GAS manifest configuration
- `.clasp.json` - Deployment configuration (requires setup)

## Features

- **Policy Health Check (PHC)**: Interactive quiz that assesses insurance coverage
- **Lead Capture**: "Check My Options" form for customer contact
- **Confirmation Emails**: Automated email with PHC results PDF attachment
- **Idempotency**: Prevents duplicate emails from being sent

## Backend Setup

### Prerequisites
1. Google account with Gmail and Google Drive access
2. Node.js and npm installed (for clasp CLI)

### Installation Steps

1. **Install clasp (Google Apps Script CLI)**
   ```bash
   npm install -g @google/clasp
   ```

2. **Login to Google Apps Script**
   ```bash
   clasp login
   ```

3. **Create a new Google Apps Script project**
   ```bash
   clasp create --title "SecureChoice Backend" --type webapp
   ```
   This will generate a scriptId in `.clasp.json`

4. **Push code to Google Apps Script**
   ```bash
   clasp push
   ```

5. **Deploy as Web App**
   ```bash
   clasp deploy --description "Production deployment"
   ```
   
   Or deploy via the Apps Script web editor:
   - Open: `clasp open`
   - Click "Deploy" > "New deployment"
   - Select type: "Web app"
   - Execute as: "Me"
   - Who has access: "Anyone"
   - Click "Deploy"
   - Copy the Web App URL

6. **Update index.html**
   - Replace `window.GAS_WEBAPP_URL` with your deployed Web App URL

### Optional Configuration

#### Google Sheets Integration
To save leads to a Google Sheet:
1. Create a new Google Sheet
2. Add column headers: `Lead ID`, `Created At`, `First Name`, `Last Name`, `Email`, `Phone`, `Zip`, `PHC Label`, `PHC Score`, `PHC Triggers`, `Page URL`, `User Agent`, `Email Sent`
3. Copy the Sheet ID from the URL
4. In `Code.gs`, set `CONFIG.SHEET_ID` to your Sheet ID

#### Drive Folder for PDFs (Optional)
To store generated PDFs in a Drive folder:
1. Create a folder in Google Drive
2. Share the folder with the account running the script
3. Copy the folder ID from the URL
4. In `Code.gs`, set `CONFIG.DRIVE_FOLDER_ID` to your folder ID

## Email Configuration

The confirmation email includes:
- Professional HTML template
- Plain text fallback
- PHC results summary
- PDF attachment with detailed results
- Reply-to: securechoicein@gmail.com
- Opt-out disclaimer

## Security Features

- **Idempotency**: Uses PropertiesService to track sent emails and prevent duplicates
- **Input validation**: Email and data validation before processing
- **HTML escaping**: Prevents XSS in PDF generation
- **Error handling**: Graceful degradation if PDF generation fails

## Testing

1. Test the form submission on the landing page
2. Check that confirmation email is received
3. Verify PDF attachment contains correct PHC results
4. Test idempotency by submitting the same email twice
5. Check Google Sheet (if configured) for lead data

## Deployment

### Frontend
Host `index.html` and image assets on any web server:
- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

### Backend
Already deployed via Google Apps Script (see setup steps above)

## Troubleshooting

### Email not sending
- Check Gmail daily sending limits (500 emails/day for free accounts)
- Verify the script has Gmail permissions
- Check Apps Script logs: `clasp logs`

### PDF not attaching
- Check Apps Script execution logs for errors
- Verify PHC data is being passed correctly from frontend
- Test with sample data

### CORS issues
- Frontend uses `mode: 'no-cors'` for compatibility
- Backend doesn't need CORS headers for no-cors requests

## Maintenance

- Monitor script execution quota in Apps Script dashboard
- Review error logs periodically
- Update email templates as needed
- Keep clasp and dependencies updated