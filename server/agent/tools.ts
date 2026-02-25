import type { AgentTool, ToolResult } from "../../shared/types";

export const urlPingTool: AgentTool = {
  name: "check_url",
  description:
    "Check if a URL/endpoint is reachable. Use when a task mentions a URL, API, or endpoint.",
  parameters: {
    url: { type: "string", description: "The URL to check" },
  },
  async execute(input: unknown): Promise<ToolResult> {
    const { url } = input as { url: string };
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      return {
        success: true,
        data: {
          status: res.status,
          reachable: res.ok,
          responseTimeMs: Date.now() - start,
        },
      };
    } catch {
      return {
        success: false,
        data: null,
        error: "URL unreachable or timed out",
      };
    }
  },
};

export function getTools(): AgentTool[] {
  return [urlPingTool];
}
