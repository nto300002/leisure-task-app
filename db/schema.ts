import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
export const accounts = sqliteTable("accounts", {
  owner: text("owner").primaryKey(),
  version: integer("version").notNull(),
  token: text("token").notNull(),
  payload: text("payload").notNull(),
});
const entity = (name: string) =>
  sqliteTable(
    name,
    {
      owner: text("owner").notNull(),
      id: text("id").notNull(),
      payload: text("payload").notNull(),
    },
    (t) => [
      primaryKey({ columns: [t.owner, t.id] }),
      ...(name === "executions"
        ? [
            uniqueIndex("one_running_per_owner")
              .on(t.owner)
              .where(sql`json_extract(${t.payload}, '$.status') = 'running'`),
          ]
        : []),
      ...(name === "tasks"
        ? [
            uniqueIndex("one_active_catalog_copy")
              .on(
                t.owner,
                sql`json_extract(${t.payload}, '$.source_catalog_id')`,
              )
              .where(
                sql`json_extract(${t.payload}, '$.deleted_at') IS NULL AND json_extract(${t.payload}, '$.source_catalog_id') IS NOT NULL`,
              ),
          ]
        : []),
    ],
  );
export const interests = entity("interests");
export const goals = entity("goals");
export const tasks = entity("tasks");
export const task_goals = entity("task_goals");
export const executions = entity("executions");
export const execution_goals = entity("execution_goals");
export const activity_states = entity("activity_states");
export const catalog_snapshots = entity("catalog_snapshots");
export const tombstones = entity("tombstones");

export const runtime_chunks = entity("runtime_chunks");
