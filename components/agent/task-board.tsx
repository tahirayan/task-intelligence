import Link from "next/link";
import type {
  OrchestratorResult,
  PlannedTask,
  TaskPriority,
} from "../../shared/types";

const PRIORITIES: TaskPriority[] = ["critical", "high", "medium", "low"];

const priorityConfig: Record<
  TaskPriority,
  { label: string; dot: string; text: string }
> = {
  critical: {
    label: "Critical",
    dot: "bg-destructive",
    text: "text-destructive",
  },
  high: {
    label: "High",
    dot: "bg-amber-500",
    text: "text-amber-500",
  },
  medium: {
    label: "Medium",
    dot: "bg-blue-500",
    text: "text-blue-500",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    text: "text-emerald-500",
  },
};

interface TaskEntry {
  runId: string;
  task: PlannedTask;
}

interface TaskBoardProps {
  onEditTask: (task: PlannedTask) => void;
  results: OrchestratorResult[];
}

export function TaskBoard({ results, onEditTask }: TaskBoardProps) {
  // Flatten tasks from all runs, pairing each with its runId
  const allTasks: TaskEntry[] = results.flatMap((r) =>
    r.tasks.map((task) => ({ task, runId: r.metadata.runId }))
  );

  const totalHours = results.reduce(
    (sum, r) => sum + r.summary.totalEstimatedHours,
    0
  );
  const totalRetries = results.reduce(
    (sum, r) => sum + r.metadata.totalRetries,
    0
  );

  return (
    <div>
      <div className="mb-6 flex items-center gap-5 text-muted-foreground text-xs">
        <span>
          <span className="font-medium text-foreground">{allTasks.length}</span>{" "}
          tasks
        </span>
        <span>
          <span className="font-medium text-foreground">{totalHours}h</span>{" "}
          estimated
        </span>
        {totalRetries > 0 && (
          <span>
            <span className="font-medium text-foreground">{totalRetries}</span>{" "}
            retries
          </span>
        )}
        {results.length > 1 && (
          <span className="text-muted-foreground/60">
            {results.length} runs
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRIORITIES.map((priority) => {
          const { label, dot, text } = priorityConfig[priority];
          const entries = allTasks.filter(
            ({ task }) => task.priority === priority
          );

          return (
            <div className="flex flex-col gap-2" key={priority}>
              <div className="flex items-center gap-2 pb-1">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span
                  className={`font-medium text-xs uppercase tracking-wide ${text}`}
                >
                  {label}
                </span>
                <span className="ml-auto text-muted-foreground text-xs">
                  {entries.length}
                </span>
              </div>

              {entries.length === 0 ? (
                <div className="rounded-lg border border-border border-dashed p-4 text-center text-muted-foreground text-xs">
                  None
                </div>
              ) : (
                entries.map(({ task, runId }) => (
                  <TaskCard
                    key={task.id}
                    onEdit={onEditTask}
                    runId={runId}
                    task={task}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  runId,
  onEdit,
}: {
  task: PlannedTask;
  runId: string;
  onEdit: (task: PlannedTask) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <div>
        <p className="font-medium text-card-foreground text-xs leading-snug">
          {task.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
          {task.shortDescription}
        </p>
      </div>
      <div className="flex gap-1.5">
        <button
          className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          onClick={() => onEdit(task)}
          type="button"
        >
          Edit
        </button>
        <Link
          className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          href={`/task/${runId}/${task.id}`}
        >
          Detail
        </Link>
      </div>
    </div>
  );
}
