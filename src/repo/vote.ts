import { db } from "../db.ts";

export type NewVote = {
  user_id: string;
  application_id: number;
  is_yes: boolean;
};

export const Vote = {
  find: async (userId: string, applicationId: number) => {
    const result = await db
      .selectFrom("vote")
      .selectAll()
      .where("user_id", "=", userId)
      .where("application_id", "=", applicationId)
      .executeTakeFirst();

    return result;
  },

  create: async (data: NewVote) => {
    const result = await db
      .insertInto("vote")
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  },

  // Upsert a vote: create if not exists, otherwise update
  // If it is the same vote as before, remove it (toggle)
  upsertOrToggle: async (
    userId: string,
    applicationId: number,
    isYes: boolean,
  ) => {
    const existingVote = await Vote.find(userId, applicationId);
    if (existingVote && existingVote.is_yes === isYes) {
      return await Vote.delete(userId, applicationId);
    } else if (existingVote) {
      return await Vote.update(userId, applicationId, isYes);
    } else {
      return await Vote.create({
        user_id: userId,
        application_id: applicationId,
        is_yes: isYes,
      });
    }
  },

  update: async (userId: string, applicationId: number, isYes: boolean) => {
    const result = await db
      .updateTable("vote")
      .set({ is_yes: isYes })
      .where("user_id", "=", userId)
      .where("application_id", "=", applicationId)
      .returningAll()
      .executeTakeFirst();

    return result;
  },

  findManyByApplicationId: async (applicationId: number) => {
    const results = await db
      .selectFrom("vote")
      .selectAll()
      .where("application_id", "=", applicationId)
      .execute();

    return results;
  },

  delete: async (userId: string, applicationId: number) => {
    const result = await db
      .deleteFrom("vote")
      .where("user_id", "=", userId)
      .where("application_id", "=", applicationId)
      .returningAll()
      .executeTakeFirst();

    return result;
  },
};
