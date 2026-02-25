"use client";

import { useRef, useState } from "react";
import {
  AgentStatusPanel,
  FloatingAgentButton,
} from "../components/agent/agent-status-button";
import { TaskBoard } from "../components/agent/task-board";
import { ThemeToggle } from "../components/theme-toggle";
import { useAgent } from "../hooks/use-agent";
import type { PlannedTask } from "../shared/types";

export default function Home() {
  const [input, setInput] = useState("");
  const [statusOpen, setStatusOpen] = useState(false);
  const { state, results, lastTasks, run, cancel } = useAgent();
  const [isRefine, setIsRefine] = useState(false);
  const [editingTask, setEditingTask] = useState<PlannedTask | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const savedInputRef = useRef("");

  function handleEditTask(task: PlannedTask) {
    savedInputRef.current = input;
    setEditingTask(task);
    setInput(`For task "${task.title}": `);
    inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    });
  }

  function clearRefineMode() {
    setEditingTask(null);
    setInput(savedInputRef.current);
  }

  const tasks = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const isRunning =
    state.status !== "idle" &&
    state.status !== "complete" &&
    state.status !== "error";

  const showStatusButton = state.status !== "idle";

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      {/* Thin dark header */}
      <header className="flex shrink-0 items-center justify-between bg-zinc-950 px-6 py-2.5">
        <span className="font-medium text-xs text-zinc-400 tracking-wide">
          Aichestr
        </span>
        <div className="text-zinc-400 [&_button:hover]:bg-zinc-800 [&_button:hover]:text-zinc-100 [&_button]:text-zinc-400">
          <ThemeToggle />
        </div>
      </header>

      {/* Scrollable main */}
      <main className="flex-1 overflow-y-auto">
        {/* Centered input section */}
        <section className="flex flex-col items-center px-6 py-16 text-center">
          <h1 className="font-semibold text-4xl tracking-tight">
            Task Intelligence Dashboard
          </h1>
          <p className="mt-2 max-w-sm text-muted-foreground text-sm">
            Paste raw tasks below — the agent will categorize, prioritize, and
            plan them.
          </p>

          <div className="mt-8 w-full max-w-xl text-left">
            {/* Refining mode badge */}
            {editingTask && (
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary">
                  Refining: {editingTask.title}
                </span>
                <button
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={clearRefineMode}
                  type="button"
                >
                  ✕ clear
                </button>
              </div>
            )}

            {/* Textarea with floating button anchored to its right edge */}
            <div className="relative">
              <textarea
                className={[
                  "w-full resize-none rounded-lg border bg-background px-4 py-3 text-foreground text-sm outline-none transition-colors placeholder:text-muted-foreground",
                  editingTask
                    ? "border-primary/40 focus:border-primary"
                    : "border-border focus:border-ring",
                ].join(" ")}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  editingTask
                    ? "Describe what to adjust for this task…"
                    : "One task per line…"
                }
                ref={inputRef}
                rows={5}
                value={input}
              />

              {showStatusButton && (
                <div className="absolute top-1/2 left-[calc(100%+14px)] -translate-y-1/2">
                  <FloatingAgentButton
                    isOpen={statusOpen}
                    onToggle={() => setStatusOpen((v) => !v)}
                    state={state}
                  />
                </div>
              )}
            </div>

            {/* Status panel — non-floating, in normal flow below textarea */}
            {statusOpen && showStatusButton && (
              <AgentStatusPanel isRefine={isRefine} state={state} />
            )}

            {/* Controls row */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                {!editingTask && tasks.length > 0
                  ? `${tasks.length} task${tasks.length === 1 ? "" : "s"}`
                  : null}
              </span>
              <div className="flex gap-2">
                <button
                  className="rounded-full border border-border px-4 py-1.5 text-muted-foreground text-xs transition-colors hover:border-foreground/30 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!isRunning}
                  onClick={() => {
                    cancel();
                    setStatusOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>

                {editingTask ? (
                  <button
                    className="rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground text-xs transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!input.trim() || isRunning}
                    onClick={() => {
                      setIsRefine(true);
                      setStatusOpen(true);
                      const feedback = input;
                      clearRefineMode();
                      run(lastTasks, feedback);
                    }}
                    type="button"
                  >
                    Refine
                  </button>
                ) : (
                  <button
                    className="rounded-full bg-primary px-4 py-1.5 font-medium text-primary-foreground text-xs transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={tasks.length === 0 || isRunning}
                    onClick={() => {
                      setIsRefine(false);
                      run(tasks);
                    }}
                    type="button"
                  >
                    Analyze
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Kanban board */}
        {results.length > 0 && (
          <section className="border-border border-t px-6 pt-8 pb-8">
            <TaskBoard onEditTask={handleEditTask} results={results} />
          </section>
        )}

        {/* Error banner */}
        {state.status === "error" && (
          <div className="mx-auto max-w-xl px-6 pb-4">
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-destructive text-sm">
              {state.message}
            </p>
          </div>
        )}

        {/* Running placeholder when no result yet */}
        {isRunning && results.length === 0 && (
          <div className="flex justify-center pb-12">
            <p className="animate-pulse text-muted-foreground text-sm">
              Processing…
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
