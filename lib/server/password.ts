import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// scrypt password hashing. Stored as "scrypt$<salt hex>$<hash hex>".
const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: unknown): boolean {
  const [algo, saltHex, hashHex] = String(stored).split("$");
  if (algo !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// Used when a login doesn't exist, so response time doesn't reveal which accounts exist.
export const DUMMY_HASH = hashPassword("not-a-real-password");
