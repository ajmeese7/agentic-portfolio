"use client";

import { type Ref, useImperativeHandle } from "react";
import { DEFAULT_SETTINGS, useTalkingHeadAscii } from "./useTalkingHeadAscii";

export interface AvatarHandle {
  speak: (text: string) => Promise<void>;
}

interface TalkingHeadAsciiProps {
  ref?: Ref<AvatarHandle>;
}

// `speak()` runs OpenAI TTS through TalkingHead's upstream viseme pipeline
// (LipsyncEn statically attached in the hook) so the mouth animates in sync
// with the audio. The dev toggle is DEFAULT_SETTINGS.lipsync; when false,
// speak() falls through to browser speechSynthesis (no mouth movement --
// Web Speech doesn't expose its audio output to viseme analysis).
export default function TalkingHeadAscii({ ref }: TalkingHeadAsciiProps) {
  const { containerRef, status, speak } = useTalkingHeadAscii(DEFAULT_SETTINGS);

  useImperativeHandle(ref, () => ({ speak }), [speak]);

  if (status.kind === "fallback") {
    return <pre className="ascii-fallback">{status.text}</pre>;
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="ascii-stage" />
      {status.kind !== "ready" && (
        <div className="ascii-overlay" role="status">
          {status.kind === "init" ? "booting…" : `loading ${Math.round(status.pct)}%`}
        </div>
      )}
    </div>
  );
}
