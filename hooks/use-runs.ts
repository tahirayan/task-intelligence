"use client";

import { useEffect, useState } from "react";
import type { RunRow } from "../shared/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export function useRuns() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${API_BASE}/runs`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to fetch runs");
        }
        const data: RunRow[] = await res.json();
        if (!cancelled) {
          setRuns(data);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { runs, loading, error };
}
