import { join } from "node:path";
import fs from "node:fs";
import sanitizeHtml from "sanitize-html";
import { getNextSequenceNumber, fetchThisWeeksEvents } from "../src/lib/events";
import type { EmailParsedData } from "../src/email-templates";

const POST_DIR = join(process.cwd(), "src/content/emails");

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

async function generateEmailData(
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
    "subject": "npmx Weekly #${sequence}",
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

  if (
    !rawParsed.subject ||
    !rawParsed.headline ||
    !rawParsed.intro ||
    !Array.isArray(rawParsed.topics)
  ) {
    throw new Error("Model returned malformed email data: " + content);
  }

  const sanitizeOptions = {
    allowedTags: ["b", "i", "em", "strong", "a"],
    allowedAttributes: {
      a: ["href"],
    },
  };

  return {
    subject: sanitizeHtml(rawParsed.subject, sanitizeOptions),
    headline: sanitizeHtml(rawParsed.headline, sanitizeOptions),
    intro: sanitizeHtml(rawParsed.intro, sanitizeOptions),
    topics: rawParsed.topics.map((topic) => ({
      title: sanitizeHtml(topic.title, sanitizeOptions),
      summary: sanitizeHtml(topic.summary, sanitizeOptions),
    })),
  };
}

async function run() {
  LOG.info("🚀 Preparing Email Draft...");

  try {
    const modelsToken = getRequiredEnv("MODELS_TOKEN");
    const rawEvents = await fetchThisWeeksEvents();

    if (rawEvents.length === 0) {
      LOG.error("No events found. Aborting draft generation.");
      return;
    }

    const latestEventSeq = rawEvents[0]?.sequence;
    const seq =
      latestEventSeq ?? Math.max(1, (await getNextSequenceNumber()) - 1);

    if (seq <= 0) {
      throw new Error(`Invalid sequence number: ${seq}`);
    }

    LOG.info(`Processing Draft for Weekly Digest #${seq}`);

    const emailData = await generateEmailData(rawEvents, seq, modelsToken);

    const payload = {
      sequence: seq,
      ...emailData,
      generatedAt: new Date().toISOString(),
    };

    if (!fs.existsSync(POST_DIR)) {
      fs.mkdirSync(POST_DIR, { recursive: true });
    }

    const filePath = join(POST_DIR, `${seq}.json`);
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));

    LOG.success(`Draft successfully saved to: ${filePath}`);
    LOG.info("You can now review and edit this JSON in your Pull Request.");
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    LOG.error(`Draft generation failed: ${errorMessage}`);
    process.exit(1);
  }
}

run();
