import type { APIRoute } from "astro";
import { RESEND_API_KEY, RESEND_SEGMENT_ID } from "astro:env/server";
import { Resend } from "resend";

export const prerender = false;

const resend = new Resend(RESEND_API_KEY);
const PRIMARY_COLOR = "#5092EA";

const WELCOME_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; color: #1e293b; }
      .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; }
      .content { padding: 32px 24px; }
      .banner { width: 100%; height: auto; display: block; }
      h1 { font-size: 24px; font-weight: 800; color: ${PRIMARY_COLOR}; margin-top: 0; }
      p { line-height: 1.6; font-size: 15px; margin-bottom: 16px; }
      .btn { background: ${PRIMARY_COLOR}; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-top: 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://raw.githubusercontent.com/trueberryless-org/npmx-weekly/main/public/banner.png" alt="npmx banner" class="banner" />
      <div class="content">
        <h1>Welcome to npmx Weekly!</h1>
        <p>Thanks for subscribing! You're now on the list to receive the latest updates from the npmx ecosystem.</p>
        <p>Every Sunday, we'll send you a condensed digest of the most impactful signals from GitHub and Bluesky.</p>
        <p>If you ever feel like your inbox is getting too crowded, you can always unsubscribe using the link in the footer below.</p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://npmx-weekly.trueberryless.org/archive" class="btn">Explore the Archive</a>
        </div>
      </div>
    </div>
  </body>
</html>
`;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ message: "Email is required" }), {
        status: 400,
      });
    }

    // 1. Create the contact
    const contactResponse = await resend.contacts.create({
      email: email,
      unsubscribed: false,
    });

    if (
      contactResponse.error &&
      (contactResponse.error as any).statusCode !== 409
    ) {
      return new Response(
        JSON.stringify({ message: contactResponse.error.message }),
        { status: 400 },
      );
    }

    // 2. Add to segment
    const { error: segmentError } = await resend.contacts.segments.add({
      email: email,
      segmentId: RESEND_SEGMENT_ID,
    });

    if (segmentError !== null) {
      return new Response(JSON.stringify({ message: segmentError.message }), {
        status: 400,
      });
    }

    // 3. Send the Welcome Email
    const { error: sendError } = await resend.emails.send({
      from: "npmx Weekly <no-reply@trueberryless.org>",
      to: email,
      subject: "Welcome to npmx Weekly! ✨",
      html: WELCOME_HTML,
    });

    if (sendError) {
      console.error("Welcome email failed:", sendError.message);
    }

    return new Response(
      JSON.stringify({ message: "Welcome to the club! ✨" }),
      {
        status: 200,
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ message: "Internal Server Error" }), {
      status: 500,
    });
  }
};
