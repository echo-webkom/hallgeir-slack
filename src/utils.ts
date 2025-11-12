import type { App } from "@slack/bolt";
import { Logger } from "./logger.ts";

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
    Logger.error("error checking if user is in channel", error, {
      userId,
      channelId,
    });
    return false;
  }
}
