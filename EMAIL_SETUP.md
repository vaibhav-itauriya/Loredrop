# Email Verification Setup Guide

## Overview

The OTP verification system needs to send emails. We've configured it to use Gmail SMTP (or any SMTP service).

## How to Set Up Gmail SMTP

### Step 1: Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Enable "2-Step Verification" if not already enabled

### Step 2: Generate App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your OS)
3. Click "Generate"
4. Google will show you a 16-character password

### Step 3: Update .env File

Edit `backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=your-email@gmail.com
NODE_ENV=development
```

Replace:
- `your-email@gmail.com` with your Gmail address
- `xxxx xxxx xxxx xxxx` with the 16-character app password (remove spaces if needed)

### Step 4: Restart Backend

```bash
cd backend
pnpm run dev
```

## Testing

1. Go to `http://localhost:5173/auth/verify-email`
2. Enter a test IITK email: `test@iitk.ac.in`
3. Click "Continue with Email"
4. Check the email for the verification code

## Alternative: Using Other Email Services

### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxx
```

### Outlook/Office365
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIA...
SMTP_PASSWORD=...
```

## Development Mode Fallback

If email sending fails (no SMTP configured), the code will be logged to the backend console:

```
[DEV MODE FALLBACK] Verification code for test@iitk.ac.in: 123456
```

This allows testing without email setup during development.

## Troubleshooting

### "Authentication failed" error
- Check that your email and app password are correct
- Try removing spaces from the app password
- Ensure 2FA is enabled on your Google account

### Email not received
- Check spam/junk folder
- Verify the email address is correct
- Check backend console for error messages

### SMTP connection refused
- Ensure SMTP_HOST and SMTP_PORT are correct
- Check firewall settings (port 587 should be open)
- Try SMTP_PORT=465 with SMTP_SECURE=true

## Security Notes

- ⚠️ Never commit `.env` file to Git (it's in `.gitignore`)
- App passwords are single-use and can be revoked anytime
- In production, use environment variables, not hardcoded credentials
- Consider using a dedicated email service (SendGrid, AWS SES) for better deliverability

## Production Deployment

For production, use environment variables provided by your hosting:

```bash
export SMTP_HOST=smtp.sendgrid.net
export SMTP_USER=apikey
export SMTP_PASSWORD=your-sendgrid-api-key
```

Or configure directly in your hosting platform's environment settings (Vercel, Railway, Render, etc.)
