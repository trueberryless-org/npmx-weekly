import { z } from "zod";

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

export type Author = z.infer<typeof AuthorSchema>;
export type Post = z.infer<typeof PostSchema>;
