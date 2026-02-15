import { Resend } from "resend";
import fs from "fs";
import path, { join } from "node:path";
import {
  getWeeklyDigestHtml,
  type EmailParsedData,
} from "../src/email-templates";

const POST_DIR = join(process.cwd(), "src/content/emails");

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === null || value === "") {
    throw new Error(`Environment variable ${key} is missing or empty.`);
  }
  return value;
}

const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
const segmentId = getRequiredEnv("RESEND_SEGMENT_ID");

async function send() {
  const files = fs
    .readdirSync(POST_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => parseInt(a) - parseInt(b));

  const latestFile = files[files.length - 1];
  const sequence = parseInt(latestFile.replace(".json", ""), 10);

  const content = JSON.parse(
    fs.readFileSync(path.join(POST_DIR, latestFile), "utf-8"),
  ) as EmailParsedData;

  const html = getWeeklyDigestHtml(content, sequence);

  const { data, error } = await resend.broadcasts.create({
    segmentId: segmentId,
    name: content.subject,
    from: "npmx Weekly <no-reply@trueberryless.org>",
    subject: content.subject,
    html: html,
    send: true,
  });

  if (error) throw error;
  console.log(`Successfully broadcasted ${latestFile} (Sequence: ${sequence})`);
}

send();
