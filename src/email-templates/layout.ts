export const PRIMARY_COLOR = "#5092EA";

export const getBaseLayout = (content: string, sequence?: number) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b;">
    <div style="max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
      <img src="https://raw.githubusercontent.com/trueberryless-org/npmx-weekly/main/public/banner.png" alt="npmx banner" style="width: 100%; height: auto; display: block; border: 0;" />
      <div style="padding: 32px 24px;">
        ${content}
      </div>
      ${
        sequence !== undefined
          ? `
      <div style="padding: 32px 24px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 8px 0; line-height: 1.6;">You're receiving the npmx weekly newsletter. Not interested?</p>
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: ${PRIMARY_COLOR}; text-decoration: underline;">Unsubscribe here</a>
      </div>`
          : ""
      }
    </div>
  </body>
</html>
`;
