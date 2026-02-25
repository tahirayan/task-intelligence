"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentSSEEvent,
  AgentState,
  OrchestratorResult,
} from "../shared/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function useAgent() {
  const [state, setState] = useState<AgentState>({ status: "idle" });
  const [results, setResults] = useState<OrchestratorResult[]>([]);
  const [lastTasks, setLastTasks] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const isRefineRef = useRef(false);

  // Restore all completed runs on mount so results survive a page reload
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const runsRes = await fetch(`${API_BASE}/runs`, { cache: "no-store" });
        if (!runsRes.ok) {
          return;
        }

        const runs: { id: string; status: string }[] = await runsRes.json();
        const completed = runs.filter((r) => r.status === "completed");
        if (completed.length === 0) {
          return;
        }

        const details = await Promise.all(
          completed.map(async (run) => {
            const res = await fetch(`${API_BASE}/runs/${run.id}`);
            if (!res.ok) {
              return null;
            }
            const data: { result: OrchestratorResult | null } =
              await res.json();
            return data.result;
          })
        );

        const valid = details.filter(
          (r): r is OrchestratorResult => r !== null
        );
        if (valid.length > 0 && !cancelled) {
          setResults(valid);
          setState({ status: "complete", result: valid.at(-1) });
          // Restore lastTasks from the most recent run's task titles so the
          // Refine button stays enabled after a page reload.
          setLastTasks(valid.at(-1).tasks.map((t) => t.title));
        }
      } catch {
        // no prior runs — silently ignore
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const run = useCallback(async (tasks: string[], feedback?: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    isRefineRef.current = !!feedback;
    setLastTasks(tasks);
    // Don't clear existing results — keep the board visible while the new run
    // processes. The new result will be appended when the run completes.
    setState({
      status: "thinking",
      step: "categorize",
      attempt: 1,
      reasoning: "",
    });

    try {
      const res = await fetch(`${API_BASE}/agent/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, feedback }),
        signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        setState({
          status: "error",
          message: `Server error ${res.status}: ${text}`,
          recoverable: true,
        });
        return;
      }

      if (!res.body) {
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.startsWith("data: ")) {
            continue;
          }
          const event: AgentSSEEvent = JSON.parse(chunk.slice(6));

          if (event.type === "state-change") {
            setState(event.data);
          } else if (event.type === "done") {
            if (isRefineRef.current) {
              // Refine replaces the last result so the board shows the updated plan
              setResults((prev) =>
                prev.length > 0
                  ? [...prev.slice(0, -1), event.data]
                  : [event.data]
              );
            } else {
              // Fresh run — append so multiple analyses accumulate on the board
              setResults((prev) => [...prev, event.data]);
            }
            setState({ status: "complete", result: event.data });
          }
        }
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") {
        return; // user cancelled — state was already set to idle by cancel()
      }
      setState({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Unexpected error — check server",
        recoverable: true,
      });
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  return { state, results, lastTasks, run, cancel };
}
