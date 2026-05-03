# Controls

Live tuning panel for the ASCII avatar. Top-right of the page; toggle
with `[ hide ]` / `[ controls ]`.

## Mouse / touch (no panel needed)

- **Move the cursor** over the canvas — the ASCII characters around
  the cursor scramble with intensity proportional to mouse velocity.
- **Move it fast** — leaves a trail of disturbed cells (up to 100
  alive at once, intensity decays each frame).
- **Hold mouse-down** while moving — suppresses trail accumulation
  but `uMouse` and `uVelocity` still update.
- **Touch-drag** does the same on mobile.

There is no orbit / drag-to-rotate yet. TalkingHead's built-in
OrbitControls are disabled (`cameraRotateEnable: false`) because
their event handlers conflict with the cursor-scramble handlers we
attach to the same canvas. To re-enable orbit, flip those flags and
either pick one (orbit *or* scramble) or scope the listeners (e.g.,
scramble on `pointerover`, orbit on `pointerdown`).

Source: `src/components/AsciiControls.tsx`. Defaults defined in
`DEFAULT_SETTINGS` in `src/components/useTalkingHeadAscii.ts`.

## Camera

| Control | Range | Default | Effect |
| --- | --- | --- | --- |
| `view` | `head` / `upper` / `mid` / `full` | `upper` | Preset framing. Each sets a base camera Z and look-at height; see table below. |
| `distance` | `−2` to `6` | `0` | Added to the view's base Z. Positive = further away. |
| `x` | `−1` to `1` | `0` | Horizontal camera offset. |
| `y` | `−1` to `1` | `0` | Vertical camera offset. |
| `rotate` | `−0.6` to `0.6` rad | `0` | Yaw the camera around the avatar. |

| view  | base Z | look-at Y                       |
| ----- | ------ | ------------------------------- |
| head  | 2      | `4 * avatarHeight / 5`          |
| upper | 4.5    | `2 * avatarHeight / 3`          |
| mid   | 8      | `avatarHeight / 3`              |
| full  | 12     | 0                               |

## Lighting

The 20-character ramp wants a wide tonal range, so defaults are
hot. Underexposed faces collapse into 3-4 chars and look flat.

| Control | Range | Default | Effect |
| --- | --- | --- | --- |
| `ambient` | `0` to `30` | `5.50` | TalkingHead `lightAmbientIntensity`. |
| `direct` | `0` to `300` | `100` | TalkingHead `lightDirectIntensity`. |

## ASCII shader

| Control | Range | Default | Effect |
| --- | --- | --- | --- |
| `cell` | `6` to `40` CSS px | `12` | Visual size of each ASCII cell, in CSS pixels (DPR-stable, so a 4K monitor and a 1080p monitor render the same apparent cell size). Smaller = denser grid. The shader pixelizes the source render to one sample per cell; internally `uCellSize = cell × devicePixelRatio`. |
| `hover` | `0.05` to `0.4` | `0.10` | `uHoverRadius` — radius (normalized to canvas size) of cursor disturbance. Trail point radius is 0.8× this. |
| `blend` | `0` to `1` | `0.95` | `uBlend` — `1` is pure ASCII; `0` is greyscale of the underlying render; values between mix the two. Useful for verifying the source render looks right. |
| `invert` | on/off | off | `uInvertAmount` — flips brightness mapping. With `on`, dark areas become dense chars and light areas become sparse. |

## Avatar mood

`mood` switches TalkingHead's animation set: `neutral` / `happy` /
`angry` / `sad` / `fear` / `disgust` / `love` / `sleep`. Each has its
own idle blink rate, eye-direction bias, brow / mouth baseline. The
override pass (drop pose/misc, narrow saccade, replace blink) re-runs
on the new set.

## Reset

`reset` button at the bottom restores `DEFAULT_SETTINGS`.

## Once you have values you like

Hardcode them into `DEFAULT_SETTINGS` in
`src/components/useTalkingHeadAscii.ts` and the panel becomes
optional. To remove the panel, drop the `<AsciiControls>` line from
`TalkingHeadAscii.tsx`.
