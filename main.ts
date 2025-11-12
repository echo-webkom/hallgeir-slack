import "@std/dotenv/load";

import { App } from "@slack/bolt";
import type { BlockAction, ButtonAction } from "@slack/bolt";
import {
  createApplicationMessage,
  createApplicationModal,
  markAsApproved,
  updateVoteCount,
} from "./src/views.ts";
import { isUserInChannel } from "./src/utils.ts";
import { migrateToLatest } from "./src/db.ts";
import { Application } from "./src/repo/application.ts";
import { Vote } from "./src/repo/vote.ts";
import { loadConfig } from "./src/config.ts";
import { Logger } from "./src/logger.ts";

const APPROVE_THRESHOLD = 8;

const {
  TOKEN,
  SIGNING_SECRET,
  APP_TOKEN,
  BOARD_CHANNEL_ID,
  ECHONOMI_CHANNEL_ID,
} = loadConfig();

Logger.info("starting database migration");
await migrateToLatest();
Logger.info("database migration completed");

Logger.info("initializing Slack app", { socketMode: true });
const app = new App({
  token: TOKEN,
  signingSecret: SIGNING_SECRET,
  appToken: APP_TOKEN,
  socketMode: true,
});

app.command("/soknad", async ({ command, ack, client }) => {
  await ack();

  Logger.debug("user opened application modal", {
    userId: command.user_id,
    channelId: command.channel_id,
  });

  try {
    const modal = createApplicationModal(command);
    await client.views.open(modal);
  } catch (error) {
    Logger.error("error opening modal", error, { userId: command.user_id });
  }
});

app.view("application_modal", async ({ ack, body, view, client }) => {
  await ack();

  const values = view.state.values;
  const what = values.what.what_input.value;
  const groupName = values.group_name.group_name_input.selected_option?.value;
  const amount = values.amount.amount_input.value;
  const description = values.description.description_input.value ??
    "Ingen beskrivelse";
  const applicantId = body.user.id;

  Logger.debug("application modal submitted", {
    applicantId,
    hasWhat: !!what,
    hasGroupName: !!groupName,
    hasAmount: !!amount,
  });

  if (!what || !groupName || !amount || !description) {
    Logger.error("invalid application submission", undefined, {
      applicantId,
      missingFields: {
        what: !what,
        groupName: !groupName,
        amount: !amount,
        description: !description,
      },
    });
    return;
  }

  Logger.info("creating application", {
    what,
    group_name: groupName,
    amount,
    description,
    applicant_id: applicantId,
  });
  try {
    const application = await Application.create({
      what,
      group_name: groupName,
      amount,
      description,
      applicant_id: applicantId,
    });

    Logger.info("application created successfully", {
      applicationId: application.id,
      what,
      groupName,
      amount,
      applicantId,
    });

    const message = createApplicationMessage({
      what,
      groupName,
      amount,
      description,
      applicantId,
      applicationId: application.id,
    });

    Logger.info("posting application to channel", {
      channelId: ECHONOMI_CHANNEL_ID,
      applicationId: application.id,
    });
    await client.chat.postMessage({
      channel: ECHONOMI_CHANNEL_ID,
      ...message,
    });

    Logger.debug("notifying applicant of submission", {
      userId: body.user.id,
      applicationId: application.id,
    });
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: `Din søknad for "${what}" er sendt til styret for godkjenning! 🎉`,
    });
  } catch (error) {
    Logger.error("error creating or posting application", error, {
      what,
      group_name: groupName,
      amount,
      description,
      applicant_id: applicantId,
    });
  }
});

// Handle voting button clicks
app.action<BlockAction<ButtonAction>>(
  "vote_yes",
  async ({ body, action, ack, client }) => {
    await ack();

    Logger.debug("vote yes button clicked", {
      userId: body.user.id,
      applicationId: action.value,
    });

    const isBoardMember = await isUserInChannel(
      client,
      body.user.id,
      BOARD_CHANNEL_ID,
    );
    if (!isBoardMember) {
      const channelId = body.channel?.id;
      if (!channelId) return;

      Logger.info("non-board member attempted to vote", {
        userId: body.user.id,
        vote: "yes",
        applicationId: action.value,
      });
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        text: "Du må være medlem av styrekanalen for å stemme.",
      });
      return;
    }

    await handleVote(body, action, "yes", client);
  },
);

app.action<BlockAction<ButtonAction>>(
  "vote_no",
  async ({ body, action, ack, client }) => {
    await ack();

    Logger.debug("vote no button clicked", {
      userId: body.user.id,
      applicationId: action.value,
    });

    const isBoardMember = await isUserInChannel(
      client,
      body.user.id,
      BOARD_CHANNEL_ID,
    );
    if (!isBoardMember) {
      const channelId = body.channel?.id;
      if (!channelId) return;

      Logger.info("non-board member attempted to vote", {
        userId: body.user.id,
        vote: "no",
        applicationId: action.value,
      });
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        text: "Du må være medlem av styrekanalen for å stemme.",
      });
      return;
    }

    await handleVote(body, action, "no", client);
  },
);

async function handleVote(
  body: BlockAction<ButtonAction>,
  action: ButtonAction,
  vote: "yes" | "no",
  client: App["client"],
) {
  const messageTs = body.message?.ts;
  const channelId = body.channel?.id;
  const voterId = body.user.id;
  const applicationId = parseInt(action.value || "0");

  if (!messageTs || !channelId) {
    Logger.error("missing message TS or channel ID", undefined, {
      messageTs,
      channelId,
      voterId,
    });
    return;
  }

  if (!applicationId) {
    Logger.error("invalid application ID", undefined, {
      rawValue: action.value,
      voterId,
    });
    return;
  }

  try {
    const application = await Application.findById(applicationId);
    if (!application) {
      Logger.error("application not found", undefined, {
        applicationId,
        voterId,
        vote,
      });
      return;
    }

    Logger.info("recording vote", {
      applicationId,
      voterId,
      vote,
      what: application.what,
    });
    await Vote.upsertOrToggle(voterId, applicationId, vote === "yes");

    const votes = await Vote.findManyByApplicationId(applicationId);
    const yesVoters = votes.filter((v) => v.is_yes).map((v) => v.user_id);
    const noVoters = votes.filter((v) => !v.is_yes).map((v) => v.user_id);
    const originalMessage = body.message;

    Logger.debug("vote count updated", {
      applicationId,
      yesVotes: yesVoters.length,
      noVotes: noVoters.length,
      yesVoters,
      noVoters,
    });

    const isAboveThreshold = yesVoters.length >= APPROVE_THRESHOLD;
    const hasNoVotes = noVoters.length === 0;
    const isNotAlreadyApproved = !application.approved_at;

    // A vote should approve the application if:
    // - It has reached the approval threshold
    // - It has no "no" votes
    // - It is not already approved
    const shouldApprove = isAboveThreshold && hasNoVotes &&
      isNotAlreadyApproved;

    // Determine if the application is now approved
    const isApproved = application.approved_at !== null || shouldApprove;

    if (shouldApprove) {
      Logger.info("application approved", {
        applicationId,
        what: application.what,
        yesVotes: yesVoters.length,
        noVotes: noVoters.length,
        applicantId: application.applicant_id,
      });
      await Application.approve(applicationId);

      Logger.debug("notifying applicant of approval", {
        applicantId: application.applicant_id,
        applicationId,
      });
      await client.chat.postMessage({
        channel: application.applicant_id,
        text:
          `🎉 Gratulerer! Din søknad for "${application.what}" er godkjent!`,
      });

      Logger.debug("notifying channel of approval", {
        channelId,
        applicationId,
      });
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text:
          `✅ Søknaden er godkjent! <@${application.applicant_id}> er varslet.`,
      });
    }

    // Update message: hide buttons if approved, otherwise show vote counts
    if (isApproved) {
      const approvedBlocks = markAsApproved(
        originalMessage?.blocks,
        yesVoters.length,
        noVoters.length,
        yesVoters,
        noVoters,
      );

      Logger.debug("marking message as approved", {
        messageTs,
        channelId,
        applicationId,
      });
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        blocks: approvedBlocks,
        text: originalMessage?.text,
      });
    } else {
      const updatedBlocks = updateVoteCount(
        originalMessage?.blocks,
        yesVoters.length,
        noVoters.length,
        yesVoters,
        noVoters,
      );

      Logger.debug("updating vote counts in message", {
        messageTs,
        channelId,
        applicationId,
        yesVotes: yesVoters.length,
        noVotes: noVoters.length,
      });
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        blocks: updatedBlocks,
        text: originalMessage?.text,
      });
    }
  } catch (error) {
    Logger.error("Error handling vote", error, {
      applicationId,
      voterId,
      vote,
      messageTs,
      channelId,
    });
  }
}

await app.start();

Logger.info("Slack bot started successfully", { mode: "socket" });
