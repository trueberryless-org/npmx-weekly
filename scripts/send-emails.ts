import { Resend } from "resend";
import { getNextSequenceNumber, fetchThisWeeksEvents } from "../src/lib/events";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOG = {
  info: (msg: string) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Environment variable ${key} is missing or empty.`);
  }
  return value;
}

async function generateEmailHtml(events: any[], sequence: number) {
  const prunedData = events
    .flatMap((report) => report.topics || [])
    .filter((topic) => topic.relevanceScore >= 9)
    .map((t) => ({ t: t.title, s: t.summary }));

  const prompt = `You are a technical editor for npmx. Create a condensed email newsletter.
  Pick the TOP 3 most impactful topics only.

  Signals: ${JSON.stringify(prunedData)}

  Return ONLY JSON:
  {
    "subject": "Quick Catch-up: npmx Weekly #${sequence}",
    "headline": "npmx Weekly #${sequence}",
    "intro": "A 2-sentence punchy intro.",
    "topics": [{ "title": "...", "summary": "..." }]
  }`;

  const response = await fetch(
    "https://models.inference.ai.azure.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MODELS_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      }),
    },
  );

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const PRIMARY_COLOR = "#5092EA";

  return {
    subject: parsed.subject,
    html: `
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
            <h1>${parsed.headline}</h1>
            <p>${parsed.intro}</p>

            ${parsed.topics
              .map(
                (t: any) => `
              <div class="topic">
                <h3>${t.title}</h3>
                <p>${t.summary}</p>
              </div>
            `,
              )
              .join("")}

            <div style="text-align: center; margin-top: 20px;">
              <a href="https://npmx-weekly.trueberryless.org/posts/${sequence}" class="btn">View Full Weekly Post</a>
            </div>
          </div>
          <div class="footer">
            <p>You're receiving the npmx weekly newsletter. Not interested?</p>
            <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" class="unsub">Unsubscribe here</a>
          </div>
        </div>
      </body>
    </html>
    `,
  };
}

async function run() {
  LOG.info("🚀 Preparing Broadcast...");

  try {
    const segmentId = getRequiredEnv("RESEND_SEGMENT_ID");
    const seq = (await getNextSequenceNumber()) - 1;
    const rawEvents = await fetchThisWeeksEvents();

    if (rawEvents.length === 0) {
      LOG.error("No events found. Aborting broadcast.");
      return;
    }

    const emailData = await generateEmailHtml(rawEvents, seq);

    const { data, error } = await resend.broadcasts.create({
      segmentId: segmentId,
      name: emailData.subject,
      from: "npmx Weekly <no-reply@trueberryless.org>",
      subject: emailData.subject,
      html: emailData.html,
      send: true,
    });

    if (error !== null) {
      throw new Error(JSON.stringify(error, null, 2));
    }
    LOG.success(`Broadcast sent! ID: ${data?.id}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    LOG.error(`Broadcast failed: ${errorMessage}`);
    process.exit(1);
  }
}

run();
