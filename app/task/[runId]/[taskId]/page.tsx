"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ThemeToggle } from "../../../../components/theme-toggle";
import type { OrchestratorResult, PlannedTask } from "../../../../shared/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const priorityColors: Record<string, string> = {
  critical: "text-destructive border-destructive/30 bg-destructive/10",
  high: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  medium: "text-blue-500 border-blue-500/30 bg-blue-500/10",
  low: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
};

const stepTypeColors: Record<string, string> = {
  implementation: "bg-blue-500/10 text-blue-500",
  review: "bg-amber-500/10 text-amber-500",
  testing: "bg-emerald-500/10 text-emerald-500",
  deployment: "bg-purple-500/10 text-purple-500",
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ runId: string; taskId: string }>;
}) {
  const { runId, taskId } = use(params);
  const [task, setTask] = useState<PlannedTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/runs/${runId}`)
      .then((r) => {
        if (!r.ok) {
          throw new Error("Run not found");
        }
        return r.json();
      })
      .then((run: { result: OrchestratorResult | null }) => {
        const found = run.result?.tasks.find((t) => t.id === taskId) ?? null;
        if (!found) {
          throw new Error("Task not found");
        }
        setTask(found);
      })
      .catch((e: Error) => setError(e.message));
  }, [runId, taskId]);

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex shrink-0 items-center justify-between bg-zinc-950 px-6 py-2.5">
        <Link
          className="flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-100"
          href="/"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="text-zinc-400 [&_button:hover]:bg-zinc-800 [&_button:hover]:text-zinc-100 [&_button]:text-zinc-400">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-10">
        {error ? (
          <div className="mx-auto max-w-2xl">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        ) : task ? (
          <div className="mx-auto max-w-2xl space-y-8">
            {/* Title + meta */}
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-0.5 font-medium text-[11px] uppercase tracking-wide ${priorityColors[task.priority] ?? ""}`}
                >
                  {task.priority}
                </span>
                <span className="text-muted-foreground text-xs">
                  {task.category}
                </span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">
                  {task.estimatedHours}h estimated
                </span>
                <span className="text-muted-foreground text-xs">·</span>
                <span className="text-muted-foreground text-xs">
                  urgency {task.urgencyScore}
                </span>
              </div>

              <h1 className="font-semibold text-2xl tracking-tight">
                {task.title}
              </h1>
              <p className="mt-2 text-muted-foreground text-sm">
                {task.shortDescription}
              </p>
            </div>

            {/* Raw content */}
            <section>
              <h2 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                Original task
              </h2>
              <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                {task.content}
              </p>
            </section>

            {/* Execution steps */}
            {task.executionSteps.length > 0 && (
              <section>
                <h2 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Execution steps
                </h2>
                <ol className="space-y-2">
                  {task.executionSteps.map((step) => (
                    <li
                      className="flex items-start gap-3 rounded-lg border border-border bg-card p-3"
                      key={step.order}
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted font-medium text-[10px] text-muted-foreground">
                        {step.order}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{step.description}</p>
                        <span
                          className={`mt-1 inline-block rounded px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide ${stepTypeColors[step.type] ?? "bg-muted text-muted-foreground"}`}
                        >
                          {step.type}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Risks */}
            {task.risks.length > 0 && (
              <section>
                <h2 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Risks
                </h2>
                <ul className="space-y-1.5">
                  {task.risks.map((risk) => (
                    <li className="flex items-start gap-2 text-sm" key={risk}>
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive/60" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Dependencies */}
            {task.dependencies.length > 0 && (
              <section>
                <h2 className="mb-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Dependencies
                </h2>
                <div className="flex flex-wrap gap-2">
                  {task.dependencies.map((depId) => (
                    <span
                      className="rounded-full border border-border bg-muted/40 px-3 py-1 font-mono text-muted-foreground text-xs"
                      key={depId}
                    >
                      {depId.slice(0, 8)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Reasoning */}
            <section>
              <h2 className="mb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                AI reasoning
              </h2>
              <p className="text-muted-foreground text-sm">{task.reasoning}</p>
            </section>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <p className="animate-pulse text-muted-foreground text-sm">
              Loading…
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
