import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import heroFont from "@fontsource-variable/newsreader/files/newsreader-latin-opsz-normal.woff2?url";
import { IVORY } from "../brand";
import { siteName, siteUrl } from "../site";
import appCss from "../styles/app.css?url";

const TITLE = siteName;
const DESCRIPTION = "Meetups, coworking, Claude Code sessions and conversations. The Claude Community in Kuala Lumpur.";
const URL = siteUrl;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      // The browser chrome matches the top of the page: the ivory header bar.
      // The site is light only, so one value covers both schemes.
      { name: "theme-color", content: IVORY },
      { name: "color-scheme", content: "light" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:site_name", content: TITLE },
      { property: "og:locale", content: "en_MY" },
      { property: "og:image", content: `${URL}/brand/og.png` },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Claude Community Kuala Lumpur, with the KL skyline" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${URL}/brand/og.png` },
    ],
    links: [
      // The hero title types out in this face; fetch it with the CSS, not after.
      { rel: "preload", href: heroFont, as: "font", type: "font/woff2", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/brand/logo/symbol-tile.svg", type: "image/svg+xml" },
      { rel: "canonical", href: URL },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="notfound">
      <h1>404</h1>
      <p>Kancil got lost.</p>
      <a className="btn btn-ink" href="/">
        Back home
      </a>
    </main>
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Lets CSS hold the hero intro until React starts it; see app.css. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
