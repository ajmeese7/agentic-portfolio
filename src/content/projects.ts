import type { Project } from "@/lib/projects";

// Hand-curated seed list. Run `pnpm sync:projects` to refresh from GitHub
// (overwrites this file with top non-fork repos by stars; edit the script
// to change the criteria).
export const projects: Project[] = [
  {
    slug: "termblog",
    title: "termblog",
    blurb:
      "Self-hosted, terminal-themed blogging platform. Better as opt-in flavor than forcing every reader through the bit.",
    tags: ["Go", "Self-hosted", "Blog"],
    stars: 2,
    repo: "https://github.com/ajmeese7/termblog",
    live: "https://termblog.com",
  },
  {
    slug: "local-llm-work",
    title: "local LLM work",
    blurb:
      "Private for now, becoming a larger public thread: practical local model usage, tooling, and infrastructure.",
    tags: ["Python", "Local LLMs", "Tooling"],
  },
  {
    slug: "readme-ascii",
    title: "readme-ascii",
    blurb:
      "Turns text into ASCII-art images for GitHub READMEs. The banner above? Built with this.",
    tags: ["JavaScript", "ASCII", "GitHub"],
    stars: 86,
    repo: "https://github.com/ajmeese7/readme-ascii",
    live: "https://readme-ascii.herokuapp.com/",
  },
  {
    slug: "reading-log",
    title: "reading-log",
    blurb: "Log articles I consume to an RSS feed via Cloudflare Workers.",
    tags: ["TypeScript", "Cloudflare", "RSS"],
    stars: 1,
    repo: "https://github.com/ajmeese7/reading-log",
  },
  {
    slug: "finance-dashboard",
    title: "finance-dashboard",
    blurb: "Track personal finance performance over time.",
    tags: ["JavaScript", "Web App"],
    stars: 3,
    repo: "https://github.com/ajmeese7/finance-dashboard",
  },
  {
    slug: "image-to-8bit",
    title: "image-to-8bit",
    blurb: "Transform images into pixelated 8-bit artwork in the browser.",
    tags: ["JavaScript", "Canvas"],
    stars: 9,
    repo: "https://github.com/ajmeese7/image-to-8bit",
    live: "https://ajmeese7.github.io/image-to-8bit/",
  },
  {
    slug: "matrix-wallpaper",
    title: "matrix-wallpaper",
    blurb: "Wallpaper Engine wallpaper with the falling-rain Matrix effect.",
    tags: ["JavaScript", "Wallpaper Engine"],
    stars: 7,
    repo: "https://github.com/ajmeese7/matrix-wallpaper",
  },
];
