// @ts-check
import { defineConfig, envField } from "astro/config";
import mdx from "@astrojs/mdx";
import expressiveCode from "astro-expressive-code";

import netlify from "@astrojs/netlify";

// https://astro.build/config
export default defineConfig({
  site: "https://npmx-weekly.trueberryless.org",
  integrations: [
    expressiveCode({
      themes: ["github-dark-default", "github-light-default"],
    }),
    mdx(),
  ],
  image: {
    domains: ["opengraph.githubassets.com"],
  },
  adapter: netlify(),
  env: {
    schema: {
      RESEND_API_KEY: envField.string({
        context: "server",
        access: "secret",
      }),
      RESEND_SEGMENT_ID: envField.string({
        context: "server",
        access: "secret",
      }),
    },
  },
});
