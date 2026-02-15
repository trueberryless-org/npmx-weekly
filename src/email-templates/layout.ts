export const PRIMARY_COLOR = "#5092EA";

export const getBaseLayout = (content: string, sequence?: number) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
      .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      .content { padding: 32px 24px; }
      .banner { width: 100%; height: auto; display: block; }
      .topic { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #f1f5f9; }
      .topic:last-child { border-bottom: none; }
      .footer { padding: 32px 24px; text-align: center; font-size: 12px; color: #64748b; background: #f8fafc; }
      h1 { font-size: 24px; font-weight: 800; color: ${PRIMARY_COLOR}; margin-top: 0; }
      h3 { font-size: 18px; color: ${PRIMARY_COLOR}; margin-bottom: 8px; }
      p { line-height: 1.6; font-size: 15px; margin-bottom: 16px; }
      .btn { background: ${PRIMARY_COLOR}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-top: 10px; }
      .unsub { color: ${PRIMARY_COLOR}; text-decoration: underline; }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://raw.githubusercontent.com/trueberryless-org/npmx-weekly/main/public/banner.png" alt="npmx banner" class="banner" />
      <div class="content">
        ${content}
      </div>
      ${
        sequence
          ? `
      <div class="footer">
        <p>You're receiving the npmx weekly newsletter. Not interested?</p>
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="unsub">Unsubscribe here</a>
      </div>`
          : ""
      }
    </div>
  </body>
</html>
`;
