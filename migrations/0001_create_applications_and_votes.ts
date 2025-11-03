// deno-lint-ignore-file no-explicit-any
import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("application")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("what", "varchar(255)", (col) => col.notNull())
    .addColumn("group_name", "varchar(100)", (col) => col.notNull())
    .addColumn("amount", "varchar(50)", (col) => col.notNull())
    .addColumn("description", "text", (col) => col.notNull())
    .addColumn("applicant_id", "varchar(50)", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .addColumn("approved_at", "timestamp")
    .execute();

  await db.schema
    .createIndex("application_applicant_id_index")
    .on("application")
    .column("applicant_id")
    .execute();

  await db.schema
    .createIndex("application_created_at_index")
    .on("application")
    .column("created_at")
    .execute();

  await db.schema
    .createTable("vote")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "varchar(50)", (col) => col.notNull())
    .addColumn(
      "application_id",
      "integer",
      (col) => col.references("application.id").onDelete("cascade").notNull(),
    )
    .addColumn("is_yes", "boolean", (col) => col.notNull())
    .addColumn(
      "created_at",
      "timestamp",
      (col) => col.defaultTo(sql`now()`).notNull(),
    )
    .execute();

  await db.schema
    .createIndex("vote_user_application_unique")
    .unique()
    .on("vote")
    .columns(["user_id", "application_id"])
    .execute();

  await db.schema
    .createIndex("vote_application_id_index")
    .on("vote")
    .column("application_id")
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable("vote").execute();
  await db.schema.dropTable("application").execute();
}
