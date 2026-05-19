import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.js";
import { tenants, users } from "../db/schema.js";
import { signToken } from "../middleware/auth.js";

export const tenantsRouter = new Hono();

// POST /tenants — register tenant + owner, return signed JWT
tenantsRouter.post("/", async (c) => {
  const { slug, name, ownerEmail } = await c.req.json<{
    slug: string;
    name: string;
    ownerEmail: string;
  }>();

  if (!slug || !name || !ownerEmail) {
    return c.json({ error: "slug, name, ownerEmail are required" }, 400);
  }

  const [tenant] = await db.insert(tenants).values({ slug, name }).returning();
  const [user] = await db
    .insert(users)
    .values({ tenantId: tenant.id, email: ownerEmail, role: "owner" })
    .returning();

  // Create the per-tenant Postgres schema
  await db.execute(`CREATE SCHEMA IF NOT EXISTS "t_${slug}"`);

  const token = await signToken({ sub: user.id, tenantId: tenant.id, role: user.role });
  return c.json({ tenant, token }, 201);
});

// GET /tenants/:slug — public tenant lookup
tenantsRouter.get("/:slug", async (c) => {
  const [tenant] = await db
    .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
    .from(tenants)
    .where(eq(tenants.slug, c.req.param("slug")));

  if (!tenant) return c.json({ error: "not found" }, 404);
  return c.json(tenant);
});
