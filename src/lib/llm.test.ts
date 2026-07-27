import { describe, expect, it } from "vitest";
import real from "./__fixtures__/index-v1.json";
import { assembleSystemPrompt } from "./llm";
import { parseWritingIndex } from "./writing-index";

const PROFILE = "# Aaron Meese\n\nSnapshot goes here.\n";

function realIndex() {
  const index = parseWritingIndex(real);
  if (!index) throw new Error("fixture should parse");
  return index;
}

describe("assembleSystemPrompt without an index", () => {
  it("produces the profile-only prompt, so degrading is invisible", () => {
    // Arrange / Act
    const prompt = assembleSystemPrompt(PROFILE, null);

    // Assert
    expect(prompt).toContain("--- PROFILE ---");
    expect(prompt.endsWith(PROFILE)).toBe(true);
    expect(prompt).not.toContain("--- WRITING INDEX ---");
    expect(prompt).not.toContain("meese.rs is where Aaron writes now");
  });

  it("treats an empty index the same as no index", () => {
    // Arrange
    const empty = { version: 1, count: 0, entries: [] };

    // Act / Assert
    expect(assembleSystemPrompt(PROFILE, empty)).toBe(assembleSystemPrompt(PROFILE, null));
  });
});

describe("assembleSystemPrompt with an index", () => {
  it("keeps the writing in its own section, separate from the profile", () => {
    // Arrange / Act
    const prompt = assembleSystemPrompt(PROFILE, realIndex());

    // Assert
    expect(prompt.indexOf("--- PROFILE ---")).toBeLessThan(prompt.indexOf("--- WRITING INDEX ---"));
    expect(prompt).toContain(PROFILE);
  });

  it("lists every entry with the link form the model is told to reproduce", () => {
    // Arrange
    const index = realIndex();

    // Act
    const prompt = assembleSystemPrompt(PROFILE, index);

    // Assert
    for (const entry of index.entries) {
      expect(prompt).toContain(`[${entry.title}](${entry.url})`);
    }
  });

  it("introduces no URL that did not come from the index or the profile", () => {
    // Arrange
    const index = realIndex();
    const known = new Set(index.entries.flatMap((e) => [e.url, e.repo].filter(Boolean)));

    // Act
    const section = assembleSystemPrompt(PROFILE, index).split("--- WRITING INDEX ---")[1];
    const urls = section.match(/https?:\/\/[^\s)]+/g) ?? [];

    // Assert
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) expect(known).toContain(url);
  });

  it("carries the rules that keep citation honest and rare", () => {
    // Arrange / Act
    const prompt = assembleSystemPrompt(PROFILE, realIndex());

    // Assert
    expect(prompt).toContain("never invent a title");
    expect(prompt).toContain("at most one entry");
    expect(prompt).toContain("up to three");
    expect(prompt).toContain("link nothing");
    expect(prompt).toContain("meese.rs is where Aaron writes now");
  });

  it("passes the repo through when an entry declares one", () => {
    // Arrange
    const index = realIndex();
    const withRepo = index.entries.find((e) => e.repo);
    if (!withRepo?.repo) throw new Error("fixture should carry a repo");

    // Act
    const prompt = assembleSystemPrompt(PROFILE, index);

    // Assert
    expect(prompt).toContain(`repo: ${withRepo.repo}`);
  });

  it("stays small enough to send on every turn", () => {
    // Arrange / Act
    const withIndex = assembleSystemPrompt(PROFILE, realIndex());
    const without = assembleSystemPrompt(PROFILE, null);

    // Assert: the ceiling that decides when this switches to retrieval.
    expect(withIndex.length - without.length).toBeLessThan(16_000);
  });
});
