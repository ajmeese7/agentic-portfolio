"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import type { Project } from "@/lib/projects";

export function ProjectsCarousel({ projects }: { projects: Project[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [selected, setSelected] = useState(0);

  const onSelect = useCallback(() => {
    if (emblaApi) setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <section aria-labelledby="projects-h" className="mt-16">
      <header className="flex items-baseline justify-between mb-4 px-1">
        <h2 id="projects-h" className="text-sm uppercase tracking-widest text-muted">
          ↳ projects
        </h2>
        <div className="flex gap-2 text-muted">
          <button
            type="button"
            aria-label="previous project"
            disabled={!emblaApi}
            onClick={() => emblaApi?.scrollPrev()}
            className="cursor-pointer px-2 py-1 hover:text-accent transition-colors text-lg disabled:opacity-30"
          >
            ‹
          </button>
          <span className="text-xs self-center">
            {String(selected + 1).padStart(2, "0")} / {String(projects.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            aria-label="next project"
            disabled={!emblaApi}
            onClick={() => emblaApi?.scrollNext()}
            className="cursor-pointer px-2 py-1 hover:text-accent transition-colors text-lg disabled:opacity-30"
          >
            ›
          </button>
        </div>
      </header>

      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-4">
          {projects.map((p) => (
            <article
              key={p.slug}
              className="min-w-0 shrink-0 grow-0 basis-full sm:basis-1/2 lg:basis-1/3 border border-border-default rounded p-5 hover:border-accent/60 transition-colors"
            >
              <div className="flex items-baseline justify-between">
                <h3 className="text-foreground text-base">{p.title}</h3>
                {p.metric && <span className="text-accent text-xs">{p.metric}</span>}
              </div>
              <p className="text-muted text-sm mt-2 leading-relaxed">{p.blurb}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                {p.tags.map((t) => (
                  <span key={t} className="text-[10px] uppercase tracking-wider text-muted">
                    [{t}]
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                {p.live && (
                  <a
                    href={p.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    live ↗
                  </a>
                )}
                {p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    repo ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
