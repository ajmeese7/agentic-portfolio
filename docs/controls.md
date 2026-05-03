# Avatar interactions and tuning

The avatar shipped to production has no UI panel. There are two surfaces of "control": runtime mouse/touch input the visitor can use, and edit-time tuning constants in `DEFAULT_SETTINGS`.

## Runtime input (mouse / touch)

- **Move the cursor** over the canvas — ASCII characters around the cursor scramble with intensity proportional to mouse velocity. Fast moves leave a trail of disturbed cells (up to 100 alive at once, intensity decays each frame). Touch-drag does the same on mobile.
- **Left-drag** — rotate the camera around the avatar (TalkingHead OrbitControls).
- **Right-drag** — pan the look-at point.
- **Scroll wheel / pinch** — zoom in/out (`cameraDistance`).
- **Hold mouse-down** while moving — orbit gesture is active; the cursor scramble pauses by design while the user is dragging.

Orbit/pan/zoom is enabled via `cameraRotateEnable` / `cameraPanEnable` / `cameraZoomEnable` on the TalkingHead constructor in `useTalkingHeadAscii.ts`.

## Edit-time tuning (`DEFAULT_SETTINGS`)

Defined in `src/components/useTalkingHeadAscii.ts`. These set the avatar's *initial* state. The camera-position fields (`view`, `cameraDistance`, `cameraX`, `cameraY`, `cameraRotateY`) are starting values that the user then overrides via mouse input; the rest are persistent shader / lighting / mood knobs.

### Camera (initial position only)

| Field | Default | Effect |
| --- | --- | --- |
| `view` | `upper` | Preset framing. Sets a base camera Z and look-at height (see table). |
| `cameraDistance` | `0` | Added to the view's base Z. Positive = further away. |
| `cameraX` | `0` | Horizontal camera offset. |
| `cameraY` | `0` | Vertical camera offset. |
| `cameraRotateY` | `0` rad | Yaw the camera around the avatar. |

| view  | base Z | look-at Y                       |
| ----- | ------ | ------------------------------- |
| head  | 2      | `4 * avatarHeight / 5`          |
| upper | 4.5    | `2 * avatarHeight / 3`          |
| mid   | 8      | `avatarHeight / 3`              |
| full  | 12     | 0                               |

### Lighting

The 20-character ramp wants a wide tonal range, so defaults are hot. Underexposed faces collapse into 3-4 chars and look flat.

| Field | Default | Effect |
| --- | --- | --- |
| `lightAmbient` | `5.5` | TalkingHead `lightAmbientIntensity`. |
| `lightDirect` | `100` | TalkingHead `lightDirectIntensity`. |

### ASCII shader

| Field | Default | Effect |
| --- | --- | --- |
| `cellSize` | `12` | CSS-pixel size of each ASCII cell (DPR-stable). Smaller = denser grid. Internally `uCellSize = cellSize × devicePixelRatio`. |
| `hoverRadius` | `0.1` | `uHoverRadius` — radius (normalized to canvas size) of cursor disturbance. Trail point radius is 0.8× this. |
| `blend` | `0.95` | `uBlend` — `1` is pure ASCII; `0` is greyscale of the underlying render. Useful for verifying the source render looks right. |
| `invert` | `false` | `uInvertAmount` — flips brightness mapping. |

### Mood

`mood` switches TalkingHead's animation set: `neutral` / `happy` / `angry` / `sad` / `fear` / `disgust` / `love` / `sleep`. Each has its own idle blink rate, eye-direction bias, and brow/mouth baseline. The override pass (drop pose/misc, narrow saccade, replace blink) re-runs on the new set.
