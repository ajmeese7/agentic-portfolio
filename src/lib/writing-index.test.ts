import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchWritingIndex,
  getWritingIndex,
  parseWritingIndex,
  resetWritingIndexCache,
  SUPPORTED_VERSION,
} from "./writing-index";
import partial from "./__fixtures__/index-partial.json";
import future from "./__fixtures__/index-v2-future.json";
import real from "./__fixtures__/index-v1.json";

/**
 * Fetch cases run against a real HTTP server on an ephemeral port rather than
 * a stubbed `fetch`. Timeouts, status codes, and malformed bodies then behave
 * the way they do in production instead of the way a double was told to.
 */
type Handler = (respond: {
  status: (code: number) => void;
  body: (text: string) => void;
  hang: () => void;
}) => void;

let server: Server;
let baseUrl: string;
let hits: number;
let handler: Handler;

beforeEach(async () => {
  hits = 0;
  handler = ({ body }) => body(JSON.stringify(real));
  server = createServer((_req, res) => {
    hits += 1;
    let status = 200;
    handler({
      status: (code) => {
        status = code;
      },
      body: (text) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(text);
      },
      hang: () => {
        // Never responds; the client's own timeout has to save it.
      },
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/index.json`;
  resetWritingIndexCache();
});

afterEach(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  resetWritingIndexCache();
  vi.unstubAllEnvs();
});

describe("parseWritingIndex", () => {
  it("reads the catalog meese.rs actually publishes", () => {
    // Arrange / Act
    const index = parseWritingIndex(real);

    // Assert
    expect(index).not.toBeNull();
    expect(index?.version).toBe(SUPPORTED_VERSION);
    expect(index?.count).toBe(real.items.length);
    expect(index?.entries[0].url).toMatch(/^https:\/\/meese\.rs\/posts\//);
  });

  it("keeps the repo field when an entry declares one", () => {
    // Arrange / Act
    const index = parseWritingIndex(real);

    // Assert
    const withRepo = index?.entries.filter((e) => e.repo) ?? [];
    expect(withRepo.length).toBeGreaterThan(0);
    expect(withRepo[0].repo).toMatch(/^https:\/\/github\.com\//);
  });

  it("refuses a version it does not understand rather than guessing", () => {
    // Arrange
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const index = parseWritingIndex(future);

    // Assert
    expect(index).toBeNull();
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("drops malformed entries instead of losing the whole catalog", () => {
    // Arrange: fixture holds one good entry, one missing url, one non-object.
    // Act
    const index = parseWritingIndex(partial);

    // Assert
    expect(index?.count).toBe(1);
    expect(index?.entries[0].slug).toBe(partial.items[0].slug);
  });

  it.each([
    ["null", null],
    ["a string", "nope"],
    ["an object with no items", { version: 1 }],
    ["items that are not an array", { version: 1, items: "nope" }],
  ])("returns null for %s", (_label, payload) => {
    // Arrange / Act / Assert
    expect(parseWritingIndex(payload)).toBeNull();
  });
});

describe("fetchWritingIndex", () => {
  it("returns the catalog on a healthy response", async () => {
    // Arrange / Act
    const index = await fetchWritingIndex(baseUrl);

    // Assert
    expect(index?.count).toBe(real.items.length);
  });

  it("returns null on a non-200 rather than throwing into the chat turn", async () => {
    // Arrange
    handler = ({ status, body }) => {
      status(503);
      body("upstream is having a day");
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const index = await fetchWritingIndex(baseUrl);

    // Assert
    expect(index).toBeNull();
    warn.mockRestore();
  });

  it("returns null when the body is not JSON", async () => {
    // Arrange
    handler = ({ body }) => body("<!doctype html><title>nope</title>");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const index = await fetchWritingIndex(baseUrl);

    // Assert
    expect(index).toBeNull();
    warn.mockRestore();
  });

  it("gives up on a hung request instead of stalling forever", async () => {
    // Arrange
    handler = ({ hang }) => hang();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const started = Date.now();
    const index = await fetchWritingIndex(baseUrl);

    // Assert
    expect(index).toBeNull();
    expect(Date.now() - started).toBeLessThan(6_000);
    warn.mockRestore();
  }, 10_000);
});

describe("getWritingIndex", () => {
  it("serves a second caller from cache instead of refetching", async () => {
    // Arrange
    vi.stubEnv("MEESE_RS_INDEX_URL", baseUrl);

    // Act
    const first = await getWritingIndex(0);
    const second = await getWritingIndex(60_000);

    // Assert
    expect(first?.count).toBe(real.items.length);
    expect(second).toBe(first);
    expect(hits).toBe(1);
  });

  it("refetches once the hour is up", async () => {
    // Arrange
    vi.stubEnv("MEESE_RS_INDEX_URL", baseUrl);

    // Act
    await getWritingIndex(0);
    await getWritingIndex(60 * 60 * 1_000 + 1);

    // Assert
    expect(hits).toBe(2);
  });

  it("caches a failure too, so an outage degrades instead of slowing every turn", async () => {
    // Arrange
    vi.stubEnv("MEESE_RS_INDEX_URL", baseUrl);
    handler = ({ status, body }) => {
      status(500);
      body("down");
    };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Act
    const first = await getWritingIndex(0);
    const second = await getWritingIndex(1_000);

    // Assert
    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(hits).toBe(1);
    warn.mockRestore();
  });

  it("collapses concurrent callers into one request", async () => {
    // Arrange
    vi.stubEnv("MEESE_RS_INDEX_URL", baseUrl);

    // Act
    const [a, b, c] = await Promise.all([
      getWritingIndex(0),
      getWritingIndex(0),
      getWritingIndex(0),
    ]);

    // Assert
    expect(hits).toBe(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
