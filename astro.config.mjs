// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

import { remarkReadingTime } from './remark-reading-time.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.muhammedshah.com',

  vite: {
    plugins: [tailwindcss()]
  },

  markdown: {
    remarkPlugins: [remarkReadingTime]
  },

  integrations: [mdx(), sitemap()]
});
