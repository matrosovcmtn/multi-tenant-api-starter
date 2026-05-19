import { pgSchema, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// Public schema — platform-level tables shared across all tenants
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").unique().notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["owner", "admin", "viewer"] })
    .notNull()
    .default("viewer"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Per-tenant schema factory.
// Each tenant gets their own Postgres schema named t_{slug} — zero row-level mixing.
// Replace "items" with your domain entity (contacts, leads, documents, ...).
export function tenantSchema(tenantSlug: string) {
  const schema = pgSchema(`t_${tenantSlug}`);
  return {
    schema,
    items: schema.table("items", {
      id: uuid("id").defaultRandom().primaryKey(),
      name: text("name").notNull(),
      payload: text("payload"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
    }),
  };
}
