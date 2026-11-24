import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const ConfigSchema = z.object({
  discord: z.object({
    token: z.string().min(1),
    prefix: z.string().default("."),
  }),

  database: z.object({
    host: z.string().default("localhost"),
    port: z.number().int().default(5432),
    user: z.string().min(1),
    password: z.string().min(1),
    name: z.string().min(1),
  }),

  lavalink: z.object({
    host: z.string(),
    port: z.number().int(),
    password: z.string(),
  }),
});

const configFile = process.env.CADE_CONFIG ?? "config.yml";
const configPath = resolve(process.cwd(), configFile);

const rawConfig: unknown = parse(readFileSync(configPath, "utf8"));

export const config = ConfigSchema.parse(rawConfig);
