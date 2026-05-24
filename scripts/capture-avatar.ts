// Captures the live ASCII-rendered avatar from a running dev server and
// writes a transparent PNG to assets/avatar-capture.png. Used by build-og.ts
// to embed the avatar inside the satori-rendered OG card.
//
// Requires `pnpm dev` to be running on http://localhost:3000 (override with
// CAPTURE_URL). Runs separately from build:og so the OG build itself stays
// fast and offline.

import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "assets", "avatar-capture.png");
const URL = process.env.CAPTURE_URL ?? "http://localhost:3000";

// Render at 2x the OG slot we expect to fill so downscaling stays crisp.
const VIEWPORT = { width: 1200, height: 1200 };

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();

  try {
    const res = await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 15_000 });
    if (!res || !res.ok()) {
      throw new Error(`failed to load ${URL} (status ${res?.status() ?? "unknown"}). is pnpm dev running?`);
    }

    const stage = page.locator(".ascii-stage");
    await stage.waitFor({ state: "visible", timeout: 15_000 });
    await page.locator(".ascii-stage canvas").waitFor({ state: "attached", timeout: 30_000 });
    await page.waitForFunction(() => !document.querySelector(".ascii-overlay"), null, { timeout: 30_000 });
    // Let TalkingHead settle a few frames so we capture a stable pose.
    await page.waitForTimeout(750);

    await stage.screenshot({ path: OUTPUT, omitBackground: true });
    console.log(`wrote ${path.relative(ROOT, OUTPUT)}`);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
