import * as THREE from "three";

/**
 * Renders a 16x16 grid of glyphs into a canvas and wraps it as a
 * THREE texture. Index `i` lands at grid position
 * `(i % 16, floor(i / 16))`, matching the lookup in the ASCII shader:
 *
 *   vec2 characterPosition = vec2(
 *     mod(characterIndex, SIZE.x),
 *     floor(characterIndex / SIZE.y)
 *   );
 *
 * Glyphs are drawn white-on-transparent; the shader reads `.r` to
 * sample mask intensity.
 */
export function buildCharacterAtlas(characters: string, fontSize: number): THREE.Texture {
  const grid = 16;
  const cell = fontSize;
  const size = grid * cell;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable for atlas");

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.font = `${Math.round(cell * 0.85)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  for (let i = 0; i < characters.length && i < grid * grid; i++) {
    const col = i % grid;
    const row = Math.floor(i / grid);
    const x = col * cell + cell / 2;
    const y = row * cell + cell / 2;
    ctx.fillText(characters[i], x, y);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  // The shader's charUV math produces negative Y values that need
  // RepeatWrapping to cycle into the right atlas row. Default flipY
  // (true) is correct: canvas row 0 at the top maps to WebGL UV
  // y=1 at the top, which matches the shader's positive-row-down
  // expectation after the wrap.
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
