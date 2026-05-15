type PasswordResetOtpTemplateParams = {
  otp: string;
  expiresMinutes: number;
};

export function buildPasswordResetOtpEmail({
  otp,
  expiresMinutes,
}: PasswordResetOtpTemplateParams) {
  const subject = "Your Wellspring password reset code";

  const text = [
    "You requested a password reset for your Wellspring account.",
    "",
    `Your verification code is: ${otp}`,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7f5;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e2e8e4;overflow:hidden;">
            <tr>
              <td style="background:#2d5a4a;padding:28px 32px;text-align:center;">
                <p style="margin:0;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:0.02em;">Wellspring</p>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:12px;font-style:italic;">Creator Admin Portal</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 12px;color:#1a2e26;font-size:16px;line-height:1.5;">Use this code to reset your password:</p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:bold;letter-spacing:0.35em;color:#2d5a4a;text-align:center;">${otp}</p>
                <p style="margin:0;color:#5c6b64;font-size:14px;line-height:1.6;">
                  This code expires in <strong>${expiresMinutes} minutes</strong>.
                  If you did not request a password reset, you can safely ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`.trim();

  return { subject, text, html };
}
