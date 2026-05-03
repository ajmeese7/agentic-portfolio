#!/usr/bin/env node
// Compress assets/avatar.source.glb -> public/avatar.glb via gltfpack.
//
// Geometry: meshopt (`-cc`). Decoded at runtime by MeshoptDecoder, wired
// into TalkingHead's GLTFLoader via patches/@met4citizen__talkinghead@1.7.0.patch.
//
// Textures are NOT compressed in this script. The npm-distributed gltfpack
// is built without BasisU/WebP support, so `-tc` and `-tw` error out. To
// shrink textures further (multi-MB savings on a textured avatar), grab a
// native build from https://github.com/zeux/meshoptimizer/releases and add
// `-tc -tj <threads>` to ARGS below; KTX2 output requires wiring KTX2Loader
// into TalkingHead too (another hunk in the same patch file).
//
// Run: pnpm compress:avatar

import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = resolve(ROOT, "assets/avatar.source.glb");
const OUTPUT = resolve(ROOT, "public/avatar.glb");
const ARGS = ["-i", INPUT, "-o", OUTPUT, "-cc"];

const before = (await stat(INPUT)).size;

await new Promise((res, rej) => {
  const p = spawn("gltfpack", ARGS, { stdio: "inherit" });
  p.on("error", rej);
  p.on("exit", (code) =>
    code === 0 ? res() : rej(new Error(`gltfpack exited with ${code}`)),
  );
});

const after = (await stat(OUTPUT)).size;
const mb = (n) => (n / 1024 / 1024).toFixed(2);
console.log(`avatar: ${mb(before)} MB -> ${mb(after)} MB (${((1 - after / before) * 100).toFixed(0)}% smaller)`);
