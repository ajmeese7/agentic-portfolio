import { BlendFunction, Effect } from "postprocessing";
import * as THREE from "three";
import { buildCharacterAtlas } from "./buildCharacterAtlas";

// Fragment shader. `inputBuffer` and `resolution` are auto-provided
// by postprocessing's Effect base class. Don't redeclare them.
const FRAGMENT = /* glsl */ `
uniform sampler2D uCharacters;
uniform float uCharactersCount;
uniform float uCellSize;
uniform float uInvertAmount;
uniform vec3 uColor;
uniform vec3 uBackgroundColor;
uniform float uBlend;
uniform float uReveal;
uniform vec2 uMouse;
uniform float uHoverRadius;
uniform float uTime;
uniform float uVelocity;
uniform float uTrail[300];
uniform int uTrailCount;

const vec2 SIZE = vec2(16.);

vec3 greyscale(vec3 color, float strength) {
  float g = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(color, vec3(g), strength);
}
vec3 greyscale(vec3 color) { return greyscale(color, 1.0); }

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
    outputColor = vec4(0.0);
    return;
  }

  float brightness = greyscale(pixelized.rgb).r;

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

  float greyscaled = mix(brightness, 1.0 - brightness, uInvertAmount);
  float characterIndex = floor((uCharactersCount - 1.0) * greyscaled);
  vec2 characterPosition = vec2(mod(characterIndex, SIZE.x), floor(characterIndex / SIZE.y));
  vec2 offset = vec2(characterPosition.x, -characterPosition.y) / SIZE;
  vec2 charUV = mod(uv * (cell / SIZE), 1.0 / SIZE) - vec2(0.0, 1.0 / SIZE) + offset;
  vec4 asciiCharacter = texture2D(uCharacters, charUV);

  vec3 finalColor = mix(uBackgroundColor, uColor, asciiCharacter.r);
  outputColor = vec4(finalColor, 1.0);

  if (uBlend < 1.0) {
    vec4 original = texture2D(inputBuffer, uv);
    vec3 originalGrey = greyscale(original.rgb);
    outputColor = mix(vec4(originalGrey, original.a), outputColor, uBlend);
  }
}
`;

export interface AsciiEffectOptions {
  characters?: string;
  fontSize?: number;
  cellSize?: number;
  color?: string;
  backgroundColor?: string;
  invert?: boolean;
  blend?: number;
  hoverRadius?: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export class AsciiEffect extends Effect {
  constructor(options: AsciiEffectOptions = {}) {
    const {
      characters = " .:,'-^=*+?!|0#X%WM@",
      fontSize = 54,
      cellSize = 12,
      color = "#ffffff",
      backgroundColor = "#000000",
      invert = false,
      blend = 1,
      hoverRadius = 0.10,
    } = options;

    const atlas = buildCharacterAtlas(characters, fontSize);

    const uniforms = new Map<string, THREE.Uniform<unknown>>([
      ["uCharacters", new THREE.Uniform(atlas)],
      ["uCharactersCount", new THREE.Uniform(characters.length)],
      ["uCellSize", new THREE.Uniform(cellSize)],
      ["uInvertAmount", new THREE.Uniform(invert ? 1 : 0)],
      ["uColor", new THREE.Uniform(new THREE.Color(color))],
      ["uBackgroundColor", new THREE.Uniform(new THREE.Color(backgroundColor))],
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
      blendFunction: BlendFunction.NORMAL,
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
  setBackgroundColor(c: string): void {
    (this.uniforms.get("uBackgroundColor")?.value as THREE.Color).set(c);
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
