import { serve } from "@hono/node-server";
import app from "./app.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT: "${rawPort}"`);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[nabra-space api] Server listening on port ${info.port}`);
});
