import { Resend } from "resend";
import sanitizeHtml from "sanitize-html";
import { getNextSequenceNumber, fetchThisWeeksEvents } from "../src/lib/events";
import {
  getWeeklyDigestHtml,
  type EmailParsedData,
} from "../src/email-templates";

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

const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));

async function generateEmailHtml(
  events: any[],
  sequence: number,
  modelsToken: string,
) {
  const prunedData = events
    .flatMap((report) => report.topics || [])
    .filter((topic) => topic.relevanceScore >= 9)
    .map((t) => ({ t: t.title, s: t.summary }));

  if (prunedData.length === 0) {
    throw new Error("No high-relevance topics found for this week's digest.");
  }

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
        Authorization: `Bearer ${modelsToken}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Model API returned ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model returned no content in response.");
  }

  const rawParsed = JSON.parse(content) as EmailParsedData;

  const sanitizeOptions = {
    allowedTags: ["b", "i", "em", "strong", "a"],
    allowedAttributes: {
      a: ["href"],
    },
  };

  const parsed: EmailParsedData = {
    subject: rawParsed.subject,
    headline: sanitizeHtml(rawParsed.headline, sanitizeOptions),
    intro: sanitizeHtml(rawParsed.intro, sanitizeOptions),
    topics: rawParsed.topics.map((topic) => ({
      title: sanitizeHtml(topic.title, sanitizeOptions),
      summary: sanitizeHtml(topic.summary, sanitizeOptions),
    })),
  };

  return {
    subject: parsed.subject,
    html: getWeeklyDigestHtml(parsed, sequence),
  };
}

async function run() {
  LOG.info("🚀 Preparing Broadcast...");

  try {
    const segmentId = getRequiredEnv("RESEND_SEGMENT_ID");
    const modelsToken = getRequiredEnv("MODELS_TOKEN");

    const rawEvents = await fetchThisWeeksEvents();

    if (rawEvents.length === 0) {
      LOG.error("No events found. Aborting broadcast.");
      return;
    }

    const latestEventSeq = rawEvents[0]?.sequence;
    const seq =
      latestEventSeq ?? Math.max(1, (await getNextSequenceNumber()) - 1);

    LOG.info(`Processing Weekly Digest #${seq}`);

    const emailData = await generateEmailHtml(rawEvents, seq, modelsToken);

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
