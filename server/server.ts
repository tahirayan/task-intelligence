import { tmpdir } from "node:os";
import { join } from "node:path";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { dbPlugin } from "./plugins/db";
import { agentRoutes } from "./routes/agent";
import { runsRoutes } from "./routes/runs";

// Default DB to /tmp to avoid SQLITE_IOERR_VNODE on iCloud-synced paths.
// Override with DB_PATH env var to use a persistent location.
const DEFAULT_DB_PATH = join(tmpdir(), "aichestr-tasks.db");

async function main() {
  const app = Fastify({
    logger: {
      level: "info",
    },
  });

  await app.register(cors, {
    // Allow the Next.js dev server (and generally any origin) during development.
    origin: true,
  });

  await app.register(dbPlugin, {
    path: process.env.DB_PATH ?? DEFAULT_DB_PATH,
  });

  await app.register(agentRoutes, { prefix: "/api/agent" });
  await app.register(runsRoutes, { prefix: "/api/runs" });

  app.get("/api/health", async () => {
    return { status: "ok" };
  });

  try {
    const port = Number(process.env.API_PORT ?? 3001);
    await app.listen({ port });
    app.log.info(`API listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();
