# Vaulty — Copilot Instructions

You are working on **Vaulty**, a monorepo desktop app:

- **apps/web**: Next.js app (UI)
- **apps/desktop**: Electron app (main process + preload + packaging)
- The desktop app loads Next.js during dev from `http://localhost:3000`
- For production builds, Electron starts a local Next.js server from a bundled build

## High-level architecture rules

- Keep **Next.js UI** in `apps/web` (App Router OK).
- Keep **native/OS + file/db work** in Electron `apps/desktop` (main process).
- Renderer code must NOT access Node APIs directly.
- Use a secure bridge via **preload** (`contextIsolation: true`, `nodeIntegration: false`).
- Prefer typed IPC (request/response), avoid random `ipcRenderer.on` events unless needed.

## Dev vs Production behavior (critical)

### Development

- Next.js runs separately (e.g. `npm run dev --workspace apps/web`).
- Electron loads: `http://localhost:3000`.

### Production (packaged)

- Next.js is built with `output: "standalone"` in `apps/web/next.config.ts`.
- Electron spawns the bundled Next server (standalone `server.js`) and loads it from `http://localhost:<port>`.

## What `apps/desktop/scripts/prep-web.mjs` does (do not break)

This script prepares the Next.js production build **for Electron packaging**.

**File:** `apps/desktop/scripts/prep-web.mjs`

**Purpose:**

- Copies the Next.js build output from `apps/web` into `apps/desktop/resources/web`
- This ensures the packaged Electron app includes everything needed to run the Next standalone server.

**What it copies:**

1. `apps/web/.next/standalone/**` → `apps/desktop/resources/web/**`
   - Contains the standalone server entry (e.g. `server.js`) and required Node modules/files.
2. `apps/web/.next/static/**` → `apps/desktop/resources/web/.next/static/**`
   - Required because Next standalone expects static assets at `.next/static`.
3. `apps/web/public/**` → `apps/desktop/resources/web/public/**` (if it exists)
   - Required for images/icons and any public assets.

**Important constraints:**

- Do not change the output folder structure in `resources/web` unless you also update Electron’s production server path logic.
- The packaged app must be able to locate:
  - `resources/web/server.js`
  - `resources/web/.next/static/**`
  - `resources/web/public/**` (optional)

## Electron main process rules (`apps/desktop/main.ts`)

- Use `app.isPackaged` to determine dev vs prod.
- In production, resolve the bundled web build using `process.resourcesPath`, not repo-relative paths.
- Avoid hardcoding ports if possible (port collisions). Prefer a configurable or dynamically chosen port.

## Preload rules (`apps/desktop/preload.ts`)

- Expose a minimal API via `contextBridge.exposeInMainWorld`.
- Do not expose full `ipcRenderer`.
- Every exposed method should be a small wrapper around a single IPC channel.

## When you make changes

- Always list the exact files you changed.
- Keep diffs minimal; do not refactor unrelated code.
- If you change build/packaging behavior, update the relevant scripts and ensure `prep-web.mjs` still produces the required `resources/web` layout.

---

## Product idea (the general idea of what Vaulty is)

Vaulty is a **local-first scrapbook** to replace dumping everything into Discord/DMs and scrolling forever.

Users can quickly save:

- screenshots (ex: Minecraft coords)
- short notes/tips (ex: Video game build notes)
- links and snippets
- “tasks/reminders” (ex: sample timestamps tomorrow, learn C# tomorrow, or make a beat in FL Studio tomorrow at 3pm)

Then later they can retrieve items using natural queries like:

- “find my minecraft cave coords”
- “find my minecraft coords from ~3 weeks ago”
- "neuvillette (genshin) artifacts tips”
- “remind me tomorrow: sample Bound 2 (1:23–1:35)”

Key behaviors:

- **Quick capture**: drag/drop an image, paste text, or type a quick line and press Enter.
- **Tagging**: user can add quick tags like “cave”, “genshin”, “sample”, etc.
- **Time awareness**: queries can reference time (“3 weeks ago”, “yesterday”).
- **Search modes**:
  - Baseline: keyword + filters (tags, type, date range)
  - Enhanced: OCR for screenshots; optional AI semantic search later
- **Reminders/notifications**: some entries can schedule a notification (ex: “tomorrow”).

## UI expectations

- Minimal, fast, keyboard-friendly UI
- Primary flows:
  1. Capture / Add item (input bar + tag entry)
  2. Browse recent items
  3. Search with filters (type, tag, date range)
  4. Open item details
- UX should support:
  - a main input bar at the main screen for quick entry
  - drag/drop images
  - quick tag entry like: drop image → type “cave” → Enter
  - “natural time” searches (ex: “3 weeks ago” maps to date filter)

---

## Small rules for Copilot suggestions

- Do not use emojis, that includes the code itself, code comments, commit messages, PR titles, or any other text.
- Use American English spelling (e.g., "color" not "colour").
