import { db } from "../db.ts";

export type NewVote = {
  user_id: string;
  application_id: number;
  is_yes: boolean;
};

export const Vote = {
  exists: async (userId: string, applicationId: number) => {
    const result = await db
      .selectFrom("vote")
      .select("id")
      .where("user_id", "=", userId)
      .where("application_id", "=", applicationId)
      .executeTakeFirst();

    return result !== undefined;
  },

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
    isYes: boolean
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

  count: async (applicationId: number) => {
    const votes = await __findByApplicationId(applicationId);

    const yes_count = votes.filter((v) => v.is_yes).length;
    const no_count = votes.filter((v) => !v.is_yes).length;

    return { yes_count, no_count };
  },

  findManyByApplicationId: async (applicationId: number) => {
    return await __findByApplicationId(applicationId);
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

const __findByApplicationId = async (applicationId: number) => {
  const results = await db
    .selectFrom("vote")
    .selectAll()
    .where("application_id", "=", applicationId)
    .execute();

  return results;
};
