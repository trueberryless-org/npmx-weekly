import { glob } from "astro/loaders";
import { defineCollection, reference, z } from "astro:content";

import { AuthorSchema, PostSchema } from "./lib/schema";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.mdx", base: "./src/content/posts" }),
  schema: PostSchema.extend({
    authors: z.array(reference("authors")),
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/[^_]*.json", base: "./src/content/authors" }),
  schema: AuthorSchema,
});

export const collections = { posts, authors };
