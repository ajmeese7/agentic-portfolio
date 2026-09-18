import { describe, expect, it } from "vitest";
import real from "./__fixtures__/index-v1.json";
import { assembleSystemPrompt, describeUpstreamError } from "./llm";
import { parseWritingIndex } from "./writing-index";

function fetchFailed(cause: unknown): Error {
  const err = new Error("fetch failed");
  return Object.assign(err, { cause });
}

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

describe("describeUpstreamError", () => {
  it("explains a refused connection", () => {
    const message = describeUpstreamError(fetchFailed({ code: "ECONNREFUSED" }));
    expect(message).toContain("connection refused");
  });

  it("explains a DNS lookup failure", () => {
    const message = describeUpstreamError(fetchFailed({ code: "ENOTFOUND" }));
    expect(message).toContain("LLM_BASE_URL");
  });

  it("explains a connect timeout", () => {
    const message = describeUpstreamError(fetchFailed({ code: "ETIMEDOUT" }));
    expect(message).toContain("didn't respond in time");
  });

  it("finds the code inside an AggregateError from multiple connection attempts", () => {
    const aggregate = new AggregateError(
      [Object.assign(new Error("attempt 1"), { code: "ECONNREFUSED" })],
      "all attempts failed",
    );
    const message = describeUpstreamError(fetchFailed(aggregate));
    expect(message).toContain("connection refused");
  });

  it("falls back to a generic reachability message when the cause has no known code", () => {
    const message = describeUpstreamError(fetchFailed(undefined));
    expect(message).toContain("can't reach the model server");
  });

  it("passes through a non-connection Error message unchanged", () => {
    const message = describeUpstreamError(new Error("upstream 500: server error"));
    expect(message).toBe("upstream 500: server error");
  });

  it("handles a thrown value that isn't an Error", () => {
    const message = describeUpstreamError("not an error");
    expect(message).toBe("unknown error talking to the model server.");
  });
});
