import { defineConfig } from "vitest/config";

// Node environment: everything under test is server-side (index fetching,
// parsing, caching, prompt assembly), and none of it touches the DOM.
// `resolve.tsconfigPaths` is what makes the app's `@/` alias resolve here;
// Vite handles it natively, so no path-resolution plugin is needed.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
