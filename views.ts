import type { App, SlashCommand } from "@slack/bolt";

type Block = NonNullable<
  App["client"]["chat"]["postMessage"]["arguments"]["blocks"]
>[number];

const groups = [
  { name: "Webkom", value: "webkom" },
  { name: "Bedkom", value: "bedkom" },
  { name: "Tilde", value: "tilde" },
  { name: "Gnist", value: "gnist" },
  { name: "Hyggkom", value: "hyggkom" },
  { name: "echo Consulting", value: "consulting" },
  { name: "ESC", value: "esc" },
  { name: "Hovedstyret", value: "hovedstyret" },
  { name: "Annet", value: "annet" },
];

type ViewsOpenArguments = App["client"]["views"]["open"]["arguments"];

export function createApplicationModal(
  command: SlashCommand,
): ViewsOpenArguments {
  return {
    trigger_id: command.trigger_id,
    view: {
      type: "modal",
      callback_id: "application_modal",
      title: {
        type: "plain_text",
        text: "Søknad om støtte",
      },
      submit: {
        type: "plain_text",
        text: "Send inn",
      },
      close: {
        type: "plain_text",
        text: "Avbryt",
      },
      blocks: [
        {
          type: "input",
          block_id: "what",
          element: {
            type: "plain_text_input",
            action_id: "what_input",
            placeholder: {
              type: "plain_text",
              text: "F.eks. Julebord 2025, workshop, utstyr",
            },
          },
          label: {
            type: "plain_text",
            text: "Hva gjelder søknaden?",
          },
        },
        {
          type: "input",
          block_id: "group_name",
          element: {
            type: "static_select",
            action_id: "group_name_input",
            placeholder: {
              type: "plain_text",
              text: "Velg gruppe",
            },
            options: groups.map((group) => ({
              text: {
                type: "plain_text",
                text: group.name,
              },
              value: group.value,
            })),
          },
          label: {
            type: "plain_text",
            text: "Gruppe",
          },
        },
        {
          type: "input",
          block_id: "amount",
          element: {
            type: "plain_text_input",
            action_id: "amount_input",
            placeholder: {
              type: "plain_text",
              text: "F.eks. 500",
            },
          },
          label: {
            type: "plain_text",
            text: "Beløp (kr)",
          },
        },
        {
          type: "input",
          block_id: "description",
          element: {
            type: "plain_text_input",
            action_id: "description_input",
            multiline: true,
            placeholder: {
              type: "plain_text",
              text: "Beskriv hva pengene skal brukes til...",
            },
          },
          label: {
            type: "plain_text",
            text: "Beskrivelse",
          },
        },
      ],
    },
  };
}

export type ApplicationData = {
  what: string;
  groupName: string;
  amount: string;
  description: string;
  applicantId: string;
  applicationId: number;
};

export function createApplicationMessage({
  what,
  groupName,
  amount,
  description,
  applicantId,
  applicationId,
}: ApplicationData) {
  return {
    text: `Ny søknad fra <@${applicantId}>`,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `🎫 Søknad: ${what}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Søker:*\n<@${applicantId}>`,
          },
          {
            type: "mrkdwn",
            text: `*Gruppe:*\n${groupName}`,
          },
          {
            type: "mrkdwn",
            text: `*Beløp:*\n${amount} kr`,
          },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Beskrivelse:*\n${description}`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Stemmer:* Ja: 0 | Nei: 0",
        },
      },
      {
        type: "actions",
        block_id: "voting_actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "✅ Ja",
            },
            style: "primary" as const,
            action_id: "vote_yes",
            value: String(applicationId),
          },
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "❌ Nei",
            },
            style: "danger" as const,
            action_id: "vote_no",
            value: String(applicationId),
          },
        ],
      },
    ] as Array<Block>,
  };
}

export function updateVoteCount(
  blocks: Array<Block>,
  yesCount: number,
  noCount: number,
): Array<Block> {
  const updatedBlocks = [...blocks];
  updatedBlocks[4] = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Stemmer:* Ja: ${yesCount} | Nei: ${noCount}`,
    },
  };
  return updatedBlocks;
}

export function markAsApproved(
  blocks: Array<Block>,
  yesCount: number,
  noCount: number,
): Array<Block> {
  const updatedBlocks = blocks.slice(0, -1);

  updatedBlocks[4] = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Stemmer:* Ja: ${yesCount} | Nei: ${noCount}`,
    },
  };

  updatedBlocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: "✅ *Godkjent!* Søknaden har blitt godkjent av styret.",
    },
  });

  return updatedBlocks as Array<Block>;
}
