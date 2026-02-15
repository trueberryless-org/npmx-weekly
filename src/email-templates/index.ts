import { getBaseLayout, PRIMARY_COLOR } from "./layout";

export const getWeeklyDigestHtml = (
  parsed: EmailParsedData,
  sequence: number | undefined,
) => {
  const content = `
    <h1 style="color: #0f172a; margin-bottom: 16px;">${parsed.headline}</h1>
    <p style="line-height: 1.6; margin-bottom: 24px;">${parsed.intro}</p>
    ${parsed.topics
      .map(
        (t) => `
      <div style="margin-bottom: 24px; padding: 16px; border-left: 4px solid ${PRIMARY_COLOR}; background-color: #f1f5f9;">
        <h3 style="margin: 0 0 8px 0; color: #1e293b;">${t.title}</h3>
        <p style="margin: 0; line-height: 1.5;">${t.summary}</p>
      </div>
    `,
      )
      .join("")}
    ${
      sequence !== undefined
        ? `
        <div style="text-align: center; margin-top: 32px;">
          <a href="https://npmx-weekly.trueberryless.org/posts/${sequence}"
             style="display: inline-block; padding: 12px 24px; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
             View Full Weekly Post
          </a>
        </div>`
        : ""
    }
  `;
  return getBaseLayout(content, sequence);
};

export const getWelcomeHtml = () => {
  const content = `
    <h1 style="color: #0f172a; margin-bottom: 16px;">Welcome to npmx Weekly!</h1>
    <p style="line-height: 1.6; margin-bottom: 16px;">Thanks for subscribing! You're now on the list to receive the latest updates from the npmx ecosystem.</p>
    <p style="line-height: 1.6; margin-bottom: 24px;">Every Sunday, we'll send you a condensed digest of the most impactful signals from GitHub and Bluesky.</p>
    <div style="text-align: center; margin-top: 32px;">
      <a href="https://npmx-weekly.trueberryless.org/archive"
         style="display: inline-block; padding: 12px 24px; background-color: ${PRIMARY_COLOR}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600;">
         Explore the Archive
      </a>
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
