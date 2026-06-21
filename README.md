# blog-muhammedshah

A static, content-driven blog built with **Astro 6** and **Tailwind CSS v4**, deployed to
GitHub Pages at `blog.muhammedshah.com`. No backend, no SSR — pure static HTML/CSS/JS.

## Stack

- Astro 6 (static output, no adapter)
- Tailwind CSS v4 via `@tailwindcss/vite` + `@tailwindcss/typography`
- MDX support, sitemap, RSS
- GSAP (ScrollTrigger) for the parallax hero
- Package manager: **npm** (lockfile committed as `package-lock.json`)

## Getting started

```bash
nvm use            # or any Node >= 22.12.0 — see .nvmrc
npm install
npm run dev         # http://localhost:4321
```

## Adding a post

Create a new folder under `src/content/posts/<slug>/` with an `index.md` and a thumbnail
image alongside it:

```
src/content/posts/my-new-post/
├── index.md
└── thumbnail.png   (or .webp/.jpg)
```

Frontmatter shape (validated by `src/content.config.ts`):

```md
---
title: "My New Post"
description: "One or two sentences for cards and meta tags."
pubDate: 2026-07-01
thumbnail: "./thumbnail.png"
thumbnailAlt: "Describe the image"
author: "Muhammed Shah"      # optional, defaults to "Muhammed Shah"
tags: ["tag1", "tag2"]       # optional
featured: false               # optional, shows on home page "Featured" row
draft: false                  # optional, drafts are excluded from production builds
---

Your markdown content here.
```

That's it — no other code changes needed. The post automatically appears in `/posts`,
the RSS feed, the sitemap, and (if `featured: true`) the home page.

## Swapping the hero art

The home page hero (`src/components/HeroParallax.astro`) uses 5 layered images in
`src/assets/hero/`. They're currently simple gradient/silhouette placeholders. See
`src/assets/hero/README.md` for what each layer represents and recommended dimensions —
replace each file in place (same filename) and the parallax effect picks up the new art
automatically, no code changes required.

## Verification commands

```bash
npx astro sync      # regenerate content collection types
npx astro check     # type-check
npm run build        # static build
npm run preview      # preview the production build locally
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site with
`withastro/action` and publishes it via GitHub Pages (`actions/deploy-pages`). The site is
fully static — there is no server-side component to deploy.

See the project owner's setup notes for the one-time GitHub repo / Pages / DNS steps
required before the first deploy succeeds end-to-end.
