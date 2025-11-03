import "@std/dotenv/load";

import { App } from "@slack/bolt";
import type { BlockAction, ButtonAction } from "@slack/bolt";
import { loadConfig } from "./config.ts";
import {
  createApplicationMessage,
  createApplicationModal,
  markAsApproved,
  updateVoteCount,
} from "./views.ts";
import { isUserInChannel } from "./utils.ts";
import { migrateToLatest } from "./pg.ts";
import {
  approveApplication,
  createApplication,
  getApplication,
  getVoteCount,
  getVotesForApplication,
  upsertVote,
} from "./repo.ts";

const {
  TOKEN,
  SIGNING_SECRET,
  APP_TOKEN,
  BOARD_CHANNEL_ID,
  ECHONOMI_CHANNEL_ID,
} = loadConfig();

await migrateToLatest();

const app = new App({
  token: TOKEN,
  signingSecret: SIGNING_SECRET,
  appToken: APP_TOKEN,
  socketMode: true,
});

app.command("/soknad", async ({ command, ack, client }) => {
  await ack();

  try {
    const modal = createApplicationModal(command);
    await client.views.open(modal);
  } catch (error) {
    console.error("Error opening modal:", error);
  }
});

app.view("application_modal", async ({ ack, body, view, client }) => {
  await ack();

  const values = view.state.values;
  const what = values.what.what_input.value;
  const groupName = values.group_name.group_name_input.selected_option?.value;
  const amount = values.amount.amount_input.value;
  const description =
    values.description.description_input.value ?? "Ingen beskrivelse";
  const applicantId = body.user.id;

  if (!what || !groupName || !amount || !description) {
    console.error("All fields are required");
    return;
  }

  console.log("Creating application:", {
    what,
    group_name: groupName,
    amount,
    description,
    applicant_id: applicantId,
  });
  try {
    const application = await createApplication({
      what,
      group_name: groupName,
      amount,
      description,
      applicant_id: applicantId,
    });

    const message = createApplicationMessage({
      what,
      groupName,
      amount,
      description,
      applicantId,
      applicationId: application.id,
    });

    console.log("Posting application to channel:", ECHONOMI_CHANNEL_ID);
    await client.chat.postMessage({
      channel: ECHONOMI_CHANNEL_ID,
      ...message,
    });

    console.log("Posting ephemeral message to user:", body.user.id);
    await client.chat.postEphemeral({
      channel: body.user.id,
      user: body.user.id,
      text: `Din søknad for "${what}" er sendt til styret for godkjenning! 🎉`,
    });
  } catch (error) {
    console.error("Creating application failed:", {
      what,
      group_name: groupName,
      amount,
      description,
      applicant_id: applicantId,
    });
    console.error("Error posting application:", error);
  }
});

// Handle voting button clicks
app.action<BlockAction<ButtonAction>>(
  "vote_yes",
  async ({ body, action, ack, client }) => {
    await ack();

    const isBoardMember = await isUserInChannel(
      client,
      body.user.id,
      BOARD_CHANNEL_ID
    );
    if (!isBoardMember) {
      const channelId = body.channel?.id;
      if (!channelId) return;

      console.log("User is not a board member:", body.user.id);
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        text: "Du må være medlem av styrekanalen for å stemme.",
      });
      return;
    }

    await handleVote(body, action, "yes", client);
  }
);

app.action<BlockAction<ButtonAction>>(
  "vote_no",
  async ({ body, action, ack, client }) => {
    await ack();

    const isBoardMember = await isUserInChannel(
      client,
      body.user.id,
      BOARD_CHANNEL_ID
    );
    if (!isBoardMember) {
      const channelId = body.channel?.id;
      if (!channelId) return;

      console.log("User is not a board member:", body.user.id);
      await client.chat.postEphemeral({
        channel: channelId,
        user: body.user.id,
        text: "Du må være medlem av styrekanalen for å stemme.",
      });
      return;
    }

    await handleVote(body, action, "no", client);
  }
);

async function handleVote(
  body: BlockAction<ButtonAction>,
  action: ButtonAction,
  vote: "yes" | "no",
  client: App["client"]
) {
  const messageTs = body.message?.ts;
  const channelId = body.channel?.id;
  const voterId = body.user.id;
  const applicationId = parseInt(action.value || "0");

  if (!messageTs || !channelId) {
    console.error("Missing message TS or channel ID");
    return;
  }

  if (!applicationId) {
    console.error("Missing application ID");
    return;
  }

  try {
    // Get the application from DB
    const application = await getApplication(applicationId);
    if (!application) {
      console.error("Application not found:", applicationId);
      return;
    }

    console.log(
      `Recording vote for application ${applicationId} by user ${voterId}: ${vote}`
    );
    await upsertVote({
      user_id: voterId,
      application_id: applicationId,
      is_yes: vote === "yes",
    });

    const { yes_count, no_count } = await getVoteCount(applicationId);
    const votes = await getVotesForApplication(applicationId);
    const yesVoters = votes.filter((v) => v.is_yes).map((v) => v.user_id);
    const noVoters = votes.filter((v) => !v.is_yes).map((v) => v.user_id);
    const originalMessage = body.message;

    // Check if application reaches 8+ yes votes
    const shouldApprove = yes_count >= 8 && !application.approved_at;
    const isApproved = application.approved_at !== null || shouldApprove;

    if (shouldApprove) {
      console.log("Approving application:", applicationId);
      await approveApplication(applicationId);

      console.log("Notifying applicant:", application.applicant_id);
      await client.chat.postMessage({
        channel: application.applicant_id,
        text: `🎉 Gratulerer! Din søknad for "${application.what}" er godkjent!`,
      });

      console.log("Notifying channel:", channelId);
      await client.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `✅ Søknaden er godkjent! <@${application.applicant_id}> er varslet.`,
      });
    }

    // Update message: hide buttons if approved, otherwise show vote counts
    if (isApproved) {
      const approvedBlocks = markAsApproved(
        originalMessage?.blocks,
        yes_count,
        no_count,
        yesVoters,
        noVoters
      );

      console.log("Marking message as approved:", messageTs);
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        blocks: approvedBlocks,
        text: originalMessage?.text,
      });
    } else {
      const updatedBlocks = updateVoteCount(
        originalMessage?.blocks,
        yes_count,
        no_count,
        yesVoters,
        noVoters
      );

      console.log("Updating vote counts in message:", messageTs);
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        blocks: updatedBlocks,
        text: originalMessage?.text,
      });
    }
  } catch (error) {
    console.error("Error handling vote:", error);
  }
}

await app.start();

console.log(`⚡️ Slack bot is running in Socket Mode!`);
