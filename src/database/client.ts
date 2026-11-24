import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "./schema.js";
import { config } from "../config/loadConfig.js";

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.name,

  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (error) => {
  console.error("[Database] Unexpected connection error:", error);
});

export const db = drizzle({
  client: pool,
  schema,
});

export async function closeDatabase() {
  await pool.end();
}
