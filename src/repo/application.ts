import { db } from "../db.ts";

export type NewApplication = {
  what: string;
  group_name: string;
  amount: string;
  description: string;
  applicant_id: string;
};

export async function createApplication(data: NewApplication) {
  const result = await db
    .insertInto("application")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();

  return result;
}

export async function getApplication(id: number) {
  return await db
    .selectFrom("application")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

export async function getApplicationsByApplicant(applicantId: string) {
  return await db
    .selectFrom("application")
    .selectAll()
    .where("applicant_id", "=", applicantId)
    .orderBy("created_at", "desc")
    .execute();
}

export async function approveApplication(id: number) {
  return await db
    .updateTable("application")
    .set({ approved_at: new Date() })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}
