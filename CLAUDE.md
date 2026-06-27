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

The site is a single-page app at `/` plus one route per post — there is no separate posts
listing page or pagination.

```
src/
├── components/              # Header, Search, Footer, ThemeToggle, Hero, PostsSection,
│                            # PostCard, PostMeta, OtherArticles
├── content/posts/<slug>/    # one folder per post: index.md + thumbnail image
├── content.config.ts        # Content Layer API schema (glob loader, zod schema)
├── layouts/                 # BaseLayout.astro, PostLayout.astro
├── lib/                     # inlineCode.ts, search.ts (pure client-side search matcher)
├── pages/
│   ├── index.astro          # home: sticky Hero + inline, unpaginated PostsSection
│   ├── posts/[...slug].astro  # individual article
│   ├── rss.xml.js
│   ├── search-index.json.js   # static search index endpoint (see Search below)
│   └── 404.astro
└── styles/global.css        # Tailwind v4 import, @theme tokens, dark mode via .dark class

remark-search-text.mjs       # repo root, alongside remark-reading-time.mjs
rehype-search-ids.mjs        # repo root — see Search below
```

### Adding a post

**Whenever the user provides a new post draft (markdown + images) to add to the blog,
read and follow `new-post-instructions.md` (repo root) first** — it's the full checklist
for slug/title naming, `.md` vs `.mdx` (embedded tweets), frontmatter, thumbnail caption,
body image placement (`public/post-images/<slug>/`) and styling, code block/backtick
conventions, and verification steps. The summary below is just the shape of the result.

Create `src/content/posts/<slug>/index.md` + a co-located thumbnail image (1280x720,
16:9 — rendered via `object-cover` so it's never cropped at that ratio). No other code
changes needed — it shows up inline in the home page's "My Posts" section (newest first,
unpaginated — cards just keep stacking), RSS, and sitemap. Frontmatter schema is enforced
by `src/content.config.ts` (title, description, pubDate, thumbnail, thumbnailAlt, author,
tags, featured, draft). `featured` is currently unused by any page template.

### Home page: sticky hero + inline posts

`src/pages/index.astro` composes `<Hero />` and `<PostsSection />` inside a single
`position: relative` wrapper. `Hero.astro` is a plain centered text block
("Muhammed Shah" / "Learn. Build. Share.", no imagery) set to `position: sticky; top: 0;
height: 100dvh` — it has no JS and no scroll listeners. Because it's sticky inside that
wrapper, it stays pinned in the viewport while `PostsSection` (which sits right below it
with a higher `z-index` and an opaque background) scrolls upward and visually covers it,
producing a "next section slides over the fixed hero" effect using only CSS — no GSAP
ScrollTrigger pinning. `PostsSection.astro` queries the `posts` collection directly
(same draft-filter/sort logic previously in the old posts listing page) and renders every
post via `PostCard`, with `id="posts"` as the nav anchor target.

Nav's "Posts" and "Reach out" links are anchors (`/#posts`, `/#footer`), not page routes —
from an individual post page they navigate home first, then the browser jumps to the
matching `id` once the document loads.

### Search

Client-side, no backend, no new npm dependency. Three pieces, all build-time-generated
and wired together by a shared `search-N` id scheme:

1. **Build-time id/content pipeline** (`remark-search-text.mjs`, `rehype-search-ids.mjs`,
   repo root, registered in `astro.config.mjs`'s `markdown.remarkPlugins`/`rehypePlugins`).
   Both walk every post's headings/paragraphs *in the same document order* and assign the
   same sequential `search-1`, `search-2`, … sequence — the remark plugin (mdast stage)
   writes `{id, text}[]` to `frontmatter.searchLines`, the rehype plugin (hast stage)
   stamps the matching `id="search-N"` attribute onto the actual rendered heading/paragraph
   element. Both plugins explicitly skip paragraphs nested inside list items
   (`parent.type === 'listItem'` / `parent.tagName === 'li'`) — list item text renders
   inconsistently (tight vs. loose lists, with or without a wrapping `<p>`) between the two
   AST stages, which breaks id parity if not excluded identically on both sides. This
   parity is load-bearing: if the two plugins ever count nodes differently, a search result
   will link to the wrong line on the post page.
2. **`src/pages/search-index.json.js`** — a static JSON endpoint (mirrors `rss.xml.js`'s
   shape/pattern) emitting `{slug, title, tags, lines}[]` for every non-draft post, using
   `frontmatter.searchLines` from step 1. Prerendered at build time like any other
   `output: 'static'` page — no runtime cost, no workflow changes needed.
3. **`src/lib/search.ts`** — pure function `searchPosts(index, query)`. Simple
   case-insensitive substring match, no fuzzy/scoring library by design (kept dependency-
   free and predictable). Ranks title match > tag match > line match; a post appears at
   most once, keyed to its strongest match tier.

UI lives in `src/components/Search.astro`, rendered inside `Header.astro`'s `<nav>`. A
single `data-search-open` attribute on `#site-nav` drives the whole morph via CSS:
the magnifying-glass icon swaps to an X, nav links + `ThemeToggle` fade out and go inert
(`aria-hidden`/`tabindex="-1"`, toggled in JS), the pill's translucent background becomes
fully opaque (`bg-(--color-bg)`, `backdrop-blur-none`) and its `max-width` grows from
auto-width to a fixed search-bar width — all via CSS transitions on `#site-nav`
(`max-width`, `background-color`, `backdrop-filter`), so opening/closing reads as the nav's
*contents* changing rather than a new element appearing. The results dropdown is two
nested elements, not one: an outer non-scrolling wrapper owns `rounded-2xl` +
`overflow-hidden`, an inner plain `div` owns `overflow-y-auto` — needed because mobile
WebKit renders the scrollbar outside a rounded corner when the same element is both
scrollable and `overflow-hidden`-rounded. A `fixed inset-0` backdrop div closes search on
click but is fully transparent (no dimming) — it exists only for the click-outside-to-close
behavior, not for visual effect.

While search is open, `<html>` and `<body>` both get a `search-locked` class
(`global.css`) that sets `position: fixed` + `overflow: hidden` on `body` and `overflow:
hidden` on `html` — locking on `body` alone isn't enough because mobile browsers can route
touch-scroll through `<html>` instead, bypassing a body-only lock. `openSearch()`/
`closeSearch()` (`Search.astro`) also save/restore `window.scrollY` (via `body.style.top`)
so the page doesn't jump, and add/remove a `touchmove` listener that calls
`preventDefault()` for touches outside `#search-results-wrap` — `overflow:
hidden`/`position: fixed` alone is known to be unreliable for blocking touch-scroll on
mobile Safari/Chrome, so the listener is a required fallback, not redundant. The lock is
applied *before* `input.focus()` in `openSearch()`, since focusing on mobile opens the
keyboard and can trigger the browser's own scroll-into-view before the lock would
otherwise engage. Each result `<a>` also calls `closeSearch()` on click before navigating
— without it, the lock classes survive into the destination page (Astro's `<ClientRouter
/>` does a soft navigation) and scrolling stays broken there until search is reopened and
closed again.

Clicking a line-match result navigates to `/posts/<slug>/#search-N`. An inline script in
`PostLayout.astro` checks `location.hash` on load (`astro:page-load` + `hashchange`, the
same idempotent-init pattern `ThemeToggle.astro` uses to survive Astro's `<ClientRouter />`
SPA navigation) and applies a `.search-highlight` class (defined in `global.css`,
background-color transition) to the matched element for ~1.5s before it fades back to
normal prose styling.

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

For UI changes, also run `npm run dev` and manually check: the home page's sticky-hero
scroll effect (hero stays fixed while "My Posts" slides over it), the inline posts list
(no pagination), an article page and its "Other articles" section, nav anchor links
("Posts" / "Reach out" from both home and an article page), dark/light toggle including
footer color inversion (no flash), the 404 page, and search (open/close morph on both
desktop and mobile widths, typing matches across title/tag/body content, clicking a
body-line result jumps to and briefly highlights the right line, dropdown scroll on a
long result list has no scrollbar-outside-rounded-corner artifact on mobile).

If a markdown/rehype plugin change affects `remark-search-text.mjs` or
`rehype-search-ids.mjs`, also verify id parity hasn't drifted: after `npm run build`,
confirm `dist/search-index.json`'s `lines[].id` values for a post match the `id="search-N"`
attributes in that post's rendered `dist/posts/<slug>/index.html` exactly (same ids, same
order, same count).

## Known non-issues

- `astro check` / `astro build` print a deprecation warning about
  `markdown.remarkPlugins`/`remarkRehype` being deprecated in favor of
  `unified({...})` from `@astrojs/markdown-remark`. This is expected on Astro 6.4.x,
  still functional, and not worth migrating for this project's scope unless Astro
  removes the old API in a future major version.
