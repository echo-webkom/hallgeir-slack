import * as path from "node:path";
// deno-types="npm:@types/pg"
import pg from "pg";
import { promises as fs } from "node:fs";
import {
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import { DB } from "./types.ts";
import { Logger } from "./logger.ts";

const { Pool } = pg;

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: Deno.env.get("DATABASE_URL")!,
    }),
  }),
});

export async function migrateToLatest() {
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(Deno.cwd(), "migrations"),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      Logger.info("Migration executed successfully", {
        migrationName: it.migrationName,
      });
    } else if (it.status === "Error") {
      Logger.error("Failed to execute migration", undefined, {
        migrationName: it.migrationName,
      });
    }
  });

  if (error) {
    Logger.error("Failed to migrate", error);
    Deno.exit(1);
  }
}
