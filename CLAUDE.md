# blog-muhammedshah

A static, content-driven blog built with **Astro 6** and **Tailwind CSS v4**. Output is
100% static HTML/CSS/JS — no backend, no SSR, no adapter. Deploys to GitHub Pages.

## Hard constraints

- **Local installs only.** Never run `npm install -g` or install project dependencies
  globally. Everything lives in this workspace's `node_modules`.
- **Static output only.** `output: 'static'` (Astro's default) in `astro.config.mjs`. No
  SSR adapter, no server code, no API routes that require a runtime.
- **Pin versions.** Don't float dependencies to `latest` in committed config; commit
  `package-lock.json`.
- Package manager is **npm** (not pnpm/yarn) — chosen because pnpm wasn't installed on the
  machine at scaffold time. Stick with npm unless explicitly asked to switch.
- Node must be `>= 22.12.0` (Astro 6 requirement). `.nvmrc` pins `22.12.0`.

## Domain / deployment

- Final domain: **`blog.muhammedshah.com`** (a subdomain, not the apex domain). This is
  already set as `site` in `astro.config.mjs` and as the sole line in `public/CNAME`.
- DNS uses a single **CNAME** record (`blog` → `<github-username>.github.io`), not the
  four-A-record apex setup.
- `.github/workflows/deploy.yml` builds with `withastro/action@v6` and deploys via
  `actions/deploy-pages@v4`. **The `push: branches: [main]` trigger is currently commented
  out** — only `workflow_dispatch` (manual trigger from the Actions tab) is active, so
  pushing to `main` does NOT auto-deploy yet. Uncomment those two lines when ready to go
  live with auto-deploy on every push to main.

### Still to be done by the user (not yet done)

These are the user's actions, not something a coding agent should do automatically:

1. **GitHub repo**: already created and code is being pushed there. Pages source still
   needs to be set to **GitHub Actions** in Settings → Pages → Build and deployment.
2. **Custom domain in GitHub Pages**: Settings → Pages → Custom domain → enter
   `blog.muhammedshah.com` → Save, then enable "Enforce HTTPS" once the cert provisions.
3. **DNS at the registrar**: add the CNAME record described above. Not done as of the
   last check-in.
4. **Re-enable the push-trigger** in `deploy.yml` (uncomment the two lines) once happy
   with local development and ready to go live with auto-deploy.

## Architecture

```
src/
├── assets/hero/            # 5 layered placeholder images for the parallax hero
│                            # (see assets/hero/README.md — swap files in place, no code change needed)
├── components/              # Header, Footer, ThemeToggle, HeroParallax, PostCard,
│                            # PostMeta, Pagination, OtherArticles
├── content/posts/<slug>/    # one folder per post: index.md + thumbnail image
├── content.config.ts        # Content Layer API schema (glob loader, zod schema)
├── layouts/                 # BaseLayout.astro, PostLayout.astro
├── pages/
│   ├── index.astro          # home: hero + featured + recent posts
│   ├── posts/[...page].astro  # paginated posts index (6/page)
│   ├── posts/[...slug].astro  # individual article
│   ├── rss.xml.js
│   └── 404.astro
└── styles/global.css        # Tailwind v4 import, @theme tokens, dark mode via .dark class
```

### Adding a post

Create `src/content/posts/<slug>/index.md` + a co-located thumbnail image. No other code
changes needed — it shows up in `/posts`, RSS, sitemap, and (if `featured: true`) on the
home page. Frontmatter schema is enforced by `src/content.config.ts` (title, description,
pubDate, thumbnail, thumbnailAlt, author, tags, featured, draft).

### Hero parallax

`src/components/HeroParallax.astro` renders 5 stacked layers from `src/assets/hero/` and
animates them at different scroll speeds via GSAP ScrollTrigger. Reinitializes on
`astro:page-load` (Astro's `ClientRouter`/view-transitions). Respects
`prefers-reduced-motion` — motion is skipped entirely, scene still renders statically.

### Styling

Tailwind v4 via `@tailwindcss/vite` (NOT the deprecated `@astrojs/tailwind` integration).
Design tokens live in `@theme` block in `src/styles/global.css`; dark mode is a `.dark`
class on `<html>`, toggled by `ThemeToggle.astro` and persisted to `localStorage`. An
inline anti-flash script in `BaseLayout.astro`'s `<head>` applies the class before paint.

## Verification before declaring anything done

```bash
npx astro sync      # regenerate content collection types after schema changes
npx astro check     # type-check — must be clean
npm run build        # static build — must succeed, must stay static (no adapter)
npm run preview      # sanity-check the production build locally
```

For UI changes, also run `npm run dev` and manually check: home hero parallax (scroll +
after client-side nav), posts pagination, an article page, dark/light toggle (no flash),
and the 404 page.

## Known non-issues

- `astro check` / `astro build` print a deprecation warning about
  `markdown.remarkPlugins`/`remarkRehype` being deprecated in favor of
  `unified({...})` from `@astrojs/markdown-remark`. This is expected on Astro 6.4.x,
  still functional, and not worth migrating for this project's scope unless Astro
  removes the old API in a future major version.
