# Informatie — homepage

Static site (HTML + CSS + vanilla JS). No build step, no dependencies.

```
index.html    page markup
styles.css    brand styles, scroll-driven animations, responsive rules
script.js     method stages, accordions, preference comparison, subscribe
favicon.svg   site icon
404.html      not-found page
vercel.json   clean URLs + security/cache headers
```

## Run locally

```bash
npx serve .          # or: python3 -m http.server 8000
```

## Deploy to Vercel

**Option A — Git (recommended)**
1. Push this folder to a GitHub repo (files at the repo root).
2. vercel.com → Add New → Project → import the repo.
3. Framework Preset: **Other**. Build Command: *empty*. Output Directory: *empty* (root). Deploy.

**Option B — CLI**
```bash
npm i -g vercel
vercel          # preview deploy
vercel --prod   # production deploy
```

## Before going live
- Replace `[hello@yourdomain]` in the footer with a real address.
- Replace `[DATE]` source placeholders in the trust card.
- The subscribe form is front-end only — connect it to your email provider (e.g. a form endpoint or API route).
- Footer links for Accessibility, Privacy and "How we use sources" point to `#top` until those pages exist.

Scroll animations use CSS scroll-driven animations (Chrome, Edge, Safari 26+). Other browsers and reduced-motion users get the fully built page without motion.
