import { db } from "./pg.ts";

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

// Vote repository

export type NewVote = {
  user_id: string;
  application_id: number;
  is_yes: boolean;
};

export async function voteExists(userId: string, applicationId: number) {
  const result = await db
    .selectFrom("vote")
    .select("id")
    .where("user_id", "=", userId)
    .where("application_id", "=", applicationId)
    .executeTakeFirst();

  return result !== undefined;
}

export async function getVote(userId: string, applicationId: number) {
  return await db
    .selectFrom("vote")
    .selectAll()
    .where("user_id", "=", userId)
    .where("application_id", "=", applicationId)
    .executeTakeFirst();
}

export async function createVote(data: NewVote) {
  const result = await db
    .insertInto("vote")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();

  return result;
}

export async function updateVote(
  userId: string,
  applicationId: number,
  isYes: boolean,
) {
  return await db
    .updateTable("vote")
    .set({ is_yes: isYes })
    .where("user_id", "=", userId)
    .where("application_id", "=", applicationId)
    .returningAll()
    .executeTakeFirst();
}

export async function deleteVote(
  userId: string,
  applicationId: number,
): Promise<void> {
  await db
    .deleteFrom("vote")
    .where("user_id", "=", userId)
    .where("application_id", "=", applicationId)
    .execute();
}

export async function getVotesForApplication(applicationId: number) {
  return await db
    .selectFrom("vote")
    .selectAll()
    .where("application_id", "=", applicationId)
    .execute();
}

export type VoteCount = {
  yes_count: number;
  no_count: number;
};

export async function getVoteCount(applicationId: number): Promise<VoteCount> {
  const votes = await getVotesForApplication(applicationId);

  const yes_count = votes.filter((v) => v.is_yes).length;
  const no_count = votes.filter((v) => !v.is_yes).length;

  return { yes_count, no_count };
}

export async function upsertVote(data: NewVote) {
  const existing = await getVote(data.user_id, data.application_id);

  if (existing) {
    const updated = await updateVote(
      data.user_id,
      data.application_id,
      data.is_yes,
    );
    return updated!;
  } else {
    return await createVote(data);
  }
}
