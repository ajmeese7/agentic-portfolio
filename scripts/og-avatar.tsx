/** @jsxRuntime automatic */
/** @jsxImportSource react */

// Variant B: avatar-centered card. The captured ASCII avatar sits on the
// right (matching the live hero layout), with wordmark + tagline on the
// left. Dark bg + scanlines so it reads as the same surface as the site.

const BG = "#0a0a0a";
const FG = "#e6e6e6";
const MUTED = "#8a8a8a";
const ACCENT = "#7cfc9a";

function Scanlines() {
  const rows: number[] = [];
  for (let y = 0; y < 630; y += 4) rows.push(y);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex" }}>
      {rows.map((y) => (
        <div
          key={y}
          style={{
            position: "absolute",
            top: y + 2,
            left: 0,
            width: 1200,
            height: 2,
            background: "rgba(255,255,255,0.025)",
            display: "flex",
          }}
        />
      ))}
    </div>
  );
}

interface Props {
  avatarDataUrl: string | null;
}

export function OgAvatar({ avatarDataUrl }: Props) {
  return (
    <div
      style={{
        width: 1200,
        height: 630,
        position: "relative",
        background: BG,
        display: "flex",
        fontFamily: "Geist Mono",
      }}
    >
      <Scanlines />

      {/* Wordmark — single line */}
      <div
        style={{
          position: "absolute",
          top: 230,
          left: 80,
          display: "flex",
          fontFamily: "Geist Mono",
          fontWeight: 700,
          fontSize: 80,
          color: FG,
          letterSpacing: -2,
          lineHeight: 1,
        }}
      >
        aaron meese
      </div>

      {/* Tagline — width capped so it doesn't run into the avatar slot */}
      <div
        style={{
          position: "absolute",
          top: 332,
          left: 80,
          width: 540,
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: 22,
          color: MUTED,
          lineHeight: 1.4,
        }}
      >
        <span style={{ color: MUTED, marginRight: 12 }}>↳</span>
        <span>making complex systems work smarter, not harder.</span>
      </div>

      {/* Domain */}
      <div
        style={{
          position: "absolute",
          top: 412,
          left: 80,
          display: "flex",
          fontFamily: "Geist Mono",
          fontSize: 20,
          color: ACCENT,
        }}
      >
        meese.dev
      </div>

      {/* Avatar slot (right side, square, vertically centered) */}
      <div
        style={{
          position: "absolute",
          top: 95,
          right: 60,
          width: 440,
          height: 440,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarDataUrl ? (
          <img
            src={avatarDataUrl}
            width={440}
            height={440}
            style={{ width: 440, height: 440, objectFit: "contain" }}
            alt="avatar"
          />
        ) : (
          <div
            style={{
              width: 480,
              height: 480,
              border: `1px dashed ${MUTED}`,
              color: MUTED,
              fontSize: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            avatar not captured — run pnpm capture:avatar
          </div>
        )}
      </div>
    </div>
  );
}
