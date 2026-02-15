import type { APIRoute } from "astro";
import { RESEND_API_KEY, RESEND_SEGMENT_ID } from "astro:env/server";
import { Resend } from "resend";
import { getWelcomeHtml } from "../../email-templates";

export const prerender = false;

const resend = new Resend(RESEND_API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ message: "Invalid JSON body" }), {
        status: 400,
      });
    }

    const email = typeof body.email === "string" ? body.email.trim() : null;

    if (!email) {
      return new Response(JSON.stringify({ message: "Email is required" }), {
        status: 400,
      });
    }

    // https://emailregex.com/
    const emailRegex =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ message: "Invalid email format" }), {
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
      html: getWelcomeHtml(),
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
