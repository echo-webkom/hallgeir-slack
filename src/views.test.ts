import { assertEquals, assertExists } from "@std/assert";
import {
  createApplicationModal,
  createApplicationMessage,
  updateVoteCount,
  markAsApproved,
  type ApplicationData,
} from "./views.ts";

Deno.test("createApplicationModal - creates valid modal structure", () => {
  const mockCommand = {
    trigger_id: "test-trigger-123",
    command: "/apply",
    text: "",
    user_id: "U123",
    user_name: "testuser",
    team_id: "T123",
    channel_id: "C123",
    response_url: "https://example.com",
    token: "test-token",
    team_domain: "test-team",
    channel_name: "test-channel",
    api_app_id: "A123",
  };

  const result = createApplicationModal(mockCommand);

  assertEquals(result.trigger_id, "test-trigger-123");
  assertEquals(result.view.type, "modal");
  assertEquals(result.view.callback_id, "application_modal");
  assertEquals(result.view.title.text, "Søknad om støtte");
  assertEquals(result.view.submit?.text, "Send inn");
  assertEquals(result.view.close?.text, "Avbryt");
});

Deno.test("createApplicationModal - contains all required input blocks", () => {
  const mockCommand = {
    trigger_id: "test-trigger-123",
    command: "/apply",
    text: "",
    user_id: "U123",
    user_name: "testuser",
    team_id: "T123",
    channel_id: "C123",
    response_url: "https://example.com",
    token: "test-token",
    team_domain: "test-team",
    channel_name: "test-channel",
    api_app_id: "A123",
  };

  const result = createApplicationModal(mockCommand);
  const blocks = result.view.blocks;

  assertEquals(blocks?.length, 4, "Should have 4 input blocks");

  // Check "what" block
  assertEquals(blocks?.[0].type, "input");
  assertEquals(blocks?.[0].block_id, "what");

  // Check "group_name" block
  assertEquals(blocks?.[1].type, "input");
  assertEquals(blocks?.[1].block_id, "group_name");

  // Check "amount" block
  assertEquals(blocks?.[2].type, "input");
  assertEquals(blocks?.[2].block_id, "amount");

  // Check "description" block
  assertEquals(blocks?.[3].type, "input");
  assertEquals(blocks?.[3].block_id, "description");
});

Deno.test("createApplicationModal - group select contains all groups", () => {
  const mockCommand = {
    trigger_id: "test-trigger-123",
    command: "/apply",
    text: "",
    user_id: "U123",
    user_name: "testuser",
    team_id: "T123",
    channel_id: "C123",
    response_url: "https://example.com",
    token: "test-token",
    team_domain: "test-team",
    channel_name: "test-channel",
    api_app_id: "A123",
  };

  const result = createApplicationModal(mockCommand);
  const groupBlock = result.view.blocks?.[1];
  const options = groupBlock.element?.options;

  assertEquals(options?.length, 9, "Should have 9 group options");

  // deno-lint-ignore no-explicit-any
  const groupValues = options?.map((opt: any) => opt.value);
  assertEquals(groupValues, [
    "webkom",
    "bedkom",
    "tilde",
    "gnist",
    "hyggkom",
    "consulting",
    "esc",
    "hovedstyret",
    "annet",
  ]);
});

Deno.test("createApplicationMessage - creates valid message structure", () => {
  const applicationData: ApplicationData = {
    what: "Julebord 2025",
    groupName: "Webkom",
    amount: "5000",
    description: "Midler til gjennomføring av julebord",
    applicantId: "U123456",
    applicationId: 42,
  };

  const result = createApplicationMessage(applicationData);

  assertEquals(result.text, "Ny søknad fra <@U123456>");
  assertExists(result.blocks);
  assertEquals(result.blocks.length, 6);
});

Deno.test(
  "createApplicationMessage - contains header with application name",
  () => {
    const applicationData: ApplicationData = {
      what: "Workshop",
      groupName: "Tilde",
      amount: "2000",
      description: "Security workshop",
      applicantId: "U789",
      applicationId: 1,
    };

    const result = createApplicationMessage(applicationData);
    const headerBlock = result.blocks[0];

    assertEquals(headerBlock.type, "header");
    assertEquals(headerBlock.text.type, "plain_text");
    assertEquals(headerBlock.text.text, "🎫 Søknad: Workshop");
  }
);

Deno.test(
  "createApplicationMessage - contains application details section",
  () => {
    const applicationData: ApplicationData = {
      what: "Utstyr",
      groupName: "Hyggkom",
      amount: "3500",
      description: "Kjøpe nytt utstyr til kontoret",
      applicantId: "U456",
      applicationId: 10,
    };

    const result = createApplicationMessage(applicationData);
    const detailsBlock = result.blocks[1];

    assertEquals(detailsBlock.type, "section");
    const fields = detailsBlock.fields;
    assertEquals(fields.length, 3);
    assertEquals(fields[0].text, "*Søker:*\n<@U456>");
    assertEquals(fields[1].text, "*Gruppe:*\nHyggkom");
    assertEquals(fields[2].text, "*Beløp:*\n3500 kr");
  }
);

Deno.test("createApplicationMessage - contains description section", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "This is a test description",
    applicantId: "U999",
    applicationId: 5,
  };

  const result = createApplicationMessage(applicationData);
  const descriptionBlock = result.blocks[2];

  assertEquals(descriptionBlock.type, "section");
  assertEquals(descriptionBlock.text.type, "mrkdwn");
  assertEquals(
    descriptionBlock.text.text,
    "*Beskrivelse:*\nThis is a test description"
  );
});

Deno.test("createApplicationMessage - contains initial vote count", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const result = createApplicationMessage(applicationData);
  const voteBlock = result.blocks[4];

  assertEquals(voteBlock.type, "section");
  assertEquals(voteBlock.text.text, "*Stemmer:* Ja: 0 | Nei: 0");
});

Deno.test("createApplicationMessage - contains voting buttons", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 15,
  };

  const result = createApplicationMessage(applicationData);
  const actionsBlock = result.blocks[5];

  assertEquals(actionsBlock.type, "actions");
  assertEquals(actionsBlock.block_id, "voting_actions");

  const elements = actionsBlock.elements;
  assertEquals(elements.length, 2);

  // Yes button
  assertEquals(elements[0].type, "button");
  assertEquals(elements[0].action_id, "vote_yes");
  assertEquals(elements[0].value, "15");
  assertEquals(elements[0].style, "primary");
  assertEquals(elements[0].text.text, "✅ Ja");

  // No button
  assertEquals(elements[1].type, "button");
  assertEquals(elements[1].action_id, "vote_no");
  assertEquals(elements[1].value, "15");
  assertEquals(elements[1].style, "danger");
  assertEquals(elements[1].text.text, "❌ Nei");
});

Deno.test("updateVoteCount - updates vote count correctly", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const updatedBlocks = updateVoteCount(
    originalMessage.blocks,
    3,
    1,
    ["U001", "U002", "U003"],
    ["U004"]
  );

  const voteBlock = updatedBlocks[4];
  assertEquals(voteBlock.text.text, "*Stemmer:* Ja: 3 | Nei: 1");
});

Deno.test("updateVoteCount - adds voter list when voters exist", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const updatedBlocks = updateVoteCount(
    originalMessage.blocks,
    2,
    1,
    ["U001", "U002"],
    ["U003"]
  );

  assertEquals(updatedBlocks.length, 7, "Should have 7 blocks with voter list");

  const contextBlock = updatedBlocks[6];
  assertEquals(contextBlock.type, "context");
  const elements = contextBlock.elements;
  assertEquals(elements.length, 2);
  assertEquals(elements[0].text, "✅ <@U001>, <@U002>");
  assertEquals(elements[1].text, "❌ <@U003>");
});

Deno.test("updateVoteCount - handles only yes voters", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const updatedBlocks = updateVoteCount(
    originalMessage.blocks,
    2,
    0,
    ["U001", "U002"],
    []
  );

  const contextBlock = updatedBlocks[6];
  const elements = contextBlock.elements;
  assertEquals(elements.length, 1);
  assertEquals(elements[0].text, "✅ <@U001>, <@U002>");
});

Deno.test("updateVoteCount - handles only no voters", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const updatedBlocks = updateVoteCount(
    originalMessage.blocks,
    0,
    2,
    [],
    ["U001", "U002"]
  );

  const contextBlock = updatedBlocks[6];
  const elements = contextBlock.elements;
  assertEquals(elements.length, 1);
  assertEquals(elements[0].text, "❌ <@U001>, <@U002>");
});

Deno.test("updateVoteCount - handles zero votes", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const updatedBlocks = updateVoteCount(originalMessage.blocks, 0, 0, [], []);

  assertEquals(
    updatedBlocks.length,
    6,
    "Should have 6 blocks when no voters (no context block)"
  );
  const voteBlock = updatedBlocks[4];
  assertEquals(voteBlock.text.text, "*Stemmer:* Ja: 0 | Nei: 0");
});

Deno.test("updateVoteCount - removes old voter list when updating", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);

  // First update with voters
  let updatedBlocks = updateVoteCount(
    originalMessage.blocks,
    1,
    0,
    ["U001"],
    []
  );
  assertEquals(updatedBlocks.length, 7);

  // Second update with different voters
  updatedBlocks = updateVoteCount(
    updatedBlocks,
    2,
    1,
    ["U002", "U003"],
    ["U004"]
  );
  assertEquals(updatedBlocks.length, 7, "Should still have 7 blocks");

  const contextBlock = updatedBlocks[6];
  const elements = contextBlock.elements;
  assertEquals(elements[0].text, "✅ <@U002>, <@U003>");
  assertEquals(elements[1].text, "❌ <@U004>");
});

Deno.test("markAsApproved - keeps voting buttons for re-approval", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const approvedBlocks = markAsApproved(
    originalMessage.blocks,
    4,
    1,
    ["U001", "U002", "U003", "U004"],
    ["U005"]
  );

  // Should still have the actions block (for fixing broken messages)
  const hasActionsBlock = approvedBlocks.some(
    (block) => block.type === "actions"
  );
  assertEquals(
    hasActionsBlock,
    true,
    "Should keep actions block for re-approval"
  );
});

Deno.test("markAsApproved - updates vote count", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const approvedBlocks = markAsApproved(
    originalMessage.blocks,
    5,
    2,
    ["U001", "U002", "U003", "U004", "U005"],
    ["U006", "U007"]
  );

  const voteBlock = approvedBlocks[4];
  assertEquals(voteBlock.text.text, "*Stemmer:* Ja: 5 | Nei: 2");
});

Deno.test("markAsApproved - adds voter list when not already present", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const approvedBlocks = markAsApproved(
    originalMessage.blocks,
    3,
    1,
    ["U001", "U002", "U003"],
    ["U004"]
  );

  const contextBlock = approvedBlocks.find((block) => block.type === "context");
  assertExists(contextBlock, "Should have a context block with voters");

  const elements = contextBlock.elements;
  assertEquals(elements.length, 2);
  assertEquals(elements[0].text, "✅ <@U001>, <@U002>, <@U003>");
  assertEquals(elements[1].text, "❌ <@U004>");
});

Deno.test(
  "markAsApproved - preserves existing voter list to avoid spam",
  () => {
    const applicationData: ApplicationData = {
      what: "Test",
      groupName: "Webkom",
      amount: "100",
      description: "Test",
      applicantId: "U999",
      applicationId: 5,
    };

    const originalMessage = createApplicationMessage(applicationData);

    // First, update with votes to create a voter list
    const updatedWithVotes = updateVoteCount(
      originalMessage.blocks,
      2,
      1,
      ["U001", "U002"],
      ["U003"]
    );

    const approvedBlocks = markAsApproved(
      updatedWithVotes,
      3,
      1,
      ["U001", "U002", "U004"], // Different voters passed, but should be ignored
      ["U005"]
    );

    const contextBlock = approvedBlocks.find(
      (block) => block.type === "context"
    );
    assertExists(contextBlock, "Should have preserved the context block");

    const elements = contextBlock.elements;
    assertEquals(
      elements[0].text,
      "✅ <@U001>, <@U002>",
      "Should preserve original yes voters"
    );
    assertEquals(
      elements[1].text,
      "❌ <@U003>",
      "Should preserve original no voters"
    );
  }
);

Deno.test("markAsApproved - adds approval message", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const approvedBlocks = markAsApproved(
    originalMessage.blocks,
    3,
    0,
    ["U001", "U002", "U003"],
    []
  );

  const approvalBlock = approvedBlocks[approvedBlocks.length - 1];
  assertEquals(approvalBlock.type, "section");
  assertEquals(
    approvalBlock.text.text,
    "✅ *Godkjent!* Søknaden har blitt godkjent av styret."
  );
});

Deno.test("markAsApproved - preserves original message structure", () => {
  const applicationData: ApplicationData = {
    what: "Julebord 2025",
    groupName: "Bedkom",
    amount: "10000",
    description: "Fancy julebord",
    applicantId: "U111",
    applicationId: 20,
  };

  const originalMessage = createApplicationMessage(applicationData);
  const approvedBlocks = markAsApproved(
    originalMessage.blocks,
    5,
    0,
    ["U001", "U002", "U003", "U004", "U005"],
    []
  );

  // Check that header is preserved
  const headerBlock = approvedBlocks[0];
  assertEquals(headerBlock.type, "header");
  assertEquals(headerBlock.text.text, "🎫 Søknad: Julebord 2025");

  // Check that details section is preserved
  const detailsBlock = approvedBlocks[1];
  assertEquals(detailsBlock.type, "section");
  const fields = detailsBlock.fields;
  assertEquals(fields[1].text, "*Gruppe:*\nBedkom");
  assertEquals(fields[2].text, "*Beløp:*\n10000 kr");

  // Check that description is preserved
  const descriptionBlock = approvedBlocks[2];
  assertEquals(descriptionBlock.text.text, "*Beskrivelse:*\nFancy julebord");
});

Deno.test("markAsApproved - prevents message bloat on repeated calls", () => {
  const applicationData: ApplicationData = {
    what: "Test",
    groupName: "Webkom",
    amount: "100",
    description: "Test",
    applicantId: "U999",
    applicationId: 5,
  };

  const originalMessage = createApplicationMessage(applicationData);

  // Update with votes first
  const withVotes = updateVoteCount(
    originalMessage.blocks,
    2,
    1,
    ["U001", "U002"],
    ["U003"]
  );

  // First approval
  const firstApproval = markAsApproved(
    withVotes,
    2,
    1,
    ["U001", "U002"],
    ["U003"]
  );
  const firstApprovalLength = firstApproval.length;

  // Second approval (simulate re-clicking the button)
  const secondApproval = markAsApproved(
    firstApproval,
    2,
    1,
    ["U001", "U002"],
    ["U003"]
  );
  const secondApprovalLength = secondApproval.length;

  // Third approval
  const thirdApproval = markAsApproved(
    secondApproval,
    2,
    1,
    ["U001", "U002"],
    ["U003"]
  );
  const thirdApprovalLength = thirdApproval.length;

  // Message size should not grow on repeated calls
  assertEquals(
    firstApprovalLength,
    secondApprovalLength,
    "Second approval should not grow the message"
  );
  assertEquals(
    secondApprovalLength,
    thirdApprovalLength,
    "Third approval should not grow the message"
  );

  // Verify only one approval message exists
  const approvalMessages = thirdApproval.filter(
    (block) =>
      block.type === "section" && block.text?.text?.includes("*Godkjent!*")
  );
  assertEquals(
    approvalMessages.length,
    1,
    "Should only have one approval message"
  );
});

Deno.test(
  "updateVoteCount - fixes huge broken messages with duplicate voter lists",
  () => {
    const applicationData: ApplicationData = {
      what: "Test",
      groupName: "Webkom",
      amount: "100",
      description: "Test",
      applicantId: "U999",
      applicationId: 5,
    };

    const originalMessage = createApplicationMessage(applicationData);
    const brokenBlocks = [...originalMessage.blocks];

    // Add 5 duplicate voter lists
    for (let i = 0; i < 5; i++) {
      brokenBlocks.push({
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `✅ <@U001>, <@U002>`,
          },
          {
            type: "mrkdwn",
            text: `❌ <@U003>`,
          },
        ],
      });
    }

    // Message should now be huge
    assertEquals(
      brokenBlocks.length,
      11,
      "Broken message should have 11 blocks"
    );

    // When someone presses yes or no we should fix the message
    const fixedBlocks = updateVoteCount(
      brokenBlocks,
      3,
      1,
      ["U001", "U002", "U004"],
      ["U003"]
    );

    // Should be back to normal size: 6 base blocks + 1 voter list = 7 blocks
    assertEquals(fixedBlocks.length, 7, "Fixed message should have 7 blocks");

    // Verify only one voter list exists
    const voterLists = fixedBlocks.filter((block) => block.type === "context");
    assertEquals(voterLists.length, 1, "Should only have one voter list");

    // Verify the voter list has the updated votes
    const voterList = voterLists[0];
    assertEquals(voterList.elements.length, 2);
    assertEquals(voterList.elements[0].text, "✅ <@U001>, <@U002>, <@U004>");
    assertEquals(voterList.elements[1].text, "❌ <@U003>");
  }
);
