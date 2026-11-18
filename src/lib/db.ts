import { PrismaClient } from "@prisma/client";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function createClient() {
  const certificate = process.env.DATABASE_CA_CERT;
  if (!certificate) return new PrismaClient();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required with DATABASE_CA_CERT");

  const directory = mkdtempSync(join(tmpdir(), "payroll-db-"));
  const certPath = join(directory, "ca.pem");
  writeFileSync(certPath, certificate, { mode: 0o600 });
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  url.searchParams.set("sslcert", certPath);
  return new PrismaClient({ datasourceUrl: url.toString() });
}

const globalDb = globalThis as typeof globalThis & { payrollDb?: PrismaClient };
export const db = globalDb.payrollDb ?? createClient();
if (process.env.NODE_ENV !== "production") globalDb.payrollDb = db;
