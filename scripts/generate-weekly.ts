import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getNextSequenceNumber,
  fetchThisWeeksEvents,
  generateWeeklyContent,
} from "../src/lib/events";

const POST_DIR = join(process.cwd(), "src/content/posts");

async function runWeekly() {
  console.log("\x1b[1m🚀 Generating npmx Weekly Digest\x1b[0m");

  try {
    const seq = await getNextSequenceNumber();
    const rawEvents = await fetchThisWeeksEvents();

    if (rawEvents.length === 0) return;

    const { description, content } = await generateWeeklyContent(
      rawEvents,
      seq,
    );

    const sunday = new Date();
    sunday.setDate(sunday.getDate() + ((7 - sunday.getDay()) % 7));
    const dateStr = sunday.toISOString().split("T")[0];

    const fileContent = `---
title: "npmx Weekly #${seq}"
description: "${description.replace(/"/g, '\\"')}"
date: ${dateStr}
authors:
  - trueberryless
---

${content}`;

    await mkdir(POST_DIR, { recursive: true });
    await writeFile(join(POST_DIR, `${seq}.mdx`), fileContent);

    console.log(
      `\x1b[32m✅ Created ${seq}.mdx with TopicSection components\x1b[0m`,
    );
  } catch (error) {
    console.error("\x1b[31mFailure:\x1b[0m", error);
    process.exit(1);
  }
}

runWeekly();
