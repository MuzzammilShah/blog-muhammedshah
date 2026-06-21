# Hero parallax layers

These are **placeholder** art layers for the home page hero (`src/components/HeroParallax.astro`).
Each file is referenced by filename in `HeroParallax.astro` — replace the file in place and the
site picks up the new art automatically. No code changes needed.

Back-to-front order:

| File | Role | Recommended size | Format notes |
| --- | --- | --- | --- |
| `layer-01-sky.png` | Sky / backdrop gradient. Moves slowest (near-static). | 2400×1400 | Opaque background, no transparency needed. |
| `layer-02-far.png` | Distant mountains / clouds. | 2400×1400 | Transparent PNG/WebP so the sky shows through. |
| `layer-03-mid.png` | Mid-distance skyline / hills. | 2400×1400 | Transparent PNG/WebP. |
| `layer-04-near.png` | Foreground foliage / rooftops silhouette. | 2400×1400 | Transparent PNG/WebP. |
| `layer-05-focal.png` | The focal character or object — closest to viewer, moves fastest. | 2400×1400 | Transparent PNG/WebP. |

Current files are simple gradient/silhouette placeholders so the parallax effect is visible and
testable. Swap each for real anime-style art at the same filename and dimensions — slightly
oversized art (the scene renders at ~110% width) gives the parallax room to travel without
revealing edges.

Prefer `.webp` for the final art to keep page weight down; Astro's `<Image>` component will
optimize whatever format you provide.
