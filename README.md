# Informatie — homepage

Vite + TypeScript (no framework). Runtime dependencies: `gsap` (ScrollTrigger, SplitText, DrawSVG), `three` (lazy-loaded) and `lenis` (lazy scroll).
Visual identity, motion and copy follow **Informatie Brand Book v1.0**.

```
index.html              page content (all copy lives here; works without JS)
404.html                not-found page
public/                 favicon + logo-pack SVGs (brand/)
src/main.ts             entry: UI, motion (gsap.matchMedia), lazy 3D scenes
src/styles/tokens.css   brand tokens — colour, type, easing, durations
src/styles/site.css     layout and components
src/motion/             hero formation, scroll choreography, brand easing, magnetic CTA
src/ui/                 stages, accordions, preferences, explorer list, subscribe
src/three/              core stage (render-on-demand), labels, and the three scenes:
                        frame.ts (Object B), field.ts (Object A), explorer.ts (Object C)
src/state.ts            tiny signals connecting scroll/UI to the scenes
```

## Run

```bash
npm install
npm run dev        # local dev server
npm run build      # type check + production build → dist/
npm run preview    # serve dist/
```

## Deploy (Vercel)

Everything is configured in `vercel.json` and `package.json` — no dashboard settings needed:

| Setting | Value |
|---|---|
| Framework | Vite |
| Build command | `npm run build` (type check + Vite build) |
| Output directory | `dist` |
| Node.js | 22.x (`engines` in `package.json`; Vite 8 needs ≥ 20.19 / 22.12) |
| URLs | clean (no `.html`), no trailing slash; `dist/404.html` serves as the 404 page |
| Caching | hashed `/assets/*` cached for a year (immutable); brand files and favicon for an hour |
| Headers | `nosniff`, `SAMEORIGIN` framing, strict referrer, camera/mic/geolocation disabled |

**Git (recommended):** push to GitHub, then on vercel.com → Add New → Project → import the repo
and deploy. Leave the build settings as detected — `vercel.json` overrides them. Every push to
`main` deploys to production; other branches get preview URLs.

**CLI:**
```bash
vercel          # first run links the folder to a project, then makes a preview deploy
vercel --prod   # production deploy
```

## Motion and 3D principles

- "Motion explains. It never performs." Easing `cubic-bezier(.2, 0, 0, 1)` everywhere.
- Hero formation: 1.75 s, once; focus or arriving mid-page completes it instantly.
- Only the How-it-works section is pinned. Headline wipes and line drawings are scroll-linked.
- 3D renders only when visible and only when something changes. three.js is fetched when
  a scene nears the viewport. No WebGL, Save-Data or <4 GB device memory → static SVG fallbacks.
- Desktop pointers only: lazy (inertial) scroll, the square-and-frame cursor, and the footer
  ink effect (construction-line wordmark; ink fills only inside the blot under the cursor).
  The construction lines are generated from the wordmark path (overshooting edges + extremum ticks).
- `prefers-reduced-motion`: completed states, nothing pinned, no pointer motion, native scroll.

## Before going live
- Replace `[hello@yourdomain]` in the footer with a real address.
- Replace `[DATE]` source placeholders in the trust card and evidence ledger.
- The subscribe form is front-end only — connect it to your email provider.
- Footer links for Accessibility, Privacy and Contact point to `#top` until those pages exist.
