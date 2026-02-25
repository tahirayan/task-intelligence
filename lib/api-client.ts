const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export async function fetchRuns() {
  const res = await fetch(`${API_BASE}/runs`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch runs");
  }
  return res.json();
}

export async function fetchRun(id: string) {
  const res = await fetch(`${API_BASE}/runs/${id}`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch run");
  }
  return res.json();
}

export async function startAgentStream(
  tasks: string[],
  feedback?: string
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${API_BASE}/agent/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks, feedback }),
  });

  if (!(res.ok && res.body)) {
    throw new Error("Failed to start agent stream");
  }

  return res.body;
}
