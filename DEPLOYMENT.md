# Deployment Guide

## Quick Start (5 Minutes)

### 1. Install clasp
```bash
npm install -g @google/clasp
```

### 2. Login to Google
```bash
clasp login
```
This opens a browser window. Grant the requested permissions.

### 3. Create Apps Script Project
```bash
clasp create --title "SecureChoice Backend" --type webapp
```

This generates a Script ID in `.clasp.json`.

### 4. Push Code
```bash
clasp push
```

### 5. Deploy Web App

**Option A: Via CLI (Recommended)**
```bash
clasp deploy --description "Initial production deployment"
```

**Option B: Via Web Interface**
```bash
clasp open
```
Then:
1. Click "Deploy" → "New deployment"
2. Type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Click "Deploy"
6. Copy the Web App URL

### 6. Update Frontend

Edit `index.html` line 19:
```javascript
window.GAS_WEBAPP_URL = "YOUR_WEB_APP_URL_HERE";
```

### 7. Test

1. Open `index.html` in a browser
2. Fill out the "Check My Options" form
3. Submit
4. Check your email (use your own email for testing)
5. Verify:
   - Email received
   - PHC summary present
   - PDF attached
   - Reply-To is securechoicein@gmail.com

### 8. Test Idempotency

Submit the same form twice with the same email. You should only receive ONE email.

---

## Optional: Google Sheets Integration

### Setup
1. Create a new Google Sheet
2. Add these column headers in row 1:
   ```
   Lead ID | Created At | First Name | Last Name | Email | Phone | Zip | PHC Label | PHC Score | PHC Triggers | Page URL | User Agent | Email Sent
   ```
3. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit
   ```
4. Edit `Code.gs` line 22:
   ```javascript
   SHEET_ID: 'YOUR_SHEET_ID_HERE',
   ```
5. Push and deploy again:
   ```bash
   clasp push
   clasp deploy --description "Added Sheets integration"
   ```

---

## Updating the Code

### Make Changes
Edit files locally in your IDE.

### Push Changes
```bash
clasp push
```

### Create New Deployment
```bash
clasp deploy --description "Description of changes"
```

### Or Update Existing Deployment
1. List deployments:
   ```bash
   clasp deployments
   ```
2. Note the deployment ID
3. Update it:
   ```bash
   clasp deploy --deploymentId YOUR_DEPLOYMENT_ID --description "Updated deployment"
   ```

---

## Monitoring & Debugging

### View Logs
```bash
clasp logs
```

Or in real-time:
```bash
clasp logs --watch
```

### Open Web Editor
```bash
clasp open
```
Navigate to "Executions" to see execution history.

### Check Email Quota
- Free Gmail: 500 emails/day
- Google Workspace: 1,500 emails/day
- Check quota at: Apps Script Dashboard → Quotas

---

## Security Best Practices

### 1. Script Permissions
When you first run the script, Google will ask for permissions:
- Send email on your behalf (GmailApp)
- Access Google Drive (for PDF generation)
- Manage script properties (for idempotency)

### 2. Environment Variables
For sensitive configuration, use Script Properties instead of hardcoding:

```javascript
// In Code.gs, replace:
const MY_SECRET = 'hardcoded_value';

// With:
const MY_SECRET = PropertiesService.getScriptProperties().getProperty('MY_SECRET');
```

Set via CLI:
```bash
clasp run setScriptProperty MY_SECRET "secret_value"
```

Or via Apps Script editor:
1. Project Settings → Script Properties
2. Add property

### 3. API Keys (if needed)
Never commit API keys to Git. Use Script Properties instead.

---

## Troubleshooting

### "Missing ; before statement" error
- Make sure you're using `const` and `let`, not `var` (V8 runtime required)
- Check `appsscript.json` has `"runtimeVersion": "V8"`

### "GmailApp is not defined"
- You're running in the wrong context
- Make sure you've authorized the script (run any function once in the editor)

### "Script has too many triggers"
- Delete old triggers: Resources → Current project's triggers
- Limit: 20 triggers per script

### "Exceeded maximum execution time"
- Apps Script has a 6-minute timeout for web apps
- Optimize long-running operations
- Consider batch processing

### "Daily email quota exceeded"
- Free Gmail: 500/day
- Wait 24 hours or upgrade to Google Workspace

### CORS errors in frontend
- Using `mode: 'no-cors'` is intentional
- Don't try to read response body with no-cors
- Backend returns JSON but frontend can't read it (by design)

---

## Production Checklist

- [ ] Script deployed as web app
- [ ] Web app URL updated in `index.html`
- [ ] Test email sent and received
- [ ] PDF attachment verified
- [ ] Idempotency tested (no double-sends)
- [ ] Google Sheet configured (if using)
- [ ] Script permissions granted
- [ ] Error logging enabled (Stackdriver)
- [ ] Monitoring set up (check logs periodically)
- [ ] Team members added to Google Sheet (if using)
- [ ] Frontend deployed to production server
- [ ] Domain configured (if using custom domain)

---

## Support

For issues:
1. Check Apps Script logs: `clasp logs`
2. Verify permissions in Apps Script editor
3. Test with sample data using `Tests.gs`
4. Check Gmail quota usage
5. Review error messages in browser console (frontend)
