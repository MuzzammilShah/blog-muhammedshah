# Instructions: Adding a New Blog Post

This file is the checklist for turning a raw draft (markdown + images dropped at the
workspace root) into a published post. Follow it whenever the user says "here's a new
post." Reference existing posts under `src/content/posts/` as the source of truth — this
file just summarizes the pattern.

## 1. Title, slug, and directory

- Make a **short, crisp title** from the draft (the draft's own `#` heading is often too
  long/literal — tighten it). If the draft hints at a dramatic or vague framing instead of
  a literal one, ask the user before settling on it (e.g. don't spoil "what happened" in
  the title if the post is written as a reveal).
- Derive the **slug** from that short title (kebab-case, no punctuation):
  `9pm-the-codebase-was-gone`, `cleaning-up-ds-store-on-macos`.
- Create `src/content/posts/<slug>/` — this is the post's directory. Every post lives in
  its own folder; there is no flat file layout.

## 2. Decide `.md` vs `.mdx`

- Default to **`.md`**.
- Use **`.mdx`** only if the post embeds something that needs raw HTML/script tags that
  plain Astro Markdown won't render as-is — in practice, **embedded tweets**. See
  `src/content/posts/agentic-ai/index.mdx` and
  `src/content/posts/model-context-protocol-hands-on/index.mdx` for the working pattern:
  ```html
  <blockquote class="twitter-tweet">
    <a href="https://twitter.com/MoShahx07/status/STATUS_ID"></a>
  </blockquote>
  <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>
  ```
  Ask the user for the tweet URL/status ID if they want one embedded but haven't supplied
  it. The `<script>` tag is what forces `.mdx` (the `@astrojs/mdx` integration is already
  registered in `astro.config.mjs`) — don't add it to a `.md` file.

## 3. Frontmatter

Schema is enforced by `src/content.config.ts` — required fields: `title`, `description`,
`pubDate`, `thumbnail`, `author` (defaults to `"Muhammed Shah"`), `tags`, `featured`,
`draft`.

```yaml
---
title: "Short Crisp Title"
description: "One-liner summary — written for humans skimming the post list, not SEO keyword stuffing."
pubDate: 2026-06-27        # today's date, unless the user specifies otherwise
thumbnail: "./thumbnail.png"
thumbnailAlt: "Short Crisp Title thumbnail"
author: "Muhammed Shah"
tags: ["MISC"]              # reuse an existing tag where it fits; only add a new one if asked
featured: false
draft: false                 # set true only if explicitly asked to stage without publishing
---
```

- `description` should be a genuinely short, one-sentence summary the user would write
  themselves — not a copy-paste of the first paragraph.
- `updatedDate` is optional; only add it later if the post is revised after publishing.

## 4. Thumbnail

- Co-located **inside the post's own directory**: `src/content/posts/<slug>/thumbnail.png`.
- Referenced **relatively** in frontmatter (`./thumbnail.png`) — this is the one image
  Astro's `image()` schema helper processes, unlike body images (see §5).
- Ideal size: **1280x720 (16:9)** — rendered via `object-cover` on the home page card, so
  it's never cropped at that ratio, but matching it avoids any awkward focal-point cropping.
- Caption block immediately after the frontmatter closing `---`, before the post body:
  ```html
  <div align="center" style="font-size: 0.7em; font-style: italic;">CAPTION TEXT HERE</div>

  <br>
  <br>
  ```
  See `src/content/posts/cleaning-up-ds-store-on-macos/index.md` lines 13-16 for the
  reference. If the thumbnail was AI-generated, the caption should say so, e.g.:
  *"Generated using Gemini Nano Banana 3 model with a custom prompt."* Ask the user what
  tool/prompt was used if they haven't said, rather than guessing.

## 5. Body images (not the thumbnail)

Body images do **not** live in the post's content directory — they go in
`public/post-images/<slug>/` and are referenced with **absolute paths**
(`/post-images/<slug>/filename.png`), not relative ones. This is the convention used by
`minecraft-in-12-hours` and `agentic-ai`.

If the draft has plain markdown images (`![alt](images/foo.png)`), convert each one (or
each adjacent group) into this div + img + caption pattern:

```html
<div align="center">
<img src="/post-images/<slug>/foo.png" alt="Descriptive alt text" width="80%" style="border: 1px solid #e0e0e0; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
</div>

<div align="center" style="font-size: 0.7em; font-style: italic;">Caption describing what the image shows.</div>
```

- Multiple images that belong together (e.g. a before/after pair) go inside the **same**
  `<div align="center">...</div>` wrapper, stacked, sharing one caption below — see
  `src/content/posts/minecraft-in-12-hours/index.md` lines 257-265 for a 5-image example.
- `width="80%"` and the border/shadow inline style are the established look — keep them
  consistent rather than inventing new styling per post.
- Write a real, specific alt text and caption per image; don't reuse a generic
  placeholder like "Post image."

## 6. Body content / formatting conventions

- Headings: `#` for the post title (one per post, right after the thumbnail caption),
  `##` for major sections, `###` for subsections. A literal `-----` line under a `##`
  heading is used in some posts as a visual divider (see `cleaning-up-ds-store-on-macos`)
  — optional stylistic flourish, not required.
- **Single backticks** for inline code, filenames, commands, flags, and config keys
  mid-sentence: `` `llama3.2:3b` ``, `` `.gitignore` ``, `` `rsync --delete` ``. Don't use
  bold for these — backticks are the convention.
- **Fenced code blocks** (triple backtick) for multi-line commands, terminal output, or
  any block meant to be copy-pasted. Use a language hint when it's genuinely code
  (`bash`, `text`); plain commands and generic output blocks can omit it.
- Blockquote (`>`) for a callout/aside, e.g. `> **Note:** ...` — see
  `cleaning-up-ds-store-on-macos` and the rsync incident post for examples.
- A styled HTML callout div (not just `>`) is also an established pattern for a more
  prominent note:
  ```html
  <div style="border-left: 4px solid var(--color-accent); background: var(--color-surface); padding: 0.75rem 1rem; border-radius: 0.5rem; margin: 1.5rem 0;">
  <strong>Important Note</strong><br/>
  Note text here.
  </div>
  ```
- Preserve the draft author's voice and structure — this is light formatting/structuring
  work, not a rewrite. Don't add headings, sections, or commentary that weren't in the
  original draft unless the user asks.

## 7. Search functionality — nothing to do manually

Search is fully automatic at build time via `remark-search-text.mjs` +
`rehype-search-ids.mjs` (registered in `astro.config.mjs`) and
`src/pages/search-index.json.js`. As long as the post is a normal heading/paragraph
structure, it is automatically indexed — **no manual step required**. Two things that
*do* matter:

- Don't nest body paragraphs inside list items if you want them individually
  searchable/linkable — both plugins explicitly skip paragraphs inside `<li>` to avoid id
  mismatches between the markdown and HTML stages.
- After running `npm run build`, you can sanity-check id parity (see verification below)
  if you made any markdown-structure changes that feel unusual — not needed for a normal
  post.

## 8. Cleanup

- Once content is copied into `src/content/posts/<slug>/` and `public/post-images/<slug>/`,
  delete the original staging files/folder from the workspace root (e.g. a `new-post/`
  folder or loose files) — they shouldn't linger after being moved.

## 9. Verification (always run before declaring the post done)

```bash
npx astro sync      # regenerate content collection types after schema changes
npx astro check     # type-check — must be clean
npm run build        # static build — must succeed, must stay static (no adapter)
npm run preview      # sanity-check the production build locally
```

Manually check in the browser: the post appears on the home page's "My Posts" list with
its thumbnail and caption, the post page itself renders all body images with the
border/shadow + caption styling, code blocks and callouts render correctly, an embedded
tweet (if any) actually loads, and search picks up the new post's title/tags/body lines
(open search, type a phrase from the post, confirm it appears and that clicking a
body-line result jumps to and highlights the right paragraph).
