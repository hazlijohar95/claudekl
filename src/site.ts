// Everything a maintainer edits lives here. A channel with `href: null`
// renders as "soon" instead of a dead link.

export const siteName = "Claude Community Kuala Lumpur";
export const siteUrl = "https://claudekl.com";
export const coords = "3.1390°N 101.6869°E";

/** Claude FM, the official Claude channel's music stream. */
const claudeFmId = "tRsQsTMvPNg";
export const claudeFm = { videoId: claudeFmId, url: `https://www.youtube.com/watch?v=${claudeFmId}` };

/** The Claude Community events calendar on Luma (all cities). */
const lumaCalendarId = "cal-TOpA5LAFfuDeFpu";
export const luma = {
  url: "https://luma.com/claudecommunity",
  embed: `https://luma.com/embed/calendar/${lumaCalendarId}/events?lt=light`,
};

type Channel = {
  label: string;
  hint: string;
  href: string | null;
};

export const channels: readonly Channel[] = [
  { label: "Events", hint: "RSVP on Luma", href: luma.url },
  { label: "Chat", hint: "WhatsApp group", href: null },
  { label: "Instagram", hint: "Follow along", href: null },
  { label: "Email", hint: "Say hello", href: null },
];

type Program = {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  card: string;
};

export const programs: readonly Program[] = [
  {
    slug: "meetup",
    name: "Meetup",
    tagline: "Demos. Food. High-fives.",
    icon: "/brand/icons/meetup.png",
    card: "/brand/kl-meetup.webp",
  },
  {
    slug: "cowork",
    name: "Cowork",
    tagline: "Laptops open. Ship together.",
    icon: "/brand/icons/workshop.png",
    card: "/brand/kl-workshop.webp",
  },
  {
    slug: "claude-code",
    name: "Claude Code",
    tagline: "Terminal first. Hands on.",
    icon: "/brand/icons/build-day.png",
    card: "/brand/kl-build-day.webp",
  },
  {
    slug: "conversations",
    name: "Conversations",
    tagline: "Big questions. Small rooms.",
    icon: "/brand/icons/conversation.png",
    card: "/brand/kl-conversation.webp",
  },
];

type Sticker = { name: string; src: string; download: string };

const plate = (name: string): Sticker => {
  const slug = name.toLowerCase().replace(" ", "-");
  return { name, src: `/brand/kl-${slug}.webp`, download: `/brand/png/claude-community-kl-${slug}.png` };
};

export const stickers: readonly Sticker[] = ["City", "Meetup", "Workshop", "Build Day", "Conversation", "Impact Lab"].map(
  plate,
);

/** The 1080px plates also ship as 540px copies for small display sizes. */
export function plateSrcSet(src: string) {
  return `${src.replace(/\.webp$/, "-540.webp")} 540w, ${src} 1080w`;
}

export const kancilLines = [
  "Jom build!",
  "Dah push ke belum?",
  "claude --continue",
  "Teh tarik + tokens.",
  "Ship it, boss.",
  "Tak siap? Prompt lagi.",
  "Lepak sini dulu.",
] as const;

/** The Clawd who flies in from San Francisco. */
// The SF Clawd is a visitor: English, plus the two words it has picked up.
export const sfClawdLines = [
  "Jet-lagged. Still shipping.",
  "Nice cap, right?",
  "Shades stay on. Always.",
  "From SF with ✻",
  "Where's the makan?",
  "Terima kasih!",
] as const;
// The KL Clawd in the hero is the local: it talks like one.
export const klClawdLines = ["Dah makan?", "Jom pair!", "Ship it, lah!", "Tak ada bug.", "Welcome to KL!", "✻ Clauding…"] as const;

/** What the conference hall calls out when tapped. */
export const hallLines = ["Doors are open!", "Hall A, this way.", "Grab a lanyard!", "Bring a demo!"] as const;

/** What the mamak calls out when tapped. */
export const mamakLines = ["Two teas, coming up!", "Less sugar?", "Anything to eat?", "Another round?"] as const;

export const clawdLines = [
  "✻ Clauding…",
  "Hello, KL!",
  "/init?",
  "Ship it!",
  "Tak ada bug.",
  "rm -rf bugs",
  "Jom pair!",
] as const;
