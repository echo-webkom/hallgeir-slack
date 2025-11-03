import type { App } from "@slack/bolt";

export async function isUserInChannel(
  client: App["client"],
  userId: string,
  channelId: string,
): Promise<boolean> {
  try {
    const result = await client.conversations.members({
      channel: channelId,
    });

    return result.members?.includes(userId) ?? false;
  } catch (error) {
    console.error(
      `Error checking if user ${userId} is in channel ${channelId}:`,
      error,
    );
    return false;
  }
}
