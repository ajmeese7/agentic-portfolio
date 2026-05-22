import type { NextConfig } from "next";

// LAN access to `pnpm dev` (testing on a phone, another machine on Wi-Fi,
// etc.) needs Next's CORS allowlist to include the host's LAN IP. Keeping
// loopback addresses baked in covers the default localhost case; anything
// else is read from ALLOWED_DEV_ORIGINS in `.env.local` so swapping
// networks doesn't require a code edit.
const extraOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1", "localhost", ...extraOrigins],
};

export default nextConfig;
