"use client";

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@/lib/projects";

const PAGE_SIZE = 6;

export function ProjectsGrid({ projects }: { projects: Project[] }) {
  const [visibleProjects, setVisibleProjects] = useState(projects);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    async function refreshMetrics() {
      try {
        const res = await fetch("/api/github-metrics");
        if (!res.ok) return;
        const data = (await res.json()) as {
          metrics?: Record<string, { stars?: number }>;
        };
        if (cancelled || !data.metrics) return;
        setVisibleProjects((current) =>
          current.map((project) => ({
            ...project,
            stars: data.metrics?.[project.slug]?.stars ?? project.stars,
          })),
        );
      } catch {
        // Keep the hand-curated cached metrics from src/content/projects.ts.
      }
    }
    refreshMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of visibleProjects) {
      for (const t of p.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [visibleProjects]);

  const sorted = useMemo(() => {
    const filtered = activeTag
      ? visibleProjects.filter((p) => p.tags.includes(activeTag))
      : visibleProjects;
    return [...filtered].sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0));
  }, [visibleProjects, activeTag]);

  return (
    <section aria-labelledby="projects-h" className="mt-16">
      <header className="mb-4 px-1">
        <h2 id="projects-h" className="text-sm uppercase tracking-widest text-muted">
          ↳ projects
        </h2>
      </header>

      <div className="hidden sm:flex flex-wrap gap-2 mb-6 px-1">
        <button
          type="button"
          onClick={() => { setActiveTag(null); setLimit(PAGE_SIZE); }}
          className={`cursor-pointer text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
            activeTag === null
              ? "border-accent text-accent"
              : "border-border-default text-muted hover:border-accent/60 hover:text-accent"
          }`}
        >
          All
        </button>
        {allTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => { setActiveTag(activeTag === tag ? null : tag); setLimit(PAGE_SIZE); }}
            className={`cursor-pointer text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
              activeTag === tag
                ? "border-accent text-accent"
                : "border-border-default text-muted hover:border-accent/60 hover:text-accent"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.slice(0, limit).map((p) => (
          <article key={p.slug}>
            <div className="h-full border border-border-default rounded p-5 hover:border-accent/60 transition-colors">
              <div className="flex items-baseline justify-between">
                <h3 className="text-foreground text-base">{p.title}</h3>
                {p.stars !== undefined && <span className="text-accent text-xs">{p.stars}★</span>}
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
                {p.blog && (
                  <a
                    href={p.blog}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline"
                  >
                    blog ↗
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
            </div>
          </article>
        ))}
      </div>

      {limit < sorted.length && (
        <button
          type="button"
          onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
          className="cursor-pointer mt-6 mx-auto block text-xs text-muted hover:text-accent border border-border-default hover:border-accent/60 rounded px-4 py-2 transition-colors"
        >
          show more ({sorted.length - limit} remaining)
        </button>
      )}
    </section>
  );
}
