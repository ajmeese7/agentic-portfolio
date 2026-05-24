// Renders the OG card to public/og-avatar.png via satori + sharp.
//
// Embeds assets/avatar-capture.png — produce that PNG by running
// `pnpm capture:avatar` against a live `pnpm dev` first.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import satori from "satori";
import sharp from "sharp";

import { OgAvatar } from "./og-avatar.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FONTS = path.join(ROOT, "assets", "fonts");
const PUBLIC = path.join(ROOT, "public");
const AVATAR_PATH = path.join(ROOT, "assets", "avatar-capture.png");

const WIDTH = 1200;
const HEIGHT = 630;

async function loadFonts(): Promise<satori.SatoriOptions["fonts"]> {
  const [regular, bold] = await Promise.all([
    readFile(path.join(FONTS, "GeistMono-Regular.otf")),
    readFile(path.join(FONTS, "GeistMono-Bold.otf")),
  ]);
  return [
    { name: "Geist Mono", data: regular, weight: 400, style: "normal" },
    { name: "Geist Mono", data: bold, weight: 700, style: "normal" },
  ];
}

async function loadAvatarDataUrl(): Promise<string | null> {
  try {
    const buf = await readFile(AVATAR_PATH);
    return `data:image/png;base64,${buf.toString("base64")}`;
  } catch {
    console.warn(`! ${path.relative(ROOT, AVATAR_PATH)} not found — placeholder will render in its place.`);
    console.warn("  run `pnpm capture:avatar` against a live `pnpm dev` to generate it.");
    return null;
  }
}

async function main(): Promise<void> {
  const [fonts, avatarDataUrl] = await Promise.all([loadFonts(), loadAvatarDataUrl()]);

  const svg = await satori(OgAvatar({ avatarDataUrl }), { width: WIDTH, height: HEIGHT, fonts });
  const pngPath = path.join(PUBLIC, "og-avatar.png");
  await sharp(Buffer.from(svg)).png().toFile(pngPath);
  console.log(`wrote ${path.relative(ROOT, pngPath)}`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
