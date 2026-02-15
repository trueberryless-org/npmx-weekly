import { join } from "node:path";

export const LOG = {
  info: (msg: string) => console.log(`\x1b[34m[INFO]\x1b[0m ${msg}`),
  success: (msg: string) => console.log(`\x1b[32m[SUCCESS]\x1b[0m ${msg}`),
  ai: (msg: string) => console.log(`\x1b[35m[AI]\x1b[0m ${msg}`),
  error: (msg: string) => console.error(`\x1b[31m[ERROR]\x1b[0m ${msg}`),
};

export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Environment variable ${key} is missing or empty.`);
  }
  return value;
}

export const EMAIL_DIR = join(process.cwd(), "src/content/emails");
export const POST_DIR = join(process.cwd(), "src/content/posts");

export const INFERENCE_URL =
  "https://models.inference.ai.azure.com/chat/completions";
export const INFERENCE_TIMEOUT = 90_000;
