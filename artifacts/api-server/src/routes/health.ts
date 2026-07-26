import { Hono } from "hono";
import type { AppEnv } from "../app.js";

const app = new Hono<AppEnv>();

app.get("/healthz", (c) => c.json({ status: "ok" }));

export default app;
