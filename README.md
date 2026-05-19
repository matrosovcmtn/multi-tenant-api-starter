# multi-tenant-api-starter

Hono.js + Drizzle ORM + schema-per-tenant PostgreSQL + JWT with embedded roles.

Extracted and generalized from [Octery](https://octery.com) — a multi-tenant B2B AI intake SaaS in active pilot use.

## What's included

| Feature | Detail |
|---------|--------|
| **Schema-per-tenant isolation** | Each tenant gets a dedicated Postgres schema (`t_{slug}`) — no `WHERE tenant_id = ?` everywhere, easier per-tenant backup/restore |
| **JWT with embedded roles** | `owner \| admin \| viewer` baked into the token — role check is a decode, not a DB lookup |
| **`requireRole()` middleware** | Composable guard, `app.post("/items", requireRole("admin"), handler)` |
| **Drizzle ORM** | Typed queries, schema-as-code, migrations |
| **Hono.js** | Fast, edge-ready Node.js framework (~14KB) |
| **Docker Compose** | One-command local setup with Postgres 16 |

## Quick start

```bash
git clone https://github.com/matrosovcmtn/multi-tenant-api-starter
cd multi-tenant-api-starter
cp .env.example .env
docker compose up
```

**Register a tenant (creates owner account + returns JWT):**
```bash
curl -X POST http://localhost:3000/tenants \
  -H "Content-Type: application/json" \
  -d '{"slug":"acme","name":"Acme Corp","ownerEmail":"owner@acme.com"}'
# → { "tenant": {...}, "token": "eyJ..." }
```

**Create an item (admin+ required):**
```bash
curl -X POST http://localhost:3000/api/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"First item","payload":"optional JSON string"}'
```

**List items (any role):**
```bash
curl http://localhost:3000/api/items \
  -H "Authorization: Bearer <token>"
```

## Architecture

```
src/
├── index.ts              # Hono app + route mounting
├── db/
│   ├── client.ts         # Drizzle + postgres.js connection
│   ├── schema.ts         # Public tables (tenants, users) + tenantSchema() factory
│   └── migrate.ts        # Migration runner
├── middleware/
│   └── auth.ts           # JWT verify, signToken(), requireRole()
└── routes/
    ├── tenants.ts        # POST /tenants, GET /tenants/:slug
    └── items.ts          # CRUD /api/items (tenant-scoped, role-gated)
```

## Multi-tenancy model

```
public schema          t_acme schema       t_beta schema
──────────────         ─────────────       ─────────────
tenants                items               items
users                  (your tables)       (your tables)
```

Each tenant's rows live in a separate Postgres schema — simpler queries, no accidental cross-tenant joins, schema-level Postgres permissions possible.

## JWT payload

```json
{
  "sub":      "user-uuid",
  "tenantId": "tenant-uuid",
  "role":     "owner",
  "exp":      1234567890
}
```

## Extend it

- Replace `items` with your domain entity (contacts, leads, documents)
- Add `pgvector` to tenant schemas for RAG / embedding search
- Plug in LLM calls via [llm-intake-pipeline](https://github.com/matrosovcmtn/llm-intake-pipeline)
- Add BullMQ or N8N for async workflows

## Stack

TypeScript · Node 20 · Hono.js · Drizzle ORM · PostgreSQL 16 · jose · Docker
