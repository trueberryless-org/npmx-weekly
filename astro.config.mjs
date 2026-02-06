// @ts-check
import { defineConfig } from "astro/config";
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
  // image: {
  //   domains: ["opengraph.githubassets.com"],
  // },
  // adapter: netlify(),
});
