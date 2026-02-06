import { z } from "zod";

export const SourceSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
});

export const TopicSchema = z.object({
  title: z.string(),
  paragraphs: z.string(),
  sources: z.array(SourceSchema),
});

export const AuthorSchema = z.object({
  name: z.string(),
  picture: z.string().url(),
  website: z.string().url(),
});

export const PostSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date(),
});

export type Source = z.infer<typeof SourceSchema>;
export type Author = z.infer<typeof AuthorSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Post = z.infer<typeof PostSchema>;
