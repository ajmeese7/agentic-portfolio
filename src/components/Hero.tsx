import type { ReactNode } from "react";
import { Chat } from "./Chat";
import TalkingHeadAscii from "./TalkingHeadAscii";

interface HeroProps {
  banner: ReactNode;
}

export function Hero({ banner }: HeroProps) {
  return (
    <section>
      <div className="overflow-hidden">{banner}</div>

      <div className="mt-8 md:grid md:grid-cols-[1fr_auto] md:gap-12 md:items-start">
        <div>
          <p className="text-muted text-sm sm:text-base">
            ↳ making complex systems work smarter, not harder.
            <br />
            ex-blue-team. now shipping at a stealth startup.
          </p>
          <Chat />
        </div>

        <div className="order-first md:order-last mb-8 md:mb-0 w-64 sm:w-72 md:w-80 mx-auto md:mx-0 aspect-square">
          <TalkingHeadAscii />
        </div>
      </div>
    </section>
  );
}
