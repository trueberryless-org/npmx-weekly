import { Resend } from "resend";
import fs from "fs";
import path from "node:path";
import {
  getWeeklyDigestHtml,
  type EmailParsedData,
} from "../src/email-templates";
import { getRequiredEnv, EMAIL_DIR } from "./utils";

const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
const segmentId = getRequiredEnv("RESEND_SEGMENT_ID");

async function send() {
  const files = fs
    .readdirSync(EMAIL_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => parseInt(a) - parseInt(b));

  if (files.length === 0) {
    throw new Error("No email JSON files found in " + EMAIL_DIR);
  }

  const latestFile = files[files.length - 1];
  const sequence = parseInt(latestFile.replace(".json", ""), 10);

  const content = JSON.parse(
    fs.readFileSync(path.join(EMAIL_DIR, latestFile), "utf-8"),
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

send().catch((err) => {
  console.error("Failed to send email:", err);
  process.exit(1);
});
