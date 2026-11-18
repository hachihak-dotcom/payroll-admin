import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummyHash = "scrypt-v1:" + "00".repeat(16) + ":" + "00".repeat(64);

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, result) => error ? reject(error) : resolve(result));
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const digest = await derive(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${digest.toString("hex")}`;
}

export async function verifyPassword(password: string, stored?: string) {
  const valid = Boolean(stored && /^scrypt-v1:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored));
  const [, salt, expected] = (valid ? stored! : dummyHash).split(":");
  const digest = await derive(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(digest, Buffer.from(expected, "hex")) && valid;
}
