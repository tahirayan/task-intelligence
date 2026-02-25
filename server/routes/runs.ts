import type { FastifyPluginAsync } from "fastify";

export const runsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", async () => {
    return fastify.queries.listRuns.all();
  });

  fastify.delete("/", async () => {
    fastify.queries.clearRuns.run();
    return { success: true };
  });

  fastify.get<{
    Params: { id: string };
  }>("/:id", async (request, reply) => {
    const run = fastify.queries.getRunById.get(request.params.id);
    if (!run) {
      return reply.code(404).send({ error: "Run not found" });
    }

    const steps = fastify.queries.getStepLogsByRun.all(request.params.id);

    return {
      ...run,
      result: run.result ? JSON.parse(run.result) : null,
      steps,
    };
  });
};
