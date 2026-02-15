import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  getNextSequenceNumber,
  fetchThisWeeksEvents,
  generateWeeklyContent,
} from "../src/lib/events";
import { POST_DIR, LOG } from "./utils";

async function runWeekly() {
  LOG.info("Generating npmx Weekly Digest");

  try {
    const seq = await getNextSequenceNumber();
    const rawEvents = await fetchThisWeeksEvents();

    if (rawEvents.length === 0) {
      LOG.info("No events found for this week.");
      return;
    }

    LOG.ai("Generating content with AI...");
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

    LOG.success(`Created ${seq}.mdx with TopicSection components`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    LOG.error(`Failure: ${message}`);
    process.exit(1);
  }
}

runWeekly();
