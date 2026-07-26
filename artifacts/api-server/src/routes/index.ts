import { Hono } from "hono";
import type { AppEnv } from "../app.js";
import healthRoutes from "./health.js";
import meRoutes from "./me.js";
import generateRoutes from "./generate.js";
import generationsRoutes from "./generations.js";
import paymentsRoutes from "./payments.js";
import affiliateRoutes from "./affiliate.js";
import promoRoutes from "./promo.js";
import adminRoutes from "./admin.js";

const routes = new Hono<AppEnv>();

routes.route("/", healthRoutes);
routes.route("/me", meRoutes);
routes.route("/generate", generateRoutes);
routes.route("/generations", generationsRoutes);
routes.route("/payments", paymentsRoutes);
routes.route("/affiliate", affiliateRoutes);
routes.route("/promo-codes", promoRoutes);
routes.route("/admin", adminRoutes);

export default routes;
