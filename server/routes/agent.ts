import { randomUUID } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import type { AgentSSEEvent, AgentState, RawTask } from "../../shared/types";
import { runOrchestrator } from "../agent/orchestrator";
import { getTools } from "../agent/tools";

export const agentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { tasks: string[]; feedback?: string };
  }>(
    "/run",
    {
      schema: {
        body: {
          type: "object",
          required: ["tasks"],
          properties: {
            tasks: { type: "array", items: { type: "string" }, minItems: 1 },
            feedback: { type: "string" },
          },
        },
      },
    },
    async (request, reply) => {
      const { tasks, feedback } = request.body;
      const runId = randomUUID();

      const rawTasks: RawTask[] = tasks.map((content) => ({
        id: randomUUID(),
        content,
        createdAt: new Date().toISOString(),
      }));

      fastify.queries.insertRun.run(runId, JSON.stringify(rawTasks));

      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const emit = (state: AgentState) => {
        const event: AgentSSEEvent = { type: "state-change", data: state };
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

        if ("step" in state) {
          const dbStatus =
            state.status === "step-complete" ? "complete" : state.status;
          fastify.queries.insertStepLog.run(
            randomUUID(),
            runId,
            state.step,
            "attempt" in state ? state.attempt : 1,
            dbStatus,
            JSON.stringify(rawTasks),
            null,
            "error" in state ? state.error : null,
            0
          );
        }
      };

      try {
        const startTime = Date.now();
        const result = await runOrchestrator(
          rawTasks,
          emit,
          getTools(),
          feedback
        );

        const durationMs = Date.now() - startTime;
        result.metadata.runId = runId;

        fastify.queries.updateRunResult.run(
          "completed",
          JSON.stringify(result),
          result.metadata.totalRetries,
          durationMs,
          runId
        );

        const doneEvent: AgentSSEEvent = {
          type: "done",
          data: result,
        };
        reply.raw.write(`data: ${JSON.stringify(doneEvent)}\n\n`);
      } catch (error) {
        fastify.queries.updateRunResult.run("failed", null, 0, null, runId);
        const errState: AgentState = {
          status: "error",
          message: (error as Error).message,
          recoverable: false,
        };
        const event: AgentSSEEvent = { type: "state-change", data: errState };
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      } finally {
        reply.raw.end();
      }
    }
  );
};
