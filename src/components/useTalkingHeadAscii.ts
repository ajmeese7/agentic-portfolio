"use client";

import { LipsyncEn } from "@met4citizen/talkinghead/modules/lipsync-en.mjs";
import { EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { AsciiEffect } from "./AsciiEffect";

export type CameraView = "head" | "upper" | "mid" | "full";
export type Mood = "neutral" | "happy" | "angry" | "sad" | "fear" | "disgust" | "love" | "sleep";

export interface AsciiSettings {
  view: CameraView;
  cameraDistance: number;
  cameraX: number;
  cameraY: number;
  cameraRotateY: number;
  lightAmbient: number;
  lightDirect: number;
  cellSize: number;
  hoverRadius: number;
  blend: number;
  invert: boolean;
  // Monochrome (false) renders every glyph in a single uniform color —
  // high contrast, defaults the look. Colored (true) tints each glyph
  // with the avatar surface color underneath, with a luma floor so dark
  // surfaces still read against a dark page.
  colored: boolean;
  // null = transparent canvas (HTML page bleeds through empty cells).
  // Any CSS-style color string fills empty cells with that opaque color
  // and turns the avatar into a self-contained framed component.
  backgroundColor: string | null;
  mood: Mood;
  // Developer toggle. When true, speak() runs OpenAI TTS audio through
  // TalkingHead's upstream viseme pipeline (real lipsync, all 15 visemes).
  // Without TTS_API_KEY, falls through to browser speechSynthesis with a
  // fake-jaw fallback driven off `boundary` events -- not phonetic, but
  // mouth still moves. When false, speak() is plain speechSynthesis with
  // a static mouth.
  lipsync: boolean;
}

export const DEFAULT_SETTINGS: AsciiSettings = {
  // TalkingHead's built-in "head" view (camera z=2, look-at at 4/5 avatar
  // height) is tuned for RPM4 scale and crops too tight on anything else.
  // "upper" (z=4.5, look-at=2/3) is the safe generic.
  view: "upper",
  cameraDistance: 0,
  cameraX: 0,
  cameraY: 0,
  cameraRotateY: 0,
  lightAmbient: 5.5,
  lightDirect: 100,
  cellSize: 6,
  hoverRadius: 0.1,
  blend: 0.99,
  invert: false,
  colored: false,
  backgroundColor: null,
  mood: "happy",
  lipsync: true,
};

export type Status =
  | { kind: "init" }
  | { kind: "loading"; pct: number }
  | { kind: "fallback"; text: string }
  | { kind: "ready" };

// Bone retargeting + blendshape baseline for Avaturn-sourced GLBs.
// Lifted from met4citizen/TalkingHead's siteconfig.js (Avaturn entry).
// Only relevant if the GLB you ship in /public is from Avaturn; a clean
// custom Blender export with proper Mixamo bone names and ARKit
// blendshapes won't need either of these.
const AVATURN_RETARGET = {
  Hips: { y: 0.03 },
  Spine: { y: 0.02 },
  Spine1: { y: 0.02, z: 0.01 },
  Spine2: { y: 0.02, z: 0.01 },
  Neck: { z: 0.02, y: 0.01 },
  Head: { z: 0.02 },
  LeftShoulder: { rx: -0.5 },
  RightShoulder: { rx: -0.5 },
  scaleToHipsLevel: 1.0,
};

const AVATURN_BASELINE = {
  headRotateX: -0.05,
  eyeBlinkLeft: 0.15,
  eyeBlinkRight: 0.15,
};

interface AnimAlt {
  p?: number;
  delay?: unknown;
  dt?: unknown;
  vs?: Record<string, unknown>;
}
interface AnimEntry {
  name: string;
  idle?: { vs?: Record<string, unknown> };
  speaking?: { vs?: Record<string, unknown> };
  alt?: AnimAlt[];
}
interface AnimMood {
  anims?: AnimEntry[];
}

interface SpeakAudioPayload {
  audio: AudioBuffer;
  words: string[];
  wtimes: number[];
  wdurations: number[];
}

interface MorphTargetMesh {
  morphTargetInfluences: number[];
  morphTargetDictionary: Record<string, number>;
}

// Manual override for the jawOpen morph, used by the Web Speech fallback
// path. The render hook writes `value` into the mesh just before composer
// draws so it wins against TalkingHead's animation update for that frame.
// Untouched on the real-viseme path -- TalkingHead drives morphs there.
interface JawOverride {
  mesh: MorphTargetMesh;
  jawIndex: number;
  value: number;
  active: boolean;
}

interface TalkingHeadInstance {
  armature: THREE.Group;
  animMoods: Record<string, AnimMood>;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  audioCtx: AudioContext;
  morphs: MorphTargetMesh[];
  setView: (view: CameraView, opt?: Record<string, number>) => void;
  setLighting: (opt: Record<string, unknown>) => void;
  setMood: (mood: string) => void;
  showAvatar: (
    opts: Record<string, unknown>,
    onProgress?: (e: ProgressEvent) => void,
  ) => Promise<void>;
  speakAudio: (payload: SpeakAudioPayload) => void;
}

interface TalkingHeadCtor {
  new (node: HTMLElement, options: Record<string, unknown>): TalkingHeadInstance;
  prototype: object;
}

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGL2RenderingContext &&
      (canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

async function loadFallback(): Promise<string> {
  try {
    const res = await fetch("/avatar-fallback.txt", { cache: "no-store" });
    if (!res.ok) throw new Error(`fallback ${res.status}`);
    return await res.text();
  } catch {
    return "webgl unavailable";
  }
}

// Per-mood overrides applied after TalkingHead loads its built-in anim
// library. Each block exists for a specific reason; touch carefully.
function tweakAnimations(head: TalkingHeadInstance) {
  for (const mood of Object.values(head.animMoods)) {
    if (!mood.anims) continue;
    // Drop body-level idles. We render head-crop only, so waist swings
    // ("pose") and arm gestures ("misc") are visible noise at best and
    // broken (clipped, headless arm shrugs) at worst.
    mood.anims = mood.anims.filter((a) => a.name !== "pose" && a.name !== "misc");

    // Use the idle head movement during "speaking" too. We never speak,
    // but TalkingHead can still flip into speaking mode internally; this
    // keeps the head motion consistent instead of swapping in the louder
    // speaking variants.
    const headAnim = mood.anims.find((a) => a.name === "head");
    if (headAnim?.idle?.vs && headAnim.speaking) {
      headAnim.speaking.vs = JSON.parse(JSON.stringify(headAnim.idle.vs));
    }

    // Restrict eye saccades. Default range darts wider than feels alive
    // on a static portrait; clamping keeps the eyes flicking but reads
    // as focused rather than shifty.
    const eyes = mood.anims.find((a) => a.name === "eyes");
    if (eyes?.alt) {
      for (const alt of eyes.alt) {
        if (alt.vs) {
          (alt.vs as Record<string, number[][]>).eyesRotateX = [[-0.15, 0.1]];
        }
      }
    }

    // Realistic asymmetric blink: close 40 ms, hold 80-150 ms, open 60 ms,
    // fired every 1-8 s. The default blink animation is uniform and reads
    // as a tic.
    const blink = mood.anims.find((a) => a.name === "blink");
    if (blink) {
      blink.alt = [
        {
          p: 1,
          delay: [1000, 8000, 1, 2],
          dt: [40, [80, 150], 60],
          vs: { eyeBlinkLeft: [1, 1, 0], eyeBlinkRight: [1, 1, 0] },
        },
      ];
    }
  }
}

interface TrailPoint {
  x: number;
  y: number;
  intensity: number;
  age: number;
}

interface InternalState {
  head: TalkingHeadInstance;
  composer: EffectComposer;
  effect: AsciiEffect;
  canvas: HTMLCanvasElement;
  trail: TrailPoint[];
  velocity: number;
  lastPointer: { x: number; y: number; t: number };
  mouseDown: boolean;
  // CSS-pixel cell size as the user sees it. The shader's uCellSize is in
  // device pixels (cssCellSize * devicePixelRatio) so the visual cell size
  // stays constant across monitors / DPR changes.
  cellSizeCss: number;
  jawOverride: JawOverride | null;
}

export interface UseTalkingHeadAsciiResult {
  containerRef: RefObject<HTMLDivElement | null>;
  status: Status;
  // Speaks `text`. When TTS_API_KEY is configured server-side, audio is
  // fetched from /api/tts, decoded, and routed through TalkingHead's
  // speakAudio so visemes drive the mouth in sync with the audio. Without
  // a key, falls through to browser speechSynthesis (no viseme animation
  // -- Web Speech doesn't expose its audio output).
  speak: (text: string) => Promise<void>;
}

export function useTalkingHeadAscii(settings: AsciiSettings): UseTalkingHeadAsciiResult {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<InternalState | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "init" });

  // Boot — runs once on mount. Settings are read here for initial values
  // (camera, lighting, ASCII effect, mood) and the user then drives the
  // camera via TalkingHead's OrbitControls. We intentionally do NOT
  // re-boot or re-apply when settings change; treat the settings object
  // as a build-time tuning blob, not live state.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!hasWebGL()) {
      void loadFallback().then((text) => setStatus({ kind: "fallback", text }));
      return;
    }

    let disposed = false;
    let raf = 0;
    let resizeObs: ResizeObserver | null = null;
    const cleanups: Array<() => void> = [];

    (async () => {
      try {
        setStatus({ kind: "loading", pct: 0 });

        const mod = await import("@met4citizen/talkinghead");
        const TalkingHead = mod.TalkingHead as unknown as TalkingHeadCtor;

        // The TalkingHead container IS the visible canvas host now —
        // we want the WebGL canvas exposed so it can receive native
        // pointer events for the cursor scramble effect.
        const head = new TalkingHead(container, {
          cameraView: settings.view,
          cameraX: settings.cameraX,
          cameraY: settings.cameraY,
          cameraDistance: settings.cameraDistance,
          cameraRotateY: settings.cameraRotateY,
          // OrbitControls are owned by TalkingHead; flipping these on lets
          // the user drag-rotate, drag-pan, and wheel-zoom the avatar. The
          // cursor-velocity scramble effect listens to mousemove globally
          // and is intentionally allowed to pause while the orbit controls
          // are mid-gesture (mousedown).
          cameraRotateEnable: true,
          cameraPanEnable: true,
          cameraZoomEnable: true,
          lightAmbientColor: 0xffffff,
          lightAmbientIntensity: settings.lightAmbient,
          lightDirectColor: 0xffffff,
          lightDirectIntensity: settings.lightDirect,
          modelPixelRatio: 1,
          modelFPS: 30,
          avatarIdleEyeContact: 0.2,
          avatarSpeakingEyeContact: 0.5,
          mixerGainSpeech: 1,
          // Suppress dynamic `import('lipsync-${lang}.mjs')` at boot. We
          // pre-attach the processor below, which is the bundler-safe
          // alternative to letting TalkingHead resolve modules at runtime.
          lipsyncModules: [],
          lipsyncLang: "en",
        });

        // Pre-attach the English viseme processor. Static import is bundler-
        // safe; TalkingHead's lipsyncPreProcessText / lipsyncWordsToVisemes
        // call sites read from this map, so once it's populated the full
        // upstream viseme pipeline works through speakAudio().
        (head as unknown as { lipsync: Record<string, LipsyncEn> }).lipsync = {
          en: new LipsyncEn(),
        };

        // Avatar contract for /public/avatar.glb:
        //  - Mixamo-style skeleton: Hips, Spine, Spine1, Spine2, Neck, Head,
        //    LeftShoulder, RightShoulder (TalkingHead drives these for idle).
        //  - ARKit blendshapes: at minimum eyeBlinkLeft, eyeBlinkRight,
        //    jawOpen, mouthSmileLeft, mouthSmileRight.
        //  - Compress before shipping: `gltfpack -cc -tc` for meshopt + KTX2.
        //    The uncompressed Blender export is ~13 MB and not acceptable.
        await head.showAvatar(
          {
            url: "/avatar.glb",
            body: "M",
            avatarMood: settings.mood,
            retarget: AVATURN_RETARGET,
            baseline: AVATURN_BASELINE,
          },
          (e: ProgressEvent) => {
            if (e.lengthComputable) {
              setStatus({ kind: "loading", pct: (e.loaded / e.total) * 100 });
            }
          },
        );
        if (disposed) return;

        // PBR → Lambert: dodges the Mesa/llvmpipe + HDR envmap crash and
        // simplifies shading. Keep each mesh's diffuse texture (`map`) —
        // throwing it away gave a flat white silhouette under our hot
        // lighting, with no brightness variation for the ASCII shader to
        // pick up.
        head.armature.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (!mesh.isMesh) return;
          const old = mesh.material as THREE.Material | THREE.Material[] | undefined;
          const first = (Array.isArray(old) ? old[0] : old) as
            | (THREE.Material & { color?: THREE.Color; map?: THREE.Texture | null })
            | undefined;
          mesh.material = new THREE.MeshLambertMaterial({
            color: first?.color ? first.color.clone() : new THREE.Color(0xeeeeee),
            map: first?.map ?? null,
          });
          if (Array.isArray(old)) {
            for (const m of old) m.dispose();
          } else {
            old?.dispose();
          }
        });

        tweakAnimations(head);

        const canvas = head.renderer.domElement;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        canvas.style.touchAction = "none";

        // ASCII postprocessing chain. TalkingHead's existing renderer.render
        // call routes through the composer; the composer's internal
        // renderer.render passes through.
        const effect = new AsciiEffect({
          fontSize: 54,
          cellSize: settings.cellSize * window.devicePixelRatio,
          color: "#ffffff",
          invert: settings.invert,
          blend: settings.blend,
          hoverRadius: settings.hoverRadius,
          colored: settings.colored,
          backgroundColor: settings.backgroundColor,
        });
        const composer = new EffectComposer(head.renderer);
        composer.addPass(new RenderPass(head.scene, head.camera));
        composer.addPass(new EffectPass(head.camera, effect));

        const origRender = head.renderer.render.bind(head.renderer);
        let inside = false;
        head.renderer.render = (s: THREE.Scene, c: THREE.Camera) => {
          if (inside) {
            origRender(s, c);
            return;
          }
          // Apply the manual jaw override (Web Speech fallback only) just
          // before composing. TalkingHead has already finished its animation
          // update for this tick, so writing the morph value here makes ours
          // win for the frame.
          const ov = stateRef.current?.jawOverride;
          if (ov?.active) ov.mesh.morphTargetInfluences[ov.jawIndex] = ov.value;
          inside = true;
          composer.render();
          inside = false;
        };
        cleanups.push(() => {
          head.renderer.render = origRender;
        });

        const resize = () => {
          const w = container.clientWidth;
          const h = container.clientHeight;
          if (w === 0 || h === 0) return;
          head.renderer.setSize(w, h, false);
          composer.setSize(w, h);
          head.camera.aspect = w / h;
          head.camera.updateProjectionMatrix();
          // DPR may have changed (window dragged to a different monitor);
          // re-derive device-pixel cell size from the CSS-pixel intent.
          const s = stateRef.current;
          if (s) s.effect.setCellSize(s.cellSizeCss * window.devicePixelRatio);
        };
        resize();

        // matchMedia fires on DPR transitions even when the container's
        // CSS size doesn't change (e.g., browser zoom, OS scale toggle).
        // Re-attach with the new ratio each fire.
        const watchDpr = () => {
          const mql = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
          const onChange = () => {
            mql.removeEventListener("change", onChange);
            resize();
            watchDpr();
          };
          mql.addEventListener("change", onChange);
          cleanups.push(() => mql.removeEventListener("change", onChange));
        };
        watchDpr();

        const state: InternalState = {
          head,
          composer,
          effect,
          canvas,
          trail: [],
          velocity: 0,
          lastPointer: { x: 0.5, y: 0.5, t: performance.now() },
          mouseDown: false,
          cellSizeCss: settings.cellSize,
          jawOverride: null,
        };
        stateRef.current = state;

        // --- Mouse / touch handlers (Matthew's exact velocity math) ---
        const updatePointer = (clientX: number, clientY: number, isDown: boolean) => {
          const rect = state.canvas.getBoundingClientRect();
          const x = (clientX - rect.left) / rect.width;
          const y = (clientY - rect.top) / rect.height;
          const now = performance.now();
          const dt = Math.max(1, now - state.lastPointer.t);
          const dx = x - state.lastPointer.x;
          const dy = y - state.lastPointer.y;
          const speed = (Math.sqrt(dx * dx + dy * dy) / dt) * 1000;
          const intensity = speed > 1.5 ? Math.min((speed - 1.5) * 0.5, 1) : 0;

          state.velocity = Math.max(state.velocity, intensity);
          if (intensity > 0.05 && !isDown) {
            state.trail.push({ x, y, intensity, age: 0 });
            if (state.trail.length > 200) state.trail.shift();
          }
          state.lastPointer = { x, y, t: now };
          state.effect.setMouse(x, y);
        };

        const onMouseMove = (e: MouseEvent) => updatePointer(e.clientX, e.clientY, state.mouseDown);
        const onMouseDown = () => {
          state.mouseDown = true;
        };
        const onMouseUp = () => {
          state.mouseDown = false;
        };
        const onTouchMove = (e: TouchEvent) => {
          const t = e.touches[0];
          if (t) updatePointer(t.clientX, t.clientY, false);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mouseup", onMouseUp);
        canvas.addEventListener("touchmove", onTouchMove, { passive: true });
        cleanups.push(() => {
          window.removeEventListener("mousemove", onMouseMove);
          window.removeEventListener("mousedown", onMouseDown);
          window.removeEventListener("mouseup", onMouseUp);
          canvas.removeEventListener("touchmove", onTouchMove);
        });

        // --- Per-frame uniform updates (velocity decay + trail aging) ---
        const trailBuf = new Float32Array(300);
        const tick = () => {
          if (disposed) return;
          raf = requestAnimationFrame(tick);
          const s = stateRef.current;
          if (!s) return;

          s.effect.setTime(performance.now() / 1000);

          // Same double-decay Matthew uses (~0.874 / frame).
          s.velocity *= 0.92;
          s.velocity *= 0.95;
          if (s.velocity < 0.001) s.velocity = 0;
          s.effect.setVelocity(s.velocity);

          if (s.trail.length > 0) {
            const alive: TrailPoint[] = [];
            for (const p of s.trail) {
              p.intensity *= 0.95;
              p.age += 1;
              if (p.intensity > 0.01) alive.push(p);
            }
            s.trail = alive;

            const start = Math.max(0, alive.length - 100);
            const recent = alive.slice(start);
            for (let i = 0; i < recent.length && i < 100; i++) {
              const p = recent[i];
              trailBuf[3 * i] = p.x;
              trailBuf[3 * i + 1] = p.y;
              trailBuf[3 * i + 2] = p.intensity;
            }
            // Zero out unused slots so old data doesn't leak in.
            for (let i = recent.length * 3; i < 300; i++) trailBuf[i] = 0;
            s.effect.setTrail(trailBuf, recent.length);
          } else {
            s.effect.setTrail(trailBuf, 0);
          }
        };
        tick();

        resizeObs = new ResizeObserver(resize);
        resizeObs.observe(container);

        setStatus({ kind: "ready" });
      } catch (err) {
        console.error("[talkinghead-ascii] init failed", err);
        const text = await loadFallback();
        if (!disposed) setStatus({ kind: "fallback", text });
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      resizeObs?.disconnect();
      for (const fn of cleanups) {
        try {
          fn();
        } catch {
          /* swallow — dispose only */
        }
      }
      stateRef.current?.composer.dispose();
      stateRef.current = null;
    };
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const state = stateRef.current;
      if (!state || !settings.lipsync) {
        speakBrowserFallback(trimmed, state);
        return;
      }

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!res.ok) {
          // 503 = TTS_API_KEY not configured. Web Speech doesn't expose its
          // audio output to JS, so we can't drive real visemes from it --
          // the fallback fakes mouth motion off boundary events instead.
          speakBrowserFallback(trimmed, state);
          return;
        }
        const arrayBuf = await res.arrayBuffer();
        const audioBuffer = await state.head.audioCtx.decodeAudioData(arrayBuf);
        state.head.speakAudio(buildSpeakAudioPayload(trimmed, audioBuffer));
      } catch {
        speakBrowserFallback(trimmed, state);
      }
    },
    [settings.lipsync],
  );

  return { containerRef, status, speak };
}

// Linear word-timing estimate. OpenAI's TTS endpoint doesn't return word
// timestamps, so we split the text into words and distribute their start
// times across the audio's duration weighted by character count. The
// intra-word visemes are computed phonetically by LipsyncEn, so even with
// rough word boundaries the mouth shapes within each word look right;
// boundary error of ±100 ms isn't perceptible against running speech.
function buildSpeakAudioPayload(text: string, audio: AudioBuffer) {
  const tokens = text.split(/\s+/).filter((w) => w.length > 0);
  const totalMs = audio.duration * 1000;
  const totalChars = tokens.reduce((sum, w) => sum + w.length, 0) || 1;
  const words: string[] = [];
  const wtimes: number[] = [];
  const wdurations: number[] = [];
  let cursor = 0;
  for (const w of tokens) {
    const dur = (w.length / totalChars) * totalMs;
    words.push(w);
    wtimes.push(cursor);
    wdurations.push(dur);
    cursor += dur;
  }
  return { audio, words, wtimes, wdurations };
}

function findJawMesh(
  head: TalkingHeadInstance,
): { mesh: MorphTargetMesh; jawIndex: number } | null {
  for (const mesh of head.morphs ?? []) {
    const idx = mesh.morphTargetDictionary?.jawOpen;
    if (typeof idx === "number") return { mesh, jawIndex: idx };
  }
  return null;
}

// Web Speech fallback. The Web Speech API doesn't expose its decoded audio
// to JS, so we can't compute real visemes -- but it does fire `boundary`
// events at word transitions while speaking. We use those events plus an
// RAF-driven sine to fake jaw movement that roughly tracks word rhythm.
// Not phonetically accurate, but reads as "talking" instead of dead-mouthed.
function speakBrowserFallback(text: string, state: InternalState | null) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  // Cancel anything in flight; replaces the previous override, if any.
  window.speechSynthesis.cancel();
  if (state?.jawOverride) {
    state.jawOverride.active = false;
    state.jawOverride.mesh.morphTargetInfluences[state.jawOverride.jawIndex] = 0;
  }

  const utter = new SpeechSynthesisUtterance(text);

  const jaw = state ? findJawMesh(state.head) : null;
  if (state && jaw) {
    const override: JawOverride = {
      mesh: jaw.mesh,
      jawIndex: jaw.jawIndex,
      value: 0,
      active: false,
    };
    state.jawOverride = override;

    let raf = 0;
    let lastBoundary = 0;
    const animate = () => {
      const elapsed = performance.now() - lastBoundary;
      // Decay to a low idle hum after each boundary so it pulses with words
      // rather than running flat-out for the whole utterance.
      const energy = Math.max(0.25, 1 - elapsed / 350);
      const wobble = Math.abs(Math.sin(performance.now() / 75));
      override.value = 0.1 + 0.45 * wobble * energy;
      raf = requestAnimationFrame(animate);
    };

    utter.onstart = () => {
      override.active = true;
      lastBoundary = performance.now();
      animate();
    };
    utter.onboundary = () => {
      lastBoundary = performance.now();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      override.active = false;
      override.value = 0;
      jaw.mesh.morphTargetInfluences[jaw.jawIndex] = 0;
      if (state.jawOverride === override) state.jawOverride = null;
    };
    utter.onend = stop;
    utter.onerror = stop;
  }

  window.speechSynthesis.speak(utter);
}
