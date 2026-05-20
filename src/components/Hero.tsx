"use client";

import { type ReactNode, useRef } from "react";
import { Chat } from "./Chat";
import TalkingHeadAscii, { type AvatarHandle } from "./TalkingHeadAscii";

interface HeroProps {
  banner: ReactNode;
}

export function Hero({ banner }: HeroProps) {
  const avatarRef = useRef<AvatarHandle>(null);

  function handleResponseComplete(text: string) {
    avatarRef.current?.speak(text);
  }

  return (
    <section>
      <div className="overflow-hidden">{banner}</div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_auto] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-0 lg:items-start">
        <p className="text-muted text-sm sm:text-base lg:col-start-1 lg:row-start-1">
          ↳ making complex systems work smarter, not harder.
          <br />
          ex-blue-team. between roles, listening for the next thing.
        </p>

        <div className="w-64 sm:w-72 md:w-80 mx-auto lg:mx-0 aspect-square lg:col-start-2 lg:row-start-1 lg:row-span-2">
          <TalkingHeadAscii ref={avatarRef} />
        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <Chat onResponseComplete={handleResponseComplete} />
        </div>
      </div>
    </section>
  );
}
