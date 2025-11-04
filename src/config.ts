export type Config = {
  TOKEN: string;
  SIGNING_SECRET: string;
  APP_TOKEN: string;
  BOARD_CHANNEL_ID: string;
  ECHONOMI_CHANNEL_ID: string;
};

export function loadConfig() {
  const TOKEN = Deno.env.get("SLACK_BOT_TOKEN");
  const SIGNING_SECRET = Deno.env.get("SLACK_SIGNING_SECRET");
  const APP_TOKEN = Deno.env.get("SLACK_APP_TOKEN");
  const BOARD_CHANNEL_ID = Deno.env.get("BOARD_CHANNEL_ID");
  const ECHONOMI_CHANNEL_ID = Deno.env.get("ECHONOMI_CHANNEL_ID");
  const DATABASE_URL = Deno.env.get("DATABASE_URL");

  console.log("Loading Hallgeir config...");
  console.log(
    `Using bot token: ${TOKEN ? "****" + TOKEN.slice(-4) : "not set"}`,
  );
  console.log(
    `Using signing secret: ${
      SIGNING_SECRET ? "****" + SIGNING_SECRET.slice(-4) : "not set"
    }`,
  );
  console.log(
    `Using app token: ${APP_TOKEN ? "****" + APP_TOKEN.slice(-4) : "not set"}`,
  );
  console.log(
    "Using board channel ID: ",
    BOARD_CHANNEL_ID ? BOARD_CHANNEL_ID : "not set",
  );
  console.log(
    "Using echonomi channel ID: ",
    ECHONOMI_CHANNEL_ID ? ECHONOMI_CHANNEL_ID : "not set",
  );
  console.log(
    `Using database URL: ${
      DATABASE_URL ? "****" + DATABASE_URL.slice(-4) : "not set"
    }`,
  );

  if (
    !TOKEN ||
    !SIGNING_SECRET ||
    !APP_TOKEN ||
    !BOARD_CHANNEL_ID ||
    !ECHONOMI_CHANNEL_ID ||
    !DATABASE_URL
  ) {
    console.error(
      "Error: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, SLACK_APP_TOKEN, BOARD_CHANNEL_ID, ECHONOMI_CHANNEL_ID and DATABASE_URL must be set.",
    );
    Deno.exit(1);
  }

  return {
    TOKEN,
    SIGNING_SECRET,
    APP_TOKEN,
    BOARD_CHANNEL_ID,
    ECHONOMI_CHANNEL_ID,
  };
}
