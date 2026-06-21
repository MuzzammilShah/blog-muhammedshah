---
title: "Hello World"
description: "The first post — a quick look at how this blog is built."
pubDate: 2026-06-21
thumbnail: "./thumbnail.png"
thumbnailAlt: "Abstract purple and orange gradient"
author: "Muhammed Shah"
tags: ["meta", "astro"]
featured: true
draft: false
---

Welcome to the blog. This site is built with **Astro 6** and **Tailwind CSS v4**, deployed
as a fully static site on GitHub Pages.

## Why this stack

Astro ships zero JavaScript by default and only hydrates what's needed. For a content-first
blog like this one, that means fast loads and a simple mental model: markdown in, HTML out.

## How posts work

Every post lives in its own folder under `src/content/posts/`, alongside its thumbnail image.
Adding a new post is as simple as adding a new folder with an `index.md` and a thumbnail —
no other code changes required.

```ts
const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
});
```

That's it. More posts coming soon.
