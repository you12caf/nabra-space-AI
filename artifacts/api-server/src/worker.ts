import app from "./app.js";
import { cleanupExpiredGenerations } from "./lib/cleanup.js";

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: unknown, ctx: ExecutionContext) => {
    ctx.waitUntil(cleanupExpiredGenerations());
  },
};