import "@std/dotenv/load";
import { migrateToLatest } from "./pg.ts";

console.log("Running migrations...");
await migrateToLatest();
console.log("Migrations complete!");
