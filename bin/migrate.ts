import "@std/dotenv/load";
import { migrateToLatest } from "../src/db.ts";
import { Logger } from "../src/logger.ts";

Logger.info("Running migrations");
await migrateToLatest();
Logger.info("Migrations complete");
