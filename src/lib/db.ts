import { PrismaClient } from "@prisma/client";

const globalDb = globalThis as typeof globalThis & { payrollDb?: PrismaClient };
export const db = globalDb.payrollDb ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDb.payrollDb = db;
