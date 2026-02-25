import type { Database } from "bun:sqlite";
import type { RunRow, StepLogRow } from "../../shared/types";

// Prepared query helpers for runs and step logs using bun:sqlite.

export function createQueries(db: Database) {
  const insertRun = db.query("INSERT INTO runs (id, raw_input) VALUES (?, ?)");

  const updateRunResult = db.query(
    `UPDATE runs
     SET status = ?, result = ?, total_retries = ?, duration_ms = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  );

  const getRunById = db.query<RunRow, string>(
    "SELECT * FROM runs WHERE id = ?"
  );

  const listRuns = db.query<RunRow, []>(
    `SELECT id, status, total_retries, duration_ms, created_at
     FROM runs ORDER BY created_at DESC LIMIT 50`
  );

  const insertStepLog = db.query(
    `INSERT INTO step_logs (id, run_id, step, attempt, status, input_snapshot, output_snapshot, error, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const getStepLogsByRun = db.query<StepLogRow, string>(
    "SELECT * FROM step_logs WHERE run_id = ? ORDER BY created_at ASC"
  );

  const clearRuns = db.query("DELETE FROM runs");

  return {
    insertRun,
    updateRunResult,
    getRunById,
    listRuns,
    insertStepLog,
    getStepLogsByRun,
    clearRuns,
  };
}
