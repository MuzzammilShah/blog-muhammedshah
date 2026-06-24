// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

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

  integrations: [mdx(), sitemap()],

  // Self-hosted at build time — swap `name` here (and the matching
  // --font-* variable in src/styles/global.css) to change typefaces.
  fonts: [
    { provider: fontProviders.google(), name: 'Poppins', cssVariable: '--font-poppins' },
    { provider: fontProviders.google(), name: 'Instrument Sans', cssVariable: '--font-instrument-sans' }
  ]
});
