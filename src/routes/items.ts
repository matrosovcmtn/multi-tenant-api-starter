import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { tenantSchema, tenants } from "../db/schema.js";
import { requireRole, type JWTClaims } from "../middleware/auth.js";

export const itemsRouter = new Hono();

async function slugFor(tenantId: string): Promise<string | null> {
  const [t] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, tenantId));
  return t?.slug ?? null;
}

// GET /api/items — list items for the authenticated tenant
itemsRouter.get("/", async (c) => {
  const { tenantId } = c.get("user") as JWTClaims;
  const slug = await slugFor(tenantId);
  if (!slug) return c.json({ error: "tenant not found" }, 404);

  const { items } = tenantSchema(slug);
  return c.json(await db.select().from(items));
});

// POST /api/items — create item (admin or owner only)
itemsRouter.post("/", requireRole("admin"), async (c) => {
  const { tenantId } = c.get("user") as JWTClaims;
  const slug = await slugFor(tenantId);
  if (!slug) return c.json({ error: "tenant not found" }, 404);

  const { name, payload } = await c.req.json<{ name: string; payload?: string }>();
  if (!name) return c.json({ error: "name is required" }, 400);

  const { items } = tenantSchema(slug);
  const [item] = await db.insert(items).values({ name, payload }).returning();
  return c.json(item, 201);
});

// DELETE /api/items/:id — owners only
itemsRouter.delete("/:id", requireRole("owner"), async (c) => {
  const { tenantId } = c.get("user") as JWTClaims;
  const slug = await slugFor(tenantId);
  if (!slug) return c.json({ error: "tenant not found" }, 404);

  const { items } = tenantSchema(slug);
  const [deleted] = await db
    .delete(items)
    .where(eq(items.id, c.req.param("id")))
    .returning();
  if (!deleted) return c.json({ error: "not found" }, 404);
  return c.json({ deleted: true });
});
