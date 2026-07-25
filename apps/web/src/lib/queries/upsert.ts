import { getTableColumns, type SQL, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Mirror the Drizzle `casing: "snake_case"` config (see `drizzle.config.ts`).
 * Columns are declared without explicit DB names, so `Column.name` holds the
 * camelCase property key and the snake_case mapping is applied only at
 * query-build time — it is *not* available on the column object. The `excluded.`
 * pseudo-row in an upsert needs the real DB column name, so convert it here.
 */
function toSnakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);
}

/**
 * Build an `onConflictDoUpdate` set object from a table definition, pointing
 * each named column at its `excluded` (incoming) value, so the column list is
 * never hand-written twice. See the Drizzle upsert guide.
 */
export function excludedColumns<TTable extends PgTable>(
  table: TTable,
  columns: readonly (keyof TTable["_"]["columns"] & string)[],
): Record<string, SQL> {
  const cols = getTableColumns(table);
  const set: Record<string, SQL> = {};
  for (const column of columns) {
    set[column] = sql.raw(`excluded.${toSnakeCase(cols[column].name)}`);
  }
  return set;
}
