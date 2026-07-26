import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import routes from "./routes/index.js";

export type AppEnv = {
  Variables: {
    userId: string;
    userEmail: string;
    isAdmin: boolean;
  };
};

const app = new Hono<AppEnv>();

app.use("*", cors({ origin: "*", allowHeaders: ["Authorization", "Content-Type"] }));
app.use("*", secureHeaders());
app.use("*", logger());

app.route("/api", routes);

app.notFound((c) => c.json({ error: "Not found" }, 404));
app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
