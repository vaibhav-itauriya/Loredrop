import nodemailer from 'nodemailer';

let transporter: any = null;

// Initialize transporter - call this after dotenv.config()
export function initializeEmailTransport() {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' ? true : false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    },
  });

  // Log configuration on startup (without showing password)
  console.log('✓ Email configuration:', {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    configured: !!(process.env.SMTP_USER || process.env.EMAIL_USER),
  });
}

export async function sendVerificationEmail(email: string, code: string): Promise<boolean> {
  const startTime = Date.now();
  
  try {
    if (!transporter) {
      console.error('❌ Email transporter not initialized');
      console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
      return false;
    }

    // Verify transporter connection
    console.log(`📧 Attempting to send verification code to ${email}...`);
    
    let verified = false;
    try {
      verified = await transporter.verify();
    } catch (verifyErr: any) {
      console.error('❌ Email transporter verification error:', verifyErr.message);
      console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
      return false;
    }

    if (!verified) {
      console.error('❌ Email transporter verification failed - SMTP credentials may be incorrect');
      console.error('   Check: SMTP_USER and SMTP_PASSWORD in .env file');
      console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
      return false;
    }

    console.log('✓ Email transporter verified, sending email...');

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@loredrop.com',
      to: email,
      subject: 'LoredROP Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0;">Email Verification</h2>
            <p style="color: #666; font-size: 16px;">
              Your LoredROP verification code is:
            </p>
            <div style="background-color: #fff; border: 2px solid #007bff; border-radius: 6px; padding: 15px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #007bff;">
                ${code}
              </span>
            </div>
            <p style="color: #666; font-size: 14px;">
              This code will expire in 15 minutes.
            </p>
            <p style="color: #666; font-size: 14px;">
              If you didn't request this code, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              LoredROP - Campus Event Platform
            </p>
          </div>
        </div>
      `,
      text: `Your LoredROP verification code is: ${code}\n\nThis code will expire in 15 minutes.`,
    };

    let info;
    try {
      info = await transporter.sendMail(mailOptions);
      const elapsed = Date.now() - startTime;
      console.log(`✅ Verification email successfully sent to ${email}`);
      console.log(`   Response: ${info.response}`);
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`   ⏱️  Delivery time: ${elapsed}ms`);
      return true;
    } catch (sendErr: any) {
      const elapsed = Date.now() - startTime;
      console.error(`❌ Error sending email via SMTP (${elapsed}ms):`, sendErr.message);
      console.error('   Code:', sendErr.code);
      
      // Check for common Gmail issues
      if (sendErr.message?.includes('Invalid login')) {
        console.error('   ⚠️  Gmail rejected your credentials. Check SMTP_PASSWORD in .env');
        console.error('   Make sure you generated an App Password, not your regular password');
      }
      if (sendErr.message?.includes('535')) {
        console.error('   ⚠️  Gmail authentication failed (error 535)');
        console.error('   Solution: Use App Password instead of regular password');
      }
      
      console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
      return false;
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ Unexpected error in sendVerificationEmail (${elapsed}ms):`, error.message || error);
    // In development, log the code to console as fallback
    console.log(`[DEV MODE FALLBACK] Verification code for ${email}: ${code}`);
    return false;
  }
}
