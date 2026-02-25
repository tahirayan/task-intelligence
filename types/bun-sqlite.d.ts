declare module "bun:sqlite" {
  // Minimal typing for bun:sqlite Database used in this project.
  export class Database {
    constructor(filename?: string, options?: unknown);
    run(sql: string, ...params: unknown[]): unknown;
    query<ReturnType = any, ParamsType = any>(
      sql: string
    ): {
      all: (...params: ParamsType[]) => ReturnType[];
      get: (...params: ParamsType[]) => ReturnType | null;
      run: (...params: ParamsType[]) => {
        lastInsertRowid: number;
        changes: number;
      };
    };
    close(throwOnError?: boolean): void;
  }
}
