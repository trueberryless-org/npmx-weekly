import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sanitizeHtml from "sanitize-html";
import { getNextSequenceNumber, fetchThisWeeksEvents } from "../src/lib/events";
import type { EmailParsedData } from "../src/email-templates";
import {
  LOG,
  getRequiredEnv,
  EMAIL_DIR,
  INFERENCE_URL,
  INFERENCE_TIMEOUT,
} from "./utils";

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

  const response = await fetch(INFERENCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${modelsToken}`,
    },
    signal: AbortSignal.timeout(INFERENCE_TIMEOUT),
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
    }),
  });

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
      process.exit(1);
    }

    const sortedEvents = [...rawEvents]
      .filter((e) => typeof e.sequence === "number")
      .sort((a, b) => b.sequence - a.sequence);

    const latestEventSeq = sortedEvents[0]?.sequence;
    const nextSeq = await getNextSequenceNumber();
    const seq = latestEventSeq ?? Math.max(1, nextSeq - 1);

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

    await mkdir(EMAIL_DIR, { recursive: true });

    const filePath = join(EMAIL_DIR, `${seq}.json`);
    await writeFile(filePath, JSON.stringify(payload, null, 2));

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
