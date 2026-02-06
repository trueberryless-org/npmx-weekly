import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection, getEntries } from "astro:content";
import sanitizeHtml from "sanitize-html";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts");
  const sortedPosts = posts.sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );

  const items = await Promise.all(
    sortedPosts.map(async (post) => {
      const authors = post.data.authors
        ? await getEntries(post.data.authors)
        : [];
      const authorNames = authors.map((a) => a.data.name).join(", ");

      return {
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.description || "",
        link: `/posts/${post.id}`,
        author: authorNames,
        content: sanitizeHtml(
          `
          ${post.data.description ? `<p><em>${post.data.description}</em></p>` : ""}
          <p>Read the full intelligence report at <a href="${new URL(`/posts/${post.id}`, context.site)}">${post.data.title}</a>.</p>
          ${authorNames ? `<p><small>Authors: ${authorNames}</small></p>` : ""}
          `,
        ),
      };
    }),
  );

  return rss({
    title: "npmx.weekly",
    description: "A weekly newsletter for the npmx ecosystem.",
    site: context.site!,
    stylesheet: "/rss/pretty-feed-v3.xsl",
    items,
    customData: `<language>en-us</language>`,
  });
}
