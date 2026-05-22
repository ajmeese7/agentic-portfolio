# agentic-portfolio

Interact with a digital clone of me. Next.js app rendering a live ASCII portrait driven by a 3D avatar (TalkingHead + custom GPU ASCII pass).

![home page — ASCII portrait, chat prompts, and projects carousel](docs/preview.png)

## Credits
- **Inspiration:** [Matthew Peterson](https://www.matthewpetersen.ca/)
- **Name image generation:** [README ASCII](https://github.com/ajmeese7/readme-ascii)
  - *Font:* DOS Rebel - [Valerie Mates](https://www.unixmama.com/)

## Requirements

- Node.js 22+ (developed on 22.22.0). The exact version is pinned in `.nvmrc`.
- pnpm 10+ (developed on 10.33.2). The repo uses `pnpm` patches via `pnpm-workspace.yaml`, so npm/yarn will skip the patch and ship a broken TalkingHead build.

### NVM (multi-Node machines)

If you juggle several Node versions, [NVM](https://github.com/nvm-sh/nvm) reads `.nvmrc` automatically:

```sh
nvm install   # installs the version in .nvmrc if it isn't already present
nvm use       # activates it for the current shell
```

To switch automatically when you `cd` into the repo, see [NVM's deeper shell integration](https://github.com/nvm-sh/nvm#deeper-shell-integration). The production `scripts/deploy.sh` sources NVM and runs `nvm use` itself, so systemd units don't need to inherit your shell config.

## Install

```sh
pnpm install
```

This applies `patches/@met4citizen__talkinghead@1.7.0.patch` automatically. If you ever see avatar regressions after upgrading that package, re-check the patch still applies cleanly (the version in the filename is the resolved package version pnpm tracks).

## Run

Dev server (Turbopack, hot reload):

```sh
pnpm dev
```

Defaults to `http://localhost:3000`. If 3000 is taken, Next picks the next free port and prints it.

LAN access (phone, other machine on the same network) requires the firewall to allow the dev port. Add your LAN IPs to `ALLOWED_DEV_ORIGINS` in `.env.local` (comma-separated); loopback origins are always allowed.

## Build

Production build and serve:

```sh
pnpm build
pnpm start
```

`pnpm start` serves the built output on port 3000 by default. Override with `PORT=4000 pnpm start`.

## Production (systemd + PM2)

For a long-lived deployment, `scripts/deploy.sh` is the entry point. It:

1. Sources NVM, runs `nvm install` / `nvm use` against `.nvmrc`.
2. `pnpm install --frozen-lockfile` and `pnpm build`.
3. Hands the process off to PM2 via `ecosystem.config.js`, with logs at `logs/pm2-{out,error}.log`.

Run it directly:

```sh
./scripts/deploy.sh             # fetches origin/master, rebuilds, restarts PM2
./scripts/deploy.sh --no-reset  # keep local changes (dev mode)
AGENTIC_PORTFOLIO_DEV_MODE=true ./scripts/deploy.sh  # same as --no-reset, env-style
```

Env files: Next.js reads `.env.production.local` automatically during `next start`. Put `LLM_API_KEY` and any other secrets there on the server (not in `.env.local`, which Next ignores in production).

To run it under systemd (oneshot unit → `deploy.sh` → PM2) with logrotate hooked into PM2 reload, see the matching configs in [`server-config`](https://github.com/meese-enterprises/server-config) (`systemd/agentic-portfolio.service`, `logrotate/agentic-portfolio`, deployed by `scripts/setup_services.sh`). The pattern mirrors the meeseOS service in the same repo.

Service ops cheat sheet (after the unit is installed):

```sh
sudo systemctl start agentic-portfolio       # triggers deploy.sh
sudo journalctl -u agentic-portfolio -f      # deploy.sh stdout/stderr
pm2 logs agentic-portfolio                   # app runtime logs (HTTP, errors)
tail -f logs/pm2-out.log logs/pm2-error.log  # same logs, on disk
```

## LLM backend

The chat route hits any OpenAI-compatible `/chat/completions` endpoint. `DeepSeek` is the zero-config default since it's the cheapest hosted option that actually answers well; nothing else has to change for a deployment.

1. Grab a key from [platform.deepseek.com](https://platform.deepseek.com/api_keys).
2. Set `LLM_API_KEY=sk-...` in `.env.local` (or your host's secret store).
3. Leave `LLM_BASE_URL` and `LLM_MODEL` blank — they default to `https://api.deepseek.com/v1` and `deepseek-chat`.

That's it. Restart `pnpm dev` / redeploy and the avatar starts answering.

To use something else, set both `LLM_BASE_URL` and `LLM_MODEL` explicitly; see `.env.local.example` for OpenAI, Ollama, LM Studio, OpenRouter, and Groq snippets. For reasoning models (e.g. `deepseek-reasoner`, Qwen3, R1), the route strips chain-of-thought by default; set `LLM_DISABLE_THINKING=false` to keep it on for servers that honor `chat_template_kwargs`.

## Quality gates

```sh
pnpm typecheck   # tsc --noEmit
pnpm lint        # biome check src
pnpm fmt         # biome format --write src
```

No test suite yet.

## Layout

- `src/app/` — Next App Router entry (single page, full-bleed avatar).
- `src/components/` — ASCII pipeline:
  - `TalkingHeadAscii.tsx` — top-level client component.
  - `useTalkingHeadAscii.ts` — boots TalkingHead, wires the GPU ASCII pass.
  - `AsciiEffect.ts` — fragment-shader ASCII pass.
  - `buildCharacterAtlas.ts` — generates the glyph atlas at runtime.
- `public/avatar.glb` — meshopt-compressed 3D model the avatar renders from.
- `assets/avatar.source.glb` — uncompressed source. Regenerate `public/avatar.glb` via `pnpm compress:avatar`.
- `scripts/` — build/deploy helpers (`deploy.sh` for production, `compress-avatar.mjs` for asset prep).
- `ecosystem.config.js` — PM2 process config used by `scripts/deploy.sh`.
- `patches/` — pnpm-managed patches for upstream deps.
- `docs/controls.md` — runtime interactions and edit-time tuning knobs.
- `reference/` — local-only ground-truth clone of the visual target. Gitignored.

## Known gotchas

- **npm/yarn break the avatar.** Use pnpm so the TalkingHead patch applies.
- **LAN access needs UFW open** for whichever port `pnpm dev` lands on, and the device's IP added to `ALLOWED_DEV_ORIGINS` in `.env.local`.
