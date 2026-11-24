import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { config } from "../config/loadConfig.js";

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,

  connectionTimeoutMillis: 5000,
});

function printError(error: unknown): void {
  let current: unknown = error;

  while (current instanceof Error) {
    console.error(current.stack ?? current.message);

    current = (
      current as Error & {
        cause?: unknown;
      }
    ).cause;
  }

  if (current !== undefined) {
    console.error(current);
  }
}

async function main() {
  try {
    const db = drizzle({ client: pool });

    await migrate(db, {
      migrationsFolder: "./drizzle/migrations",
    });

    console.log("[Database] Migrations applied successfully!");
  } catch (error) {
    console.error("[Database] Migration failed:");
    printError(error);

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

await main();
