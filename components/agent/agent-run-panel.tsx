"use client";

import type { AgentState, OrchestratorResult } from "../../shared/types";

interface AgentRunPanelProps {
  result: OrchestratorResult | null;
  state: AgentState;
}

export function AgentRunPanel({ state, result }: AgentRunPanelProps) {
  const statusBulletClass =
    state.status === "idle"
      ? "bg-zinc-600"
      : state.status === "error"
        ? "bg-red-500"
        : state.status === "complete"
          ? "bg-emerald-500"
          : "bg-amber-400 animate-pulse";

  const statusText =
    state.status === "thinking" || state.status === "validating"
      ? `Step: ${
          "step" in state ? state.step : "categorize"
        } (attempt ${"attempt" in state ? state.attempt : 1})`
      : state.status === "retrying"
        ? `Retrying ${state.step} (attempt ${state.attempt})`
        : state.status === "error"
          ? state.message
          : state.status === "complete"
            ? "Run complete"
            : "Idle";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-4">
      <h2 className="font-medium text-sm text-zinc-200">Agent run</h2>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <span className={`h-2 w-2 rounded-full ${statusBulletClass}`} />
        <span>{statusText}</span>
      </div>

      <div className="h-px w-full bg-zinc-800" />

      {result ? (
        <div className="flex flex-col gap-2 overflow-auto text-xs">
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span>
              Total tasks:{" "}
              <span className="font-medium text-zinc-200">
                {result.tasks.length}
              </span>
            </span>
            <span>
              Est. hours:{" "}
              <span className="font-medium text-zinc-200">
                {result.summary.totalEstimatedHours}
              </span>
            </span>
            <span>
              Retries:{" "}
              <span className="font-medium text-zinc-200">
                {result.metadata.totalRetries}
              </span>
            </span>
          </div>

          <div className="grid gap-2">
            {result.tasks.map((task) => (
              <div
                className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
                key={task.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-xs text-zinc-100">
                    {task.content}
                  </p>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 uppercase tracking-wide">
                    {task.priority}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Category: {task.category} • Est: {task.estimatedHours}h
                </p>
                {task.executionSteps.length > 0 && (
                  <ol className="mt-2 space-y-1 text-xs text-zinc-400">
                    {task.executionSteps.slice(0, 3).map((step) => (
                      <li key={step.order}>
                        <span className="text-zinc-500">{step.order}.</span>{" "}
                        {step.description}{" "}
                        <span className="text-zinc-500 uppercase">
                          ({step.type})
                        </span>
                      </li>
                    ))}
                    {task.executionSteps.length > 3 && (
                      <li className="text-zinc-500">…</li>
                    )}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          No result yet. Paste some tasks and click Analyze to start a run.
        </p>
      )}
    </div>
  );
}
