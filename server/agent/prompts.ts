import type {
  CategorizedTask,
  PlannedTask,
  PrioritizedTask,
  RawTask,
} from "../../shared/types";

export function buildFullPlanPrompt(input: {
  rawTasks: RawTask[];
  retryContext?: string;
}): string {
  const base = `You are a senior engineering manager. In a single pass, analyze each task and produce ALL fields for a complete execution plan.

For EACH task output:
- id: preserve from input
- content: preserve from input
- createdAt: preserve from input
- category: "feature" | "bugfix" | "infrastructure" | "research" | "design" | "documentation"
- confidence: number 0–1
- reasoning: one sentence explaining the category
- priority: "critical" | "high" | "medium" | "low"
- urgencyScore: number 1–10 (higher = more urgent)
- dependencies: string[] of task IDs this task depends on (from the input list only)
- title: concise 3–7 word human-readable title
- shortDescription: 1–2 sentences summarising what the task involves and its goal
- estimatedHours: realistic total hours (number)
- executionSteps: ordered steps, each: { order: number, description: string, type: "implementation" | "review" | "testing" | "deployment" }
- risks: string[] of key risks

Return ONLY valid JSON: Array<PlannedTask> — no extra text, no markdown fences.

Tasks:
${JSON.stringify(input.rawTasks, null, 2)}`;

  if (input.retryContext) {
    return `${base}\n\nPrevious attempt failed validation:\n${input.retryContext}\n\nReturn a fully corrected JSON array with ALL tasks.`;
  }

  return base;
}

export function buildCategorizePrompt(input: {
  rawTasks: RawTask[];
  retryContext?: string;
}): string {
  const base = `
You are a senior engineering manager. Categorize each raw task into a structured JSON array.

Return ONLY valid JSON matching:
Array<CategorizedTask> where CategorizedTask = {
  id: string;
  content: string;
  createdAt: string;
  category: "feature" | "bugfix" | "infrastructure" | "research" | "design" | "documentation";
  confidence: number; // between 0 and 1
  reasoning: string;
}

Tasks:
${JSON.stringify(input.rawTasks, null, 2)}
`;

  if (input.retryContext) {
    return `${base}

Previous attempt failed validation:
${input.retryContext}

Return a fully corrected JSON array with ALL tasks, not partial.`;
  }

  return base;
}

export function buildPrioritizePrompt(input: {
  tasks: CategorizedTask[];
  retryContext?: string;
}): string {
  const base = `
You are planning execution order for a software team.

Take the categorized tasks and assign:
- priority: "critical" | "high" | "medium" | "low"
- urgencyScore: number (higher means more urgent)
- dependencies: string[] of task IDs this task depends on.

Return ONLY valid JSON: Array<PrioritizedTask> with the same tasks, enriched with these fields.

Tasks:
${JSON.stringify(input.tasks, null, 2)}
`;

  if (input.retryContext) {
    return `${base}

Previous attempt failed validation:
${input.retryContext}

Return a fully corrected JSON array with ALL tasks, not partial.`;
  }

  return base;
}

export function buildPlanPrompt(input: {
  tasks: PrioritizedTask[];
  retryContext?: string;
}): string {
  const base = `
You are creating a concrete execution plan for the following prioritized tasks.

For each task, produce:
- title: a concise 3-7 word human-readable title for the task
- shortDescription: 1-2 sentences summarising what the task involves and its goal
- executionSteps: ordered steps with type "implementation" | "review" | "testing" | "deployment"
- estimatedHours: total hours required (number)
- risks: string[] listing key risks.

Return ONLY valid JSON: Array<PlannedTask> with all original task fields plus these plan fields.

Tasks:
${JSON.stringify(input.tasks, null, 2)}
`;

  if (input.retryContext) {
    return `${base}

Previous attempt failed validation:
${input.retryContext}

Return a fully corrected JSON array with ALL tasks, not partial.`;
  }

  return base;
}

export function buildRefinePrompt(input: {
  tasks: PlannedTask[];
  feedback: string;
  retryContext?: string;
}): string {
  const base = `
You are refining an existing task plan based on user feedback.

User feedback:
${input.feedback}

You may adjust:
- title
- shortDescription
- priorities
- estimatedHours
- executionSteps
- risks

Return ONLY valid JSON: Array<PlannedTask> (same shape as before, preserving title and shortDescription unless feedback changes them).

Current plan:
${JSON.stringify(input.tasks, null, 2)}
`;

  if (input.retryContext) {
    return `${base}

Previous attempt failed validation:
${input.retryContext}

Return a fully corrected JSON array with ALL tasks, not partial.`;
  }

  return base;
}
