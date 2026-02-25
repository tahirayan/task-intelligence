# Aichestr

AI-powered task intelligence dashboard. Paste raw tasks and get them automatically categorized, prioritized, and broken down into actionable plans — powered by Gemini.

## Features

- **One-shot AI analysis** — A single Gemini API call produces category, priority, urgency score, estimated hours, execution steps, and risk assessment for every task
- **Parallel batching** — Large task lists are split into batches of 8 and processed in parallel
- **Live pipeline indicator** — Animated floating button shows real-time agent state (thinking → validating → complete) with step-cycling UI
- **Kanban board** — Tasks are organized into Critical / High / Medium / Low priority columns
- **Persistent results** — Completed runs survive page reloads; multiple runs accumulate on the board
- **Task detail view** — Each task has a dedicated detail page with execution steps and risk breakdown
- **Dark / light theme** — Toggle via the header

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS v4 |
| Backend | Fastify 5 (Bun runtime) |
| AI | Google Gemini (`gemini-3-flash-preview`) via `@google/generative-ai` |
| Database | SQLite via `bun:sqlite` |
| Validation | Zod v4 |
| Styling | shadcn/ui components, Biome + Ultracite linting |

## Project Structure

```
aichestr/
├── app/                    # Next.js App Router pages
│   ├── page.tsx            # Main dashboard
│   └── task/[runId]/[id]/  # Task detail page
├── components/
│   └── agent/
│       ├── agent-status-button.tsx  # Floating status button + pipeline panel
│       └── task-board.tsx           # Kanban board
├── hooks/
│   └── use-agent.ts        # SSE client + run persistence
├── server/
│   ├── agent/
│   │   ├── orchestrator.ts # Core agent pipeline
│   │   ├── prompts.ts      # Gemini prompt builders
│   │   └── validator.ts    # Zod schemas
│   ├── gemini/
│   │   └── client.ts       # Streaming Gemini client
│   ├── plugins/
│   │   └── db.ts           # SQLite Fastify plugin
│   ├── routes/
│   │   ├── agent.ts        # POST /api/agent/run (SSE)
│   │   └── runs.ts         # GET /api/runs, GET /api/runs/:id
│   └── server.ts           # Fastify entrypoint
└── shared/
    └── types.ts            # Types shared between frontend and backend
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- A [Google AI Studio](https://aistudio.google.com) API key with Gemini access

### Install

```bash
bun install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required — Gemini API key
GEMINI_API_KEY=your_key_here

# Optional — defaults shown
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_PORT=3001

# Optional — SQLite database path
# Defaults to /tmp/aichestr-tasks.db to avoid iCloud Drive conflicts on macOS
DB_PATH=/tmp/aichestr-tasks.db
```

> **macOS note:** If your project lives in `~/Documents` or `~/Desktop` (iCloud Drive), keep `DB_PATH` in `/tmp` or another non-synced location. WAL-mode SQLite files conflict with iCloud's file coordination and cause `SQLITE_IOERR_VNODE` errors.

### Run

Start both servers in separate terminals:

```bash
# Terminal 1 — Next.js frontend (port 3000)
bun run dev

# Terminal 2 — Fastify API (port 3001)
bun run server
```

Then open [http://localhost:3000](http://localhost:3000).

## How It Works

1. Paste one task per line into the textarea and click **Analyze**
2. The frontend opens an SSE connection to `POST /api/agent/run`
3. The orchestrator splits tasks into batches of 8 and calls Gemini in parallel
4. Each batch returns fully-planned tasks in a single prompt (category + priority + plan)
5. State events stream back over SSE and drive the animated pipeline indicator
6. When complete, tasks appear on the kanban board; the run is persisted to SQLite
7. On the next page load, all completed runs are restored from the API

## Agent Loop Architecture

- **Entry point**: `runOrchestrator` receives raw tasks, an SSE state emitter, optional tools, and optional user feedback. It measures total duration and retries, delegates to `executePlan` for the main planning pass, and optionally runs a `refine` pass when feedback is present.
- **Batching & parallelism**: Tasks are split into fixed-size batches of 8. For each attempt, every batch is converted into a single "full plan" Gemini prompt, and all batches are processed in parallel with `Promise.all` to maximize throughput.
- **Streaming state model**: On each attempt the orchestrator emits `thinking` states with a forward-only step cycle (`categorize → prioritize → plan`) on a timer, followed by a `validating` state. Once tasks validate, it emits `step-complete` events for each logical step so the frontend can drive the pipeline indicator and kanban updates.
- **Validation & retries**: Each batch response is validated against a strict Zod schema (`plannedTasksSchema`). Validation errors are aggregated into a human-readable string, fed back into the next prompt as retry context, and the loop retries up to 3 times before emitting a recoverable error.
- **Tool-augmented calls**: When tools are provided, the first Gemini call is made with tools enabled. If the model issues function calls, the orchestrator executes those tools, injects their structured results back into a follow-up prompt, and validates that second response instead of trusting the tool call output directly.
- **Optional refinement pass**: If the user edits the plan or provides feedback, a second `executeStep("refine")` pass runs over the full planned task set, reusing the same validation and retry pattern to adjust estimates, risks, or execution steps.
- **Result shaping**: `buildResult` computes summary statistics (total estimated hours, critical-path task IDs, and category breakdowns) plus timing metadata. The HTTP layer attaches a `runId` and persists the result to SQLite.

## Design Trade-offs

- **Single multi-output LLM pass per batch**: The loop asks Gemini to categorize, prioritize, and plan each task in one shot, rather than in three separate phases. This keeps latency and cost low at the expense of less introspection into intermediate representations.
- **Forward-only UI step cycle**: The step indicator intentionally advances in one direction on a fixed timer instead of mirroring internal sub-phases exactly. This favors a smooth, predictable UX over perfectly accurate internal state reporting.
- **Fixed batch size (8)**: Batching by task count is simpler to reason about than token-aware batching. It can underutilize context on very short tasks or be conservative on very long ones, but keeps the mental model straightforward for this dashboard use case.
- **Strict JSON validation + retries**: Every model response must pass Zod validation, and failures trigger retry prompts that include structured error context. This increases latency and token use but greatly improves reliability of the stored plans.
- **SQLite + Bun Fastify monolith**: A single-process Bun server with SQLite is easy to run locally and on small servers with zero extra infrastructure. It is not optimized for high-concurrency, multi-tenant deployments but is ideal for a focused internal tool.
- **SSE over WebSockets**: Server-Sent Events provide a simple, one-way streaming channel that maps cleanly to "pipeline status" updates without the complexity of full-duplex WebSockets, at the cost of not supporting mid-run bidirectional control.

## Build Time (Author Notes)

- **Initial estimate**: ~6 hours for an end-to-end MVP (agent loop, basic dashboard, and persistence).
- **Actual time spent**: ~12 hours including validation/retry wiring, UI polish, and documentation.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent/run` | Start a run; streams SSE events |
| `GET` | `/api/runs` | List all runs |
| `GET` | `/api/runs/:id` | Get a single run with its result |
| `GET` | `/api/health` | Health check |

## Code Quality

```bash
# Check for lint / format issues
bun run check

# Auto-fix issues
bun run fix
```

This project uses [Ultracite](https://ultracite.dev) (Biome preset) for zero-config linting and formatting.
