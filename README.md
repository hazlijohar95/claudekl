# claudekl.com

Landing page for Claude Community Kuala Lumpur. TanStack Start, prerendered, served from Cloudflare Workers.

Maintained by [Hazli Johar](https://github.com/hazlijohar95), the official Claude Ambassador for Kuala Lumpur, Malaysia.

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
- Headings use Anthropic Serif Display Light from the event kit, subset into `src/fonts/` with `python3 scripts/subset-fonts.py <kit>/03\ Font\ files`. The kit has no italic, so the serif is never set italic. Body and label fonts are open-source (Space Grotesk, JetBrains Mono).

## License

The source code is released under the [MIT License](LICENSE). Contributions are welcome.

The license does not cover the Claude and Claude Community names, logos and brand artwork in `public/brand/` and `brand-src/`; see [TRADEMARKS.md](TRADEMARKS.md).
