# Claude Command Center

A local-first supervisor dashboard for the `claude` CLI. Three panes:

| Pane | Purpose |
| --- | --- |
| **Left** — Goal Kanban | Drag business outcomes across `Active / Executing / Review / Done`. |
| **Center** — Terminal | Live `claude` session per tab. One PTY per tab; multiple in parallel. |
| **Right** — Living Plan | Renders `projects/<slug>/plan.md` and auto-refreshes on save. |

Everything lives on disk as Markdown + JSON — no external services, no Anthropic API calls. The UI talks to your local `claude` CLI so usage stays on your Pro/Team subscription.

---

## Requirements

- **Node.js 20+**
- **`claude` CLI** installed and on `PATH` ([install](https://claude.com/code))
- `node-pty` native build tools (usually already present on macOS/Linux; on Windows, enable C++ build tools)

## Quickstart

```bash
npm install
npm run dev
```

Open <http://127.0.0.1:3000>.

On first run the app scaffolds an Agentic-OS directory at `~/.command-center/`:

```
~/.command-center/
├── CLAUDE.md                        # generated system prompt
├── memory/
│   ├── user.md                      # personal preferences
│   └── brand_context/
│       ├── voice.md
│       ├── icp.md
│       └── positioning.md
├── projects/<slug>/plan.md          # living plan (right pane)
├── projects/<slug>/state.json       # { lane, title, ... }
├── skills/                          # reusable procedures
└── review/                          # human-in-the-loop deposits
```

### Using a different data root

```bash
AGENT_ROOT=~/my-agent-root npm run dev
```

## How it works

- A single `tsx watch server.ts` process runs Next.js **and** a WebSocket bridge on the same port.
- Each terminal tab spawns a PTY via `node-pty.spawn("claude", [], { cwd: projects/<slug> })` with `CLAUDE_PROJECT` and `AGENT_ROOT` injected into the environment.
- `chokidar` watches `$AGENT_ROOT` and broadcasts `plan:updated` / `goal:updated` / `review:new` events over WebSocket.
- The WebSocket binds `127.0.0.1` only and is gated by a per-boot token rendered into a `<meta name="ws-token">` tag.

## Keyboard shortcuts

- `⌘N` — new goal
- `⌘T` — new terminal tab for the active goal
- `⌘W` — close the active tab

## The Agentic-OS contract

Claude is instructed (via `CLAUDE.md`) to:

1. Read `memory/user.md` at session start.
2. Treat `projects/<slug>/plan.md` as the single source of truth and rewrite it on every meaningful step (Objective / Status / Next Actions / Decisions Log / Open Questions).
3. Drop files into `review/` and stop when human approval is required.
4. Prefer reusable procedures from `skills/*.md`.

## Scripts

| Script | Action |
| --- | --- |
| `npm run dev` | Start the full stack (Next + WS + watchers). |
| `npm run build` | Build Next.js for production. |
| `npm run start` | Run the production server. |
| `npm run typecheck` | Strict TypeScript check. |
| `npm run lint` | Run ESLint. |

## Troubleshooting

- **`claude CLI not found`**: install the CLI and ensure it's on `PATH` for the shell that started `npm run dev`.
- **`node-pty` install fails**: you need Python 3 + a C/C++ toolchain. On Debian/Ubuntu: `sudo apt install build-essential python3`. On macOS: `xcode-select --install`.
- **Terminal is blank / unresponsive**: check the status dot in the top bar — it reflects the WebSocket state.
