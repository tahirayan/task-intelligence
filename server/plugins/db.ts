import { Database } from "bun:sqlite";
import fp from "fastify-plugin";
import { createQueries } from "../db/queries";
import { migrate } from "../db/schema";

declare module "fastify" {
  interface FastifyInstance {
    db: Database;
    queries: ReturnType<typeof createQueries>;
  }
}

export const dbPlugin = fp(async (fastify, opts: { path: string }) => {
  const db = new Database(opts.path, { create: true });

  // DELETE journal mode avoids .db-shm / .db-wal files that iCloud Drive
  // intercepts on macOS, causing SQLITE_IOERR_VNODE errors with WAL mode.
  db.run("PRAGMA journal_mode = DELETE;");
  db.run("PRAGMA foreign_keys = ON;");

  migrate(db);

  const queries = createQueries(db);

  fastify.decorate("db", db);
  fastify.decorate("queries", queries);

  fastify.addHook("onClose", () => {
    db.close(false);
  });
});
