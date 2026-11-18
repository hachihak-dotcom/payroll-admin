import { createHmac, randomUUID, timingSafeEqual, createHash } from "node:crypto";
import { db } from "@/lib/db";

export function checkSetupToken(provided: string, expected = process.env.SETUP_TOKEN) {
  if (!expected || expected.length < 32 || provided.length > 256) return false;
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(provided), hash(expected));
}

export function requestIdentifier(headers: Headers) {
  return process.env.VERCEL
    ? (headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown")
    : "local";
}

export async function takeAttempt(scope: string, subject: string, limit: number) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required");
  const key = createHmac("sha256", secret).update(JSON.stringify([scope, subject])).digest("hex");
  const now = new Date();
  const cutoff = new Date(now.getTime() - 15 * 60_000);
  const [result] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "login_throttles" ("id", "key", "count", "window_start", "updated_at")
    VALUES (${randomUUID()}::uuid, ${key}, 1, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "login_throttles"."window_start" <= ${cutoff}
        THEN 1 ELSE LEAST("login_throttles"."count" + 1, ${limit + 1}) END,
      "window_start" = CASE WHEN "login_throttles"."window_start" <= ${cutoff}
        THEN ${now} ELSE "login_throttles"."window_start" END,
      "updated_at" = ${now}
    RETURNING "count"`;
  return result.count <= limit;
}
