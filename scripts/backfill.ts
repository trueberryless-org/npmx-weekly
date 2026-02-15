import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { LOG, getRequiredEnv, POST_DIR } from "./utils";

// --- Configuration ---
const MANUAL_SEQ = 1;
const START_DATE = "2026-01-22";
const END_DATE = "2026-01-25";

const INFERENCE_URL = "https://models.inference.ai.azure.com/chat/completions";
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/trueberryless-org/npmx-digest/main/src/content/posts";

async function requestInference(payload: object) {
  const token = getRequiredEnv("MODELS_TOKEN");
  const response = await fetch(INFERENCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "npmx-backfill-bot",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    throw new Error(`Inference failed: ${await response.text()}`);
  return response.json();
}

async function fetchEventsForRange(
  startStr: string,
  endStr: string,
): Promise<any[]> {
  const events = [];
  const start = new Date(startStr);
  const end = new Date(endStr);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const types = ["daily", "midday", "nightly"];

    for (const type of types) {
      const fileName = `${dateStr}-${type}.json`;
      try {
        const res = await fetch(`${GITHUB_RAW_BASE}/${fileName}`);
        if (res.ok) {
          const data = await res.json();
          events.push(data);
          LOG.info(`Fetched: ${fileName}`);
        }
      } catch (e) {
        // Missing files are expected
      }
    }
  }
  return events;
}

async function run() {
  LOG.info(
    `🚀 Backfilling Weekly #${MANUAL_SEQ} (${START_DATE} to ${END_DATE})`,
  );

  try {
    const rawEvents = await fetchEventsForRange(START_DATE, END_DATE);
    if (rawEvents.length === 0) return LOG.error("No events found.");

    const prunedData = rawEvents
      .flatMap((report) => report.topics || [])
      .filter((topic) => topic.relevanceScore >= 9)
      .map((t) => ({
        t: t.title,
        s: t.summary,
        u: t.sources.slice(0, 3).map((src: any) => ({
          p: src.platform,
          url: src.url,
        })),
      }));

    const prompt = `You are a technical writer for npmx.
    Summarize these signals into a weekly digest. Pick a maximum of 15 most impactful topics.

    Signals: ${JSON.stringify(prunedData)}

    Return ONLY JSON:
    {
      "description": "...",
      "quote": {
        "text": "A famous inspirational quote that fits the theme of that week's topic",
        "author": "The author of the quote"
      },
      "intro": "...",
      "topics": [
        {
          "title": "...",
          "paragraphs": "...",
          "sources": [{ "platform": "github" | "bluesky", "url": "string" }]
        }
      ]
    }

    Note: For platform, use strictly lowercase 'github' or 'bluesky'.`;

    LOG.ai("Generating content via AI...");
    const aiResponse = await requestInference({
      messages: [
        { role: "system", content: "You are a JSON-only generator." },
        { role: "user", content: prompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(aiResponse.choices[0].message.content);

    const mdxBody = [
      `import TopicSection from "../../components/TopicSection.astro";`,
      ``,
      `> “${parsed.quote.text}”`,
      `>`,
      `> — **${parsed.quote.author}**`,
      ``,
      `## Updates from Missing Control`,
      ``,
      parsed.intro,
      ``,
      ...parsed.topics.map((topic: any, index: number) => {
        const component = `<TopicSection\n  title="${topic.title.replace(/"/g, "&quot;")}"\n  paragraphs="${topic.paragraphs.replace(/"/g, "&quot;")}"\n  sources={${JSON.stringify(topic.sources)}}\n/>`;
        return index < parsed.topics.length - 1
          ? `${component}\n\n---\n`
          : component;
      }),
      `\n---\n`,
      `<p style="text-align: center; font-style: italic; margin-top: 5rem; color: var(--text-muted); opacity: 0.8;">`,
      `  Thanks for tuning in to this week's updates! We're so glad to have you on this journey with us.`,
      `  <br />`,
      `  Stay curious, keep building, and we'll see you right back here next week! ✨`,
      `</p>`,
      ``,
    ].join("\n");

    const fileContent = `---
title: "npmx Weekly #${MANUAL_SEQ}"
description: "${parsed.description.replace(/"/g, '\\"')}"
date: ${END_DATE}
authors:
  - trueberryless
---

${mdxBody}`;

    await mkdir(POST_DIR, { recursive: true });
    await writeFile(join(POST_DIR, `${MANUAL_SEQ}.mdx`), fileContent);

    LOG.success(`✅ Created ${MANUAL_SEQ}.mdx`);
  } catch (error: any) {
    LOG.error(`Failure: ${error.message}`);
    process.exit(1);
  }
}

run();
