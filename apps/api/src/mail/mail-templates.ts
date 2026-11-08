export function getLoginOtpEmailHtml(otp: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0D5C5A; padding: 28px 32px; text-align: left;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                Kolkata Pharmacy
              </div>
              <div style="font-size: 13px; color: #CCFBF1; margin-top: 4px;">
                Verified Prescription & Healthcare Care
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0;">
                Your Login Verification Code
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
                Enter the following 6-digit verification code to sign in to your Kolkata Pharmacy account.
              </p>
              
              <!-- OTP Box -->
              <div style="background-color: #F0FDFA; border: 1px dashed #14B8A6; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: monospace, Courier, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0D5C5A;">
                  ${otp}
                </div>
              </div>

              <p style="font-size: 13px; color: #64748B; margin: 0 0 16px 0; line-height: 1.5;">
                ⏱ <strong>This code is valid for 5 minutes.</strong> For your security, do not share this code with anyone.
              </p>

              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

              <p style="font-size: 12px; color: #94A3B8; margin: 0; line-height: 1.5;">
                If you did not request this login code, you can safely ignore this email. Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                © ${new Date().getFullYear()} Kolkata Pharmacy Network. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getWelcomeEmailHtml(fullName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Kolkata Pharmacy</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0D5C5A; padding: 28px 32px; text-align: left;">
              <div style="font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: -0.5px;">
                Kolkata Pharmacy
              </div>
              <div style="font-size: 13px; color: #CCFBF1; margin-top: 4px;">
                Verified Prescription & Healthcare Care
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #0F172A; margin: 0 0 12px 0;">
                Welcome, ${fullName}!
              </h1>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
                Your account is now ready. You can easily upload doctor prescriptions, receive verified quotations from licensed pharmacists, and have your medications fulfilled reliably across Kolkata.
              </p>
              
              <div style="background-color: #F0FDFA; border-left: 4px solid #14B8A6; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <p style="font-size: 13px; color: #0D5C5A; margin: 0; font-weight: 600;">
                  ✔ Instant Prescription Review & AI Assistance<br/>
                  ✔ Verified Pharmacist Price Quotations<br/>
                  ✔ Doorstep Delivery & Chronic Refill Reminders
                </p>
              </div>

              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

              <p style="font-size: 12px; color: #94A3B8; margin: 0; line-height: 1.5;">
                Need help? Contact our clinical desk or visit our support center at any time.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; text-align: center;">
              <p style="font-size: 12px; color: #94A3B8; margin: 0;">
                © ${new Date().getFullYear()} Kolkata Pharmacy Network. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
