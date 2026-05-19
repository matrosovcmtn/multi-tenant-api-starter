import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { authMiddleware } from "./middleware/auth.js";
import { itemsRouter } from "./routes/items.js";
import { tenantsRouter } from "./routes/tenants.js";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

// Public: tenant registration
app.route("/tenants", tenantsRouter);

// Protected: all /api/* routes require a valid JWT
app.use("/api/*", authMiddleware);
app.route("/api/items", itemsRouter);

const port = Number(process.env.PORT ?? 3000);
console.log(`Listening on :${port}`);
serve({ fetch: app.fetch, port });
