"use client";

import { DEFAULT_SETTINGS, useTalkingHeadAscii } from "./useTalkingHeadAscii";

export default function TalkingHeadAscii() {
  const { containerRef, status } = useTalkingHeadAscii(DEFAULT_SETTINGS);

  if (status.kind === "fallback") {
    return <pre className="ascii-fallback">{status.text}</pre>;
  }

  return (
    <>
      <div ref={containerRef} className="ascii-stage" />
      {status.kind !== "ready" && (
        <div className="ascii-overlay" role="status">
          {status.kind === "init" ? "booting…" : `loading ${Math.round(status.pct)}%`}
        </div>
      )}
    </>
  );
}
