import { db } from "../db.ts";

export type NewApplication = {
  what: string;
  group_name: string;
  amount: string;
  description: string;
  applicant_id: string;
};

export const Application = {
  create: async (data: NewApplication) => {
    const result = await db
      .insertInto("application")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  },

  findById: async (id: number) => {
    const result = await db
      .selectFrom("application")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return result;
  },

  findByApplicantId: async (applicantId: string) => {
    const results = await db
      .selectFrom("application")
      .selectAll()
      .where("applicant_id", "=", applicantId)
      .orderBy("created_at", "desc")
      .execute();

    return results;
  },

  approve: async (id: number) => {
    const result = await db
      .updateTable("application")
      .set({ approved_at: new Date() })
      .where("id", "=", id)
      .returningAll()
      .executeTakeFirst();

    return result;
  },
};
