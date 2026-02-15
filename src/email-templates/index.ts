import { getBaseLayout, PRIMARY_COLOR } from "./layout";

export const getWeeklyDigestHtml = (
  parsed: EmailParsedData,
  sequence: number | undefined,
) => {
  const content = `
    <h1>${parsed.headline}</h1>
    <p>${parsed.intro}</p>
    ${parsed.topics
      .map(
        (t) => `
      <div class="topic">
        <h3>${t.title}</h3>
        <p>${t.summary}</p>
      </div>
    `,
      )
      .join("")}
    ${
      sequence !== undefined
        ? `
        <div style="text-align: center; margin-top: 20px;">
          <a href="https://npmx-weekly.trueberryless.org/posts/${sequence}" class="btn">View Full Weekly Post</a>
        </div>`
        : ""
    }
  `;
  return getBaseLayout(content, sequence);
};

export const getWelcomeHtml = () => {
  const content = `
    <h1>Welcome to npmx Weekly!</h1>
    <p>Thanks for subscribing! You're now on the list to receive the latest updates from the npmx ecosystem.</p>
    <p>Every Sunday, we'll send you a condensed digest of the most impactful signals from GitHub and Bluesky.</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://npmx-weekly.trueberryless.org/archive" class="btn">Explore the Archive</a>
    </div>
  `;
  return getBaseLayout(content);
};

export interface EmailParsedData {
  subject: string;
  headline: string;
  intro: string;
  topics: {
    title: string;
    summary: string;
  }[];
}
