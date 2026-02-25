// Shared types between frontend (Next.js) and backend (Fastify).
// Based on Architecture Plan v2.

// ─── Agent Step Identity ───────────────────────────────────────
export type AgentStepId = "categorize" | "prioritize" | "plan" | "refine";

// ─── Agent State Machine (Discriminated Union) ─────────────────
export type AgentState =
  | { status: "idle" }
  | {
      status: "thinking";
      step: AgentStepId;
      attempt: number;
      reasoning: string;
    }
  | { status: "validating"; step: AgentStepId; attempt: number }
  | { status: "retrying"; step: AgentStepId; attempt: number; error: string }
  | { status: "step-complete"; step: AgentStepId; result: StepResult }
  | { status: "complete"; result: OrchestratorResult }
  | { status: "error"; message: string; recoverable: boolean };

// ─── Task Domain Types ─────────────────────────────────────────
export type TaskCategory =
  | "feature"
  | "bugfix"
  | "infrastructure"
  | "research"
  | "design"
  | "documentation";

export type TaskPriority = "critical" | "high" | "medium" | "low";

export interface RawTask {
  content: string;
  createdAt: string; // ISO string (serializable)
  id: string;
}

export interface CategorizedTask extends RawTask {
  category: TaskCategory;
  confidence: number;
  reasoning: string;
}

export interface PrioritizedTask extends CategorizedTask {
  dependencies: string[];
  priority: TaskPriority;
  urgencyScore: number;
}

export interface PlannedTask extends PrioritizedTask {
  estimatedHours: number;
  executionSteps: ExecutionStep[];
  risks: string[];
  shortDescription: string;
  title: string;
}

export interface ExecutionStep {
  description: string;
  order: number;
  type: "implementation" | "review" | "testing" | "deployment";
}

// ─── Orchestrator Result ───────────────────────────────────────
export interface OrchestratorResult {
  metadata: {
    runId: string;
    totalSteps: number;
    totalRetries: number;
    totalDurationMs: number;
  };
  summary: {
    totalEstimatedHours: number;
    criticalPath: string[];
    categoryBreakdown: Record<TaskCategory, number>;
  };
  tasks: PlannedTask[];
}

export type StepResult =
  | { step: "categorize"; tasks: CategorizedTask[] }
  | { step: "prioritize"; tasks: PrioritizedTask[] }
  | { step: "plan"; tasks: PlannedTask[] }
  | { step: "refine"; tasks: PlannedTask[]; changesSummary: string };

// ─── Agentic Tool Types ────────────────────────────────────────
export interface AgentTool {
  description: string;
  execute: (input: unknown) => Promise<ToolResult>;
  name: string;
  parameters: Record<string, unknown>; // JSON Schema for Gemini function calling
}

export interface ToolResult {
  data: unknown;
  error?: string;
  success: boolean;
}

// ─── SSE Event Types ───────────────────────────────────────────
export type AgentSSEEvent =
  | { type: "state-change"; data: AgentState }
  | { type: "thinking-token"; data: string }
  | { type: "done"; data: OrchestratorResult };

// ─── Database Row Types ────────────────────────────────────────
export interface RunRow {
  created_at: string;
  duration_ms: number | null;
  feedback: string | null;
  id: string;
  raw_input: string; // JSON stringified RawTask[]
  result: string | null; // JSON stringified OrchestratorResult
  status: "running" | "completed" | "failed";
  total_retries: number;
  updated_at: string;
}

export interface StepLogRow {
  attempt: number;
  created_at: string;
  duration_ms: number;
  error: string | null;
  id: string;
  input_snapshot: string; // JSON — what was sent to LLM
  output_snapshot: string | null; // JSON — what came back
  run_id: string;
  status: "thinking" | "validating" | "retrying" | "complete" | "failed";
  step: AgentStepId;
}
