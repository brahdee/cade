import { LavalinkManager } from "lavalink-client";

import type { CadeClient } from "../bot/cade.js";
import { config } from "../config/loadConfig.js";
import { registerLavalinkEvents } from "../events/lavalink/index.js";

export async function initializeLavalink(client: CadeClient): Promise<void> {
  const user = client.user;

  if (!user) {
    throw new Error("Cannot initialize Lavalink before Discord is ready");
  }

  const manager = new LavalinkManager({
    nodes: [
      {
        id: "default-node",
        host: config.lavalink.host,
        port: config.lavalink.port,
        authorization: config.lavalink.password,

        secure: false,

        retryAmount: 10,
        retryDelay: 5000,
      },
    ],

    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);

      guild?.shard?.send(payload);
    },

    autoSkip: true,

    client: {
      id: user.id,
      username: user.username,
    },

    playerOptions: {
      onDisconnect: {
        autoReconnect: true,
        destroyPlayer: false,
      },

      onEmptyQueue: {
        destroyAfterMs: 30_000,
      },
    },
  });

  client.lavalink = manager;
  registerLavalinkEvents(client, manager);

  client.on("raw", (packet) => {
    manager.sendRawData(packet);
  });

  manager.nodeManager.on("connect", (node) => {
    console.log(`[Lavalink] Connected to node "${node.id}"`);
  });

  manager.nodeManager.on("disconnect", (node, reason) => {
    console.warn(`[Lavalink] Disconnected from node "${node.id}":`, reason);
  });

  manager.nodeManager.on("reconnecting", (node) => {
    console.log(`[Lavalink] Reconnecting to node "${node.id}"...`);
  });

  manager.nodeManager.on("error", (node, error) => {
    console.error(`[Lavalink] Node "${node.id}" error:`, error);
  });

  await manager.init({
    id: user.id,
    username: user.username,
  });

  console.log(`[Lavalink] Initialized. Available: ${manager.useable}`);
}
