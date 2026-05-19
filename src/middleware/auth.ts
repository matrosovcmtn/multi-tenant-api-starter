import { createMiddleware } from "hono/factory";
import { jwtVerify, SignJWT } from "jose";

export type JWTClaims = {
  sub: string;       // userId
  tenantId: string;
  role: "owner" | "admin" | "viewer";
  exp: number;
};

function getSecret() {
  return new TextEncoder().encode(
    process.env.JWT_SECRET ?? "change-me-in-production"
  );
}

export async function signToken(claims: Omit<JWTClaims, "exp">): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

export const authMiddleware = createMiddleware(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "unauthorized" }, 401);
  }
  try {
    const { payload } = await jwtVerify(header.slice(7), getSecret());
    c.set("user", payload as JWTClaims);
    await next();
  } catch {
    return c.json({ error: "invalid token" }, 401);
  }
});

const roleRank = { viewer: 0, admin: 1, owner: 2 } as const;

// Compose as route middleware: app.post("/items", requireRole("admin"), handler)
export function requireRole(min: "viewer" | "admin" | "owner") {
  return createMiddleware(async (c, next) => {
    const user = c.get("user") as JWTClaims;
    if (roleRank[user.role] < roleRank[min]) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  });
}
