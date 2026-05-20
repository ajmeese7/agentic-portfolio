import { NextResponse } from "next/server";
import { projects } from "@/content/projects";

export const runtime = "nodejs";

const headers = {
  "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
};

type Metric = { stars?: number };

function repoParts(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;
    const [owner, repo] = parsed.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function fallbackMetrics(): Record<string, Metric> {
  return Object.fromEntries(projects.map((project) => [project.slug, { stars: project.stars }]));
}

export async function GET() {
  const fallback = fallbackMetrics();
  const githubHeaders: HeadersInit = {
    accept: "application/vnd.github+json",
    "user-agent": "meese-dev-portfolio",
  };
  if (process.env.GITHUB_TOKEN) githubHeaders.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const entries = await Promise.all(
      projects.map(async (project): Promise<[string, Metric]> => {
        if (!project.repo) return [project.slug, fallback[project.slug] ?? {}];
        const parts = repoParts(project.repo);
        if (!parts) return [project.slug, fallback[project.slug] ?? {}];

        const res = await fetch(`https://api.github.com/repos/${parts.owner}/${parts.repo}`, {
          headers: githubHeaders,
        });
        if (!res.ok) return [project.slug, fallback[project.slug] ?? {}];

        const data = (await res.json()) as { stargazers_count?: number };
        const stars = typeof data.stargazers_count === "number" ? data.stargazers_count : undefined;
        return [project.slug, { stars: stars ?? project.stars }];
      }),
    );

    return NextResponse.json({ metrics: Object.fromEntries(entries) }, { headers });
  } catch {
    return NextResponse.json({ metrics: fallback, stale: true }, { headers });
  }
}
