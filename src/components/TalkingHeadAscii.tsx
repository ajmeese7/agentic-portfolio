"use client";

import { useState } from "react";
import { AsciiControls } from "./AsciiControls";
import { type AsciiSettings, DEFAULT_SETTINGS, useTalkingHeadAscii } from "./useTalkingHeadAscii";

export default function TalkingHeadAscii() {
  const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTINGS);
  const { containerRef, status } = useTalkingHeadAscii(settings);

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
      <AsciiControls settings={settings} onChange={setSettings} />
    </>
  );
}
