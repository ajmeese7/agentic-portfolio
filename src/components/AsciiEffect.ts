import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";
import { buildCharacterAtlas } from "./buildCharacterAtlas";

// Fragment shader. `inputBuffer` and `resolution` are auto-provided
// by postprocessing's Effect base class. Don't redeclare them.
//
// Output model: each cell emits a glyph on a fully transparent background.
// Glyph density is luminance-driven; glyph color is one of:
//   uColorMode = 0  → uColor (monochrome — high-contrast, default)
//   uColorMode = 1  → surface color from the avatar render, boosted so dark
//                     surfaces (hair, dark clothes) stay visible against the
//                     page background instead of becoming dark-on-dark
// We use BlendFunction.SET so the EffectPass writes our RGBA verbatim;
// without that, NORMAL blending would let the underlying smooth render
// bleed through partially-inked glyphs and ruin the ASCII look.
const FRAGMENT = /* glsl */ `
uniform sampler2D uCharacters;
uniform float uCharactersCount;
uniform float uCellSize;
uniform float uInvertAmount;
uniform vec3 uColor;
uniform float uColorMode;
uniform vec3 uBackgroundColor;
uniform float uBackgroundAlpha;
uniform float uBlend;
uniform float uReveal;
uniform vec2 uMouse;
uniform float uHoverRadius;
uniform float uTime;
uniform float uVelocity;
uniform float uTrail[300];
uniform int uTrailCount;

const vec2 SIZE = vec2(16.);
const float SURFACE_LUMA_FLOOR = 0.4;

float luma(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 cell = resolution / uCellSize;
  vec2 grid = 1.0 / cell;
  vec2 pixelizedUV = grid * (0.5 + floor(uv / grid));
  vec4 pixelized = texture2D(inputBuffer, pixelizedUV);

  bool isContent = pixelized.a > 0.1;
  float yPos = 1.0 - uv.y;
  if (!isContent || yPos > uReveal) {
    // Non-avatar cell: emit the configured background. If
    // uBackgroundAlpha is 0 the canvas stays see-through here and the
    // page behind shows; if 1 it paints a solid color.
    outputColor = vec4(uBackgroundColor, uBackgroundAlpha);
    return;
  }

  float brightness = luma(pixelized.rgb);

  // --- Cursor + trail scramble ---
  float scramble = 0.0;
  vec2 mouseUV = vec2(uMouse.x, 1.0 - uMouse.y);
  float aspect = resolution.x / resolution.y;
  vec2 aspectCorrectedUV = vec2(uv.x * aspect, uv.y);
  vec2 aspectCorrectedMouse = vec2(mouseUV.x * aspect, mouseUV.y);

  float dist = distance(aspectCorrectedUV, aspectCorrectedMouse);
  float effectRadius = uHoverRadius * 1.2;
  if (dist < effectRadius) {
    float falloff = smoothstep(effectRadius, 0.0, dist);
    float intensity = clamp(uVelocity * 5.0, 0.0, 1.0);
    float noise = random(pixelizedUV + uTime * 10.0);
    if (noise < intensity * falloff) {
      scramble = (random(pixelizedUV * 2.0 + uTime) - 0.5) * 2.0;
    }
  }

  for (int i = 0; i < 100; i++) {
    if (i >= uTrailCount) break;
    vec2 tPos = vec2(uTrail[i * 3], uTrail[i * 3 + 1]);
    float tInt = uTrail[i * 3 + 2];
    if (tInt < 0.01) continue;
    vec2 trailUV = vec2(tPos.x, 1.0 - tPos.y);
    vec2 aspectCorrectedTrail = vec2(trailUV.x * aspect, trailUV.y);
    float tDist = distance(aspectCorrectedUV, aspectCorrectedTrail);
    float tRadius = uHoverRadius * 0.8;
    if (tDist < tRadius) {
      float tFalloff = smoothstep(tRadius, 0.0, tDist);
      float noise = random(pixelizedUV + uTime * 20.0 + float(i));
      if (noise < tInt * tFalloff * 0.8) {
        float newScramble = (random(pixelizedUV * 3.0 + uTime + float(i)) - 0.5) * 2.0;
        if (abs(newScramble) > abs(scramble)) scramble = newScramble;
      }
    }
  }

  brightness = clamp(brightness + scramble, 0.0, 1.0);

  float density = mix(brightness, 1.0 - brightness, uInvertAmount);
  float characterIndex = floor((uCharactersCount - 1.0) * density);
  vec2 characterPosition = vec2(mod(characterIndex, SIZE.x), floor(characterIndex / SIZE.y));
  vec2 offset = vec2(characterPosition.x, -characterPosition.y) / SIZE;
  vec2 charUV = mod(uv * (cell / SIZE), 1.0 / SIZE) - vec2(0.0, 1.0 / SIZE) + offset;
  vec4 asciiCharacter = texture2D(uCharacters, charUV);

  // Colored mode: rescale surface RGB so its luma can't drop below
  // SURFACE_LUMA_FLOOR. Preserves hue (dark brown stays brown), but
  // pulls black-clothes / black-hair regions up enough to read against
  // a dark page background.
  float surfaceLuma = max(luma(pixelized.rgb), 0.001);
  vec3 boostedSurface = pixelized.rgb * (max(surfaceLuma, SURFACE_LUMA_FLOOR) / surfaceLuma);
  vec3 charColor = mix(uColor, boostedSurface, uColorMode);

  // Composite the glyph (charColor with alpha = asciiCharacter.r) over
  // the configured background. Standard alpha-over: where the glyph has
  // ink it shows charColor; where it's empty it shows the background;
  // partial-ink cells blend the two. With uBackgroundAlpha = 0 the
  // empty parts collapse to fully-transparent so HTML page bleeds
  // through; with = 1 they fill with uBackgroundColor.
  float glyphA = asciiCharacter.r;
  float finalA = glyphA + uBackgroundAlpha * (1.0 - glyphA);
  vec3 finalRGB = vec3(0.0);
  if (finalA > 0.0001) {
    finalRGB = (charColor * glyphA + uBackgroundColor * uBackgroundAlpha * (1.0 - glyphA)) / finalA;
  }
  outputColor = vec4(finalRGB, finalA);

  if (uBlend < 1.0) {
    // Mix back toward the underlying smooth render. Useful for debugging
    // the source: uBlend=0 shows the avatar straight, uBlend=1 is pure
    // ASCII. The blended pass keeps the avatar's alpha so the silhouette
    // stays a detached cutout against the page.
    vec4 original = texture2D(inputBuffer, uv);
    outputColor = mix(original, outputColor, uBlend);
  }
}
`;

export interface AsciiEffectOptions {
  characters?: string;
  fontSize?: number;
  cellSize?: number;
  invert?: boolean;
  blend?: number;
  hoverRadius?: number;
  // Glyph color used in monochrome mode. Ignored when colored=true.
  color?: string;
  // false (default) = monochrome glyphs in `color`; true = sample avatar
  // surface color (luma-floored to stay visible).
  colored?: boolean;
  // null/undefined = transparent canvas (HTML page shows through empty
  // cells). Any CSS-style color string ("#0a0a0a", "rgb(...)") fills
  // empty cells with that opaque color.
  backgroundColor?: string | null;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class AsciiEffect extends Effect {
  constructor(options: AsciiEffectOptions = {}) {
    const {
      // No leading space — the lowest density still emits a visible glyph,
      // so dark surfaces (hair, beard, dark clothes) render as a colored
      // dot instead of disappearing into a transparent cell.
      characters = ".:,'-^=*+?!|0#X%WM@",
      fontSize = 54,
      cellSize = 12,
      invert = false,
      blend = 1,
      hoverRadius = 0.1,
      color = "#ffffff",
      colored = false,
      backgroundColor = null,
    } = options;

    const atlas = buildCharacterAtlas(characters, fontSize);
    const bgColor =
      backgroundColor != null ? new THREE.Color(backgroundColor) : new THREE.Color(0x000000);
    const bgAlpha = backgroundColor != null ? 1 : 0;

    const uniforms = new Map<string, THREE.Uniform<unknown>>([
      ["uCharacters", new THREE.Uniform(atlas)],
      ["uCharactersCount", new THREE.Uniform(characters.length)],
      ["uCellSize", new THREE.Uniform(cellSize)],
      ["uInvertAmount", new THREE.Uniform(invert ? 1 : 0)],
      ["uColor", new THREE.Uniform(new THREE.Color(color))],
      ["uColorMode", new THREE.Uniform(colored ? 1 : 0)],
      ["uBackgroundColor", new THREE.Uniform(bgColor)],
      ["uBackgroundAlpha", new THREE.Uniform(bgAlpha)],
      ["uBlend", new THREE.Uniform(blend)],
      ["uReveal", new THREE.Uniform(1)],
      ["uMouse", new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
      ["uHoverRadius", new THREE.Uniform(hoverRadius)],
      ["uTime", new THREE.Uniform(0)],
      ["uVelocity", new THREE.Uniform(0)],
      ["uTrail", new THREE.Uniform(new Float32Array(300))],
      ["uTrailCount", new THREE.Uniform(0)],
    ]);

    super("ASCIIEffect", FRAGMENT, {
      blendFunction: BlendFunction.SET,
      uniforms,
    });
  }

  setMouse(x: number, y: number): void {
    (this.uniforms.get("uMouse")?.value as THREE.Vector2).set(x, y);
  }
  setVelocity(v: number): void {
    const u = this.uniforms.get("uVelocity");
    if (u) u.value = v;
  }
  setHoverRadius(r: number): void {
    const u = this.uniforms.get("uHoverRadius");
    if (u) u.value = r;
  }
  setCellSize(s: number): void {
    const u = this.uniforms.get("uCellSize");
    if (u) u.value = s;
  }
  setColor(c: string): void {
    (this.uniforms.get("uColor")?.value as THREE.Color).set(c);
  }
  setColored(on: boolean): void {
    const u = this.uniforms.get("uColorMode");
    if (u) u.value = on ? 1 : 0;
  }
  setBackgroundColor(c: string | null): void {
    const colorU = this.uniforms.get("uBackgroundColor");
    const alphaU = this.uniforms.get("uBackgroundAlpha");
    if (!colorU || !alphaU) return;
    if (c == null) {
      alphaU.value = 0;
    } else {
      (colorU.value as THREE.Color).set(c);
      alphaU.value = 1;
    }
  }
  // uReveal gates which fraction of the avatar (top-down by uv.y) renders.
  // Wired through but intentionally not animated; the original reference
  // eased it 0->1 over ~2s as an entry effect. Drive this from a tween if
  // you ever want that polish back.
  setReveal(r: number): void {
    const u = this.uniforms.get("uReveal");
    if (u) u.value = clamp01(r);
  }
  setInvertAmount(a: number): void {
    const u = this.uniforms.get("uInvertAmount");
    if (u) u.value = clamp01(a);
  }
  setBlend(b: number): void {
    const u = this.uniforms.get("uBlend");
    if (u) u.value = clamp01(b);
  }
  setTime(t: number): void {
    const u = this.uniforms.get("uTime");
    if (u) u.value = t;
  }
  setTrail(buf: Float32Array, count: number): void {
    const trail = this.uniforms.get("uTrail");
    const trailCount = this.uniforms.get("uTrailCount");
    if (trail) trail.value = buf;
    if (trailCount) trailCount.value = count;
  }
}
