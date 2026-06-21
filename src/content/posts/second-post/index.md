---
title: "Designing the Parallax Hero"
description: "A look at the layered scroll-driven hero on the home page, built with GSAP ScrollTrigger."
pubDate: 2026-06-22
thumbnail: "./thumbnail.png"
thumbnailAlt: "Teal to blue gradient with a dark horizon band"
author: "Muhammed Shah"
tags: ["design", "gsap"]
featured: false
draft: false
---

The home page hero is built from five stacked image layers — sky, far mountains, mid skyline,
near foreground, and a focal element — each moving at a different speed as you scroll.

## Why layers instead of one image

A single image can only fake depth. Real depth comes from **parallax**: background layers move
slower than foreground layers as the viewer scrolls, mimicking how distant objects appear to
move less than nearby ones.

## Respecting motion preferences

The whole effect is wrapped in a check for `prefers-reduced-motion`. If a visitor has that
setting enabled, the scene still renders — it just stays still instead of animating.

```js
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
```

Small detail, but it matters.
