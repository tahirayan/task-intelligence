"use client";

import type { AgentState } from "../../shared/types";

interface TaskInputPanelProps {
  agentStatus: AgentState["status"];
  input: string;
  isRunning: boolean;
  onAnalyze: () => void;
  onCancel: () => void;
  onInputChange: (value: string) => void;
  tasksCount: number;
}

export function TaskInputPanel({
  input,
  onInputChange,
  tasksCount,
  isRunning,
  agentStatus,
  onAnalyze,
  onCancel,
}: TaskInputPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium text-sm text-zinc-200">Raw tasks input</h2>
        <p className="text-xs text-zinc-500">
          {tasksCount} line{tasksCount === 1 ? "" : "s"}
        </p>
      </div>
      <textarea
        className="min-h-[160px] resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 focus:border-zinc-500"
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="One task per line…"
        value={input}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500">
          Status:{" "}
          <span className="font-medium text-zinc-300">{agentStatus}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-xs text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            disabled={tasksCount === 0 || isRunning}
            onClick={onAnalyze}
            type="button"
          >
            Analyze
          </button>
          <button
            className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 disabled:cursor-not-allowed disabled:border-zinc-900 disabled:text-zinc-600"
            disabled={!isRunning}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
