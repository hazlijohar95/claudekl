# claudekl.com

Landing page for Claude Community Kuala Lumpur. TanStack Start, prerendered, served from Cloudflare Workers.

```bash
npm install
npm run dev      # http://localhost:3417
npm run deploy   # build + wrangler deploy
```

- Links, programs, mascot lines: `src/site.ts`. A channel with `href: null` shows as "Soon".
- Brand assets in `public/brand/` were generated with the Claude Community city-assets skill (`generate.py "Kuala Lumpur"`). Icons in `public/brand/icons/` are cut from the official plates.
- Sound: every effect is synthesised with `@web-kits/audio` in `src/sound.ts` (no audio files). The library loads on the first click or key press; the header toggle mutes it and is remembered. Add a tap to any link or button with `data-sound="tap"`.
- Mascots: Sang Kancil (`src/components/Kancil.tsx`) and pixel Clawd (`src/components/Clawd.tsx`).
- Logo set in `public/brand/logo/` (badge, lockup, symbol, tile). The header/footer lockup uses the official Claude spark, traced once from the ambassador kit deck into `brand-src/claude-spark.svg`. Text is outlined from the brand fonts, so no font files ship. Rebuild with:
  `python3 scripts/build-logo.py <city-community-assets>/assets/fonts`
- Site body fonts are open-source stand-ins (Newsreader, Space Grotesk, JetBrains Mono). To use the Anthropic brand fonts, swap the `@import`s and `--serif`/`--sans` in `src/styles/app.css`, if your ambassador kit licenses them for web use.
