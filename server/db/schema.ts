import type { Database } from "bun:sqlite";

// SQLite schema and migration helper using bun:sqlite.
// Creates `runs` and `step_logs` tables plus supporting indexes.

export function migrate(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'running'
        CHECK(status IN ('running', 'completed', 'failed')),
      raw_input TEXT NOT NULL,
      result TEXT,
      feedback TEXT,
      total_retries INTEGER NOT NULL DEFAULT 0,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS step_logs (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
      step TEXT NOT NULL CHECK(step IN ('categorize','prioritize','plan','refine')),
      attempt INTEGER NOT NULL,
      status TEXT NOT NULL
        CHECK(status IN ('thinking','validating','retrying','complete','failed')),
      input_snapshot TEXT NOT NULL,
      output_snapshot TEXT,
      error TEXT,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_step_logs_run ON step_logs(run_id);
    CREATE INDEX IF NOT EXISTS idx_runs_status ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_created ON runs(created_at DESC);
  `);
}
