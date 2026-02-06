import { readdir } from "node:fs/promises";
import { join } from "node:path";

const INFERENCE_URL = "https://models.inference.ai.azure.com/chat/completions";
const POST_DIR = join(process.cwd(), "src/content/posts");
const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/trueberryless-org/npmx-digest/main/src/content/posts";

const LOG = {
  info: (msg: string) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
  ai: (msg: string) => console.log(`\x1b[35m[AI]\x1b[0m ${msg}`),
};

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Environment variable ${key} is missing.`);
  return value;
}

async function requestInference(payload: object) {
  const token = getRequiredEnv("MODELS_TOKEN");
  const response = await fetch(INFERENCE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "npmx-weekly-bot",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    throw new Error(`Inference failed: ${await response.text()}`);
  return response.json();
}

export async function getNextSequenceNumber(): Promise<number> {
  try {
    const files = await readdir(POST_DIR);
    const numbers = files
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => parseInt(f.replace(".mdx", ""), 10))
      .filter((n) => !isNaN(n));

    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  } catch {
    return 1;
  }
}

export async function fetchThisWeeksEvents(): Promise<any[]> {
  const now = new Date();
  const events = [];

  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  LOG.info(
    `Fetching events from Monday ${monday.toISOString().split("T")[0]} to today.`,
  );

  for (let i = 0; i < 5; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = current.toISOString().split("T")[0];

    const types = ["daily", "midday", "nightly"];

    for (const type of types) {
      const fileName = `${dateStr}-${type}.json`;
      try {
        const res = await fetch(`${GITHUB_RAW_BASE}/${fileName}`);
        if (res.ok) {
          const data = await res.json();
          events.push(data);
          LOG.success(`Fetched: ${fileName}`);
        }
      } catch (e) {
        // Skip missing files quietly
      }
    }
  }
  return events;
}

export async function generateWeeklyContent(events: any[], sequence: number) {
  LOG.ai(`Generating Weekly #${sequence} content...`);

  const prunedData = events
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

  try {
    const data = await requestInference({
      messages: [
        { role: "system", content: "You are a JSON-only generator." },
        { role: "user", content: prompt },
      ],
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(data.choices[0].message.content);

    // Convert the JSON structure into the final MDX body
    const mdxBody = [
      `import TopicSection from "../../components/TopicSection.astro";`,
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

    return {
      description: parsed.description,
      content: mdxBody,
    };
  } catch (err: any) {
    LOG.error(`AI Refactor failed: ${err.message}`);
    throw err;
  }
}
