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

      <div className="mt-8 lg:grid lg:grid-cols-[1fr_auto] lg:gap-12 lg:items-start">
        <div>
          <p className="text-muted text-sm sm:text-base">
            ↳ making complex systems work smarter, not harder.
            <br />
            ex-blue-team. between roles, listening for the next thing.
          </p>
          <Chat onResponseComplete={handleResponseComplete} />
        </div>

        <div className="order-first lg:order-last mb-8 lg:mb-0 w-64 sm:w-72 md:w-80 mx-auto lg:mx-0 aspect-square">
          <TalkingHeadAscii ref={avatarRef} />
        </div>
      </div>
    </section>
  );
}
