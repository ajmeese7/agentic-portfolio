import type { Project } from "@/lib/projects";

// Hand-curated seed list. Run `pnpm sync:projects` to refresh from GitHub
// (overwrites this file with top non-fork repos by stars; edit the script
// to change the criteria).
export const projects: Project[] = [
  {
    slug: "readme-ascii",
    title: "readme-ascii",
    blurb:
      "Turns text into ASCII-art images for GitHub READMEs. The banner above? Built with this.",
    metric: "85★",
    tags: ["JavaScript", "ASCII", "GitHub"],
    repo: "https://github.com/ajmeese7/readme-ascii",
    live: "https://readme-ascii.herokuapp.com/",
  },
  {
    slug: "termblog",
    title: "termblog",
    blurb: "Self-hosted, terminal-themed blogging platform written in Go.",
    tags: ["Go", "Self-hosted", "Blog"],
    repo: "https://github.com/ajmeese7/termblog",
    live: "https://termblog.com",
  },
  {
    slug: "reading-log",
    title: "reading-log",
    blurb: "Log articles I consume to an RSS feed via Cloudflare Workers.",
    tags: ["TypeScript", "Cloudflare", "RSS"],
    repo: "https://github.com/ajmeese7/reading-log",
  },
  {
    slug: "finance-dashboard",
    title: "finance-dashboard",
    blurb: "Track personal finance performance over time.",
    tags: ["JavaScript", "Web App"],
    repo: "https://github.com/ajmeese7/finance-dashboard",
  },
  {
    slug: "image-to-8bit",
    title: "image-to-8bit",
    blurb: "Transform images into pixelated 8-bit artwork in the browser.",
    tags: ["JavaScript", "Canvas"],
    repo: "https://github.com/ajmeese7/image-to-8bit",
    live: "https://ajmeese7.github.io/image-to-8bit/",
  },
  {
    slug: "matrix-wallpaper",
    title: "matrix-wallpaper",
    blurb: "Wallpaper Engine wallpaper with the falling-rain Matrix effect.",
    tags: ["JavaScript", "Wallpaper Engine"],
    repo: "https://github.com/ajmeese7/matrix-wallpaper",
  },
];
