import type {
  AgentState,
  AgentStepId,
  AgentTool,
  OrchestratorResult,
  PlannedTask,
  RawTask,
  StepResult,
  TaskCategory,
} from "../../shared/types";
import { callGemini, callGeminiWithTools } from "../gemini/client";
import { buildFullPlanPrompt, buildRefinePrompt } from "./prompts";
import { plannedTasksSchema } from "./validator";

const MAX_RETRIES = 3;

// Advance through the 3 step indicators every N ms while the API call runs.
// Steps advance forward only — once "plan" is reached we stay there.
const STEP_CYCLE_MS = 5000;
const PIPELINE_STEPS: AgentStepId[] = ["categorize", "prioritize", "plan"];

// Split large task lists into parallel batches so each Gemini call stays small.
const BATCH_SIZE = 8;

type StateEmitter = (state: AgentState) => void;

export async function runOrchestrator(
  rawTasks: RawTask[],
  emit: StateEmitter,
  tools: AgentTool[],
  userFeedback?: string
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  let totalRetries = 0;

  const planned = await executePlan(rawTasks, emit, tools, () => {
    totalRetries++;
  });

  let finalTasks = planned;
  if (userFeedback) {
    finalTasks = await executeStep<PlannedTask[]>({
      stepId: "refine",
      input: { tasks: planned, feedback: userFeedback },
      promptBuilder: (input, retryContext) =>
        buildRefinePrompt({
          tasks: input.tasks as PlannedTask[],
          feedback: input.feedback as string,
          retryContext,
        }),
      schema: plannedTasksSchema,
      emit,
      onRetry: () => {
        totalRetries++;
      },
    });
  }

  const result = buildResult(finalTasks, totalRetries, startTime);
  emit({ status: "complete", result });
  return result;
}

// Runs the full plan. For large task sets, splits into BATCH_SIZE batches and
// runs them in parallel so each Gemini call stays small. Advances the UI step
// indicators forward only — never cycles back to the start.
async function executePlan(
  rawTasks: RawTask[],
  emit: StateEmitter,
  tools: AgentTool[],
  onRetry: () => void
): Promise<PlannedTask[]> {
  // Build batches
  const batches: RawTask[][] = [];
  for (let i = 0; i < rawTasks.length; i += BATCH_SIZE) {
    batches.push(rawTasks.slice(i, i + BATCH_SIZE));
  }

  let attempt = 0;
  let lastError: string | null = null;

  while (attempt < MAX_RETRIES) {
    attempt++;

    // Advance through step indicators — forward only, stop at "plan"
    let stepIndex = 0;
    emit({
      status: "thinking",
      step: PIPELINE_STEPS[0],
      attempt,
      reasoning: "Analyzing tasks…",
    });

    const cycleTimer = setInterval(() => {
      if (stepIndex < PIPELINE_STEPS.length - 1) {
        stepIndex++;
        emit({
          status: "thinking",
          step: PIPELINE_STEPS[stepIndex],
          attempt,
          reasoning: "Analyzing tasks…",
        });
      }
    }, STEP_CYCLE_MS);

    const allTasks: PlannedTask[] = [];
    let batchError: string | null = null;

    try {
      const retryContext = lastError
        ? formatRetryContext(lastError, attempt)
        : undefined;

      // Run all batches in parallel
      const batchResults = await Promise.all(
        batches.map(async (batch) => {
          const prompt = buildFullPlanPrompt({ rawTasks: batch, retryContext });

          if (tools.length > 0) {
            const response = await callGeminiWithTools(prompt, tools);
            if (response.functionCalls.length > 0) {
              const toolResults = await executeToolCalls(
                response.functionCalls as {
                  name: string;
                  args: Record<string, unknown>;
                }[],
                tools
              );
              const followUp = `${prompt}\n\nTOOL RESULTS:\n${JSON.stringify(toolResults, null, 2)}`;
              return (await callGemini(followUp)).json;
            }
            return response.json;
          }

          return (await callGemini(prompt)).json;
        })
      );

      // Validate each batch and collect tasks
      const errors: string[] = [];
      for (const batchJson of batchResults) {
        const parsed = plannedTasksSchema.safeParse(batchJson);
        if (parsed.success) {
          allTasks.push(...parsed.data);
        } else {
          errors.push(
            parsed.error.issues
              .map((i) => `Path: ${i.path.join(".")} — ${i.message}`)
              .join("\n")
          );
        }
      }

      if (errors.length > 0) {
        batchError = errors.join("\n");
      }
    } finally {
      clearInterval(cycleTimer);
    }

    const currentStep = PIPELINE_STEPS[stepIndex];
    emit({ status: "validating", step: currentStep, attempt });

    if (!batchError && allTasks.length > 0) {
      for (const step of PIPELINE_STEPS) {
        emit({
          status: "step-complete",
          step,
          result: {
            step,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tasks: allTasks as any,
          } as StepResult,
        });
      }
      return allTasks;
    }

    lastError = batchError ?? "No tasks returned from batches";
    onRetry();
    emit({
      status: "retrying",
      step: currentStep,
      attempt,
      error: lastError,
    });
  }

  emit({
    status: "error",
    message: `Plan failed after ${MAX_RETRIES} attempts`,
    recoverable: true,
  });
  throw new Error("Plan exhausted retries");
}

interface SafeSchema<T> {
  safeParse(data: unknown):
    | { success: true; data: T }
    | {
        success: false;
        error: { issues: { path: PropertyKey[]; message: string }[] };
      };
}

interface StepConfig<T> {
  emit: StateEmitter;
  input: Record<string, unknown>;
  onRetry?: (attempt: number, error: string) => void;
  promptBuilder: (
    input: Record<string, unknown>,
    retryContext?: string
  ) => string;
  schema: SafeSchema<T>;
  stepId: AgentStepId;
  tools?: AgentTool[];
}

async function executeStep<T>(config: StepConfig<T>): Promise<T> {
  let attempt = 0;
  let lastError: string | null = null;

  while (attempt < MAX_RETRIES) {
    attempt++;

    config.emit({
      status: "thinking",
      step: config.stepId,
      attempt,
      reasoning: `Analyzing: ${config.stepId} (attempt ${attempt})…`,
    });

    const prompt = config.promptBuilder(
      config.input,
      lastError ? formatRetryContext(lastError, attempt) : undefined
    );

    let json: unknown;
    if (config.tools?.length) {
      const response = await callGeminiWithTools(prompt, config.tools);

      if (response.functionCalls.length > 0) {
        const toolResults = await executeToolCalls(
          response.functionCalls as {
            name: string;
            args: Record<string, unknown>;
          }[],
          config.tools
        );
        const followUp = `${prompt}\n\nTOOL RESULTS:\n${JSON.stringify(toolResults, null, 2)}`;
        const followUpResponse = await callGemini(followUp);
        json = followUpResponse.json;
      } else {
        json = response.json;
      }
    } else {
      const response = await callGemini(prompt);
      json = response.json;
    }

    config.emit({ status: "validating", step: config.stepId, attempt });

    const parseResult = config.schema.safeParse(json);

    if (parseResult.success) {
      config.emit({
        status: "step-complete",
        step: config.stepId,
        result: {
          step: config.stepId,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks: parseResult.data as any,
        } as StepResult,
      });
      return parseResult.data;
    }

    const errorMsg = parseResult.error.issues
      .map((issue) => `Path: ${issue.path.join(".")} — ${issue.message}`)
      .join("\n");
    lastError = errorMsg;

    config.onRetry?.(attempt, errorMsg);
    config.emit({
      status: "retrying",
      step: config.stepId,
      attempt,
      error: errorMsg,
    });
  }

  config.emit({
    status: "error",
    message: `Step "${config.stepId}" failed after ${MAX_RETRIES} attempts`,
    recoverable: true,
  });
  throw new Error(`Step "${config.stepId}" exhausted retries`);
}

async function executeToolCalls(
  calls: { name: string; args: Record<string, unknown> }[],
  tools: AgentTool[]
) {
  return Promise.all(
    calls.map(async (call) => {
      const tool = tools.find((t) => t.name === call.name);
      if (!tool) {
        return { name: call.name, error: "Tool not found" };
      }

      return { name: call.name, result: await tool.execute(call.args) };
    })
  );
}

function formatRetryContext(zodError: string, attempt: number): string {
  return `
PREVIOUS ATTEMPT FAILED VALIDATION (attempt ${attempt}/${MAX_RETRIES}).
ERRORS:
${zodError}
Fix ONLY the errors. Return complete corrected JSON.`;
}

function buildResult(
  tasks: PlannedTask[],
  totalRetries: number,
  startTime: number
): OrchestratorResult {
  const categoryBreakdown = tasks.reduce(
    (acc, t) => {
      // eslint-disable-next-line no-param-reassign
      acc[t.category] = (acc[t.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<TaskCategory, number>
  );

  return {
    tasks,
    summary: {
      totalEstimatedHours: tasks.reduce((sum, t) => sum + t.estimatedHours, 0),
      criticalPath: tasks
        .filter((t) => t.priority === "critical")
        .map((t) => t.id),
      categoryBreakdown,
    },
    metadata: {
      runId: "", // set by the route after the fact
      totalSteps: 1,
      totalRetries,
      totalDurationMs: Date.now() - startTime,
    },
  };
}
