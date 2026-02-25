"use client";

import {
  ArrowUpDown,
  CheckCircle2,
  GitBranch,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Tags,
} from "lucide-react";
import type { AgentState, AgentStepId } from "../../shared/types";

// ─── Step metadata ──────────────────────────────────────────────────────────

const BASE_PIPELINE_STEPS: { id: AgentStepId; label: string }[] = [
  { id: "categorize", label: "Categorize" },
  { id: "prioritize", label: "Prioritize" },
  { id: "plan", label: "Plan" },
];

const REFINE_STEP: { id: AgentStepId; label: string } = {
  id: "refine",
  label: "Refine",
};

const STEP_ORDER: AgentStepId[] = [
  "categorize",
  "prioritize",
  "plan",
  "refine",
];

const STEP_ICONS = {
  categorize: Tags,
  prioritize: ArrowUpDown,
  plan: GitBranch,
  refine: Sparkles,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────────

function getCompletedSteps(
  state: AgentState,
  steps: { id: AgentStepId; label: string }[]
): Set<AgentStepId> {
  const done = new Set<AgentStepId>();

  if (state.status === "complete") {
    for (const s of steps) {
      done.add(s.id);
    }
    return done;
  }

  if (!("step" in state)) {
    return done;
  }

  const currentIndex = STEP_ORDER.indexOf(state.step);
  for (const prev of STEP_ORDER.slice(0, currentIndex)) {
    done.add(prev);
  }
  if (state.status === "step-complete") {
    done.add(state.step);
  }

  return done;
}

// ─── FloatingAgentButton ────────────────────────────────────────────────────

interface FloatingAgentButtonProps {
  isOpen: boolean;
  onToggle: () => void;
  state: AgentState;
}

export function FloatingAgentButton({
  state,
  isOpen,
  onToggle,
}: FloatingAgentButtonProps) {
  const isRunning =
    state.status === "thinking" ||
    state.status === "validating" ||
    state.status === "retrying" ||
    state.status === "step-complete";
  const isDone = state.status === "complete";

  if (!(isRunning || isDone)) {
    return null;
  }

  const isRetrying = state.status === "retrying";
  const isValidating = state.status === "validating";
  const currentStep = "step" in state ? state.step : null;

  // Pick button icon based on current state
  let ButtonIcon = CheckCircle2;
  if (isRetrying) {
    ButtonIcon = RotateCcw;
  } else if (isValidating) {
    ButtonIcon = ShieldCheck;
  } else if (currentStep && currentStep in STEP_ICONS) {
    ButtonIcon = STEP_ICONS[currentStep as keyof typeof STEP_ICONS];
  }

  const iconColor = isRetrying
    ? "text-amber-500"
    : isRunning
      ? "text-primary"
      : "text-emerald-500";

  return (
    <button
      aria-label="Toggle agent status"
      className="group relative flex h-10 w-10 items-center justify-center"
      onClick={onToggle}
      type="button"
    >
      {/* Slow outer ping – outermost glow halo */}
      {isRunning && (
        <span
          className="absolute -inset-2 animate-ping rounded-full border border-primary/10"
          style={{ animationDuration: "2.8s" }}
        />
      )}

      {/* Counter-rotating outer ring */}
      {isRunning && (
        <span
          className="absolute -inset-0.5 rounded-full border-[1.5px] border-transparent border-t-primary/40 border-r-primary/20"
          style={{ animation: "spin 2.8s linear infinite reverse" }}
        />
      )}

      {/* Main fast spinning ring */}
      {isRunning && (
        <span
          className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
          style={{ animation: "spin 1.3s linear infinite" }}
        />
      )}

      {/* Done: static emerald ring */}
      {isDone && !isRunning && (
        <span className="absolute inset-0 rounded-full border border-emerald-500/40" />
      )}

      {/* Core */}
      <span
        className={[
          "relative flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200",
          isOpen ? "scale-90" : "scale-100",
          isRetrying
            ? "border-amber-500/40 bg-amber-500/10"
            : isRunning
              ? "border-primary/30 bg-primary/10 group-hover:bg-primary/15"
              : "border-emerald-500/30 bg-emerald-500/10 group-hover:bg-emerald-500/15",
        ].join(" ")}
      >
        <ButtonIcon
          className={`h-3.5 w-3.5 transition-colors ${iconColor}`}
          style={
            isRetrying
              ? { animation: "spin 0.7s linear infinite" }
              : isRunning
                ? { animation: "pulse 1.6s ease-in-out infinite" }
                : undefined
          }
        />
      </span>
    </button>
  );
}

// ─── AgentStatusPanel ────────────────────────────────────────────────────────

interface AgentStatusPanelProps {
  isRefine?: boolean;
  state: AgentState;
}

export function AgentStatusPanel({ state, isRefine }: AgentStatusPanelProps) {
  const pipelineSteps = isRefine
    ? [...BASE_PIPELINE_STEPS, REFINE_STEP]
    : BASE_PIPELINE_STEPS;
  const completedSteps = getCompletedSteps(state, pipelineSteps);
  const currentStep = "step" in state ? state.step : null;
  const isDone = state.status === "complete";
  const isRunning =
    state.status === "thinking" ||
    state.status === "validating" ||
    state.status === "retrying" ||
    state.status === "step-complete";

  return (
    <div className="fade-in slide-in-from-top-1 mt-2 animate-in overflow-hidden rounded-lg border border-border bg-card duration-150">
      <div className="p-3">
        <p className="mb-3 font-medium text-[10px] text-muted-foreground uppercase tracking-wider">
          Agent pipeline
        </p>

        <ol className="space-y-2.5">
          {pipelineSteps.map(({ id: stepId, label }) => {
            const StepIcon = STEP_ICONS[stepId];
            const isDoneStep = completedSteps.has(stepId);
            const isActive = currentStep === stepId && isRunning;
            const isPending = !(isDoneStep || isActive);

            return (
              <li className="flex items-center gap-2.5" key={stepId}>
                {/* Step icon bubble */}
                <span
                  className={[
                    "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors duration-300",
                    isDoneStep
                      ? "bg-emerald-500/15"
                      : isActive
                        ? "bg-primary/15"
                        : "bg-muted",
                  ].join(" ")}
                >
                  {isActive && (
                    <span
                      className="absolute inset-0 animate-ping rounded-full bg-primary/25"
                      style={{ animationDuration: "1.4s" }}
                    />
                  )}
                  <StepIcon
                    className={[
                      "h-3 w-3 transition-colors duration-300",
                      isDoneStep
                        ? "text-emerald-500"
                        : isActive
                          ? "text-primary"
                          : "text-muted-foreground/30",
                    ].join(" ")}
                  />
                </span>

                {/* Label */}
                <span
                  className={[
                    "flex-1 text-xs transition-colors duration-300",
                    isPending ? "text-muted-foreground/40" : "text-foreground",
                  ].join(" ")}
                >
                  {label}
                </span>

                {/* Right status */}
                <span className="flex items-center text-[10px] text-muted-foreground">
                  {isDoneStep ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  ) : isActive ? (
                    <span
                      className={[
                        "animate-pulse",
                        state.status === "retrying"
                          ? "text-amber-500"
                          : "text-primary",
                      ].join(" ")}
                    >
                      {state.status === "retrying"
                        ? `retry ${"attempt" in state ? state.attempt : ""}`
                        : state.status}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        {isDone && (
          <div className="mt-3 flex items-center gap-1.5 border-border border-t pt-2.5 text-emerald-500 text-xs">
            <CheckCircle2 className="h-3 w-3" />
            Run complete
          </div>
        )}

        {state.status === "error" && (
          <div className="mt-3 border-border border-t pt-2.5 text-destructive text-xs">
            {state.message}
          </div>
        )}
      </div>
    </div>
  );
}
