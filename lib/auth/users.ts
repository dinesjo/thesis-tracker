import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,32}$/;
const PASSWORD_MIN_LENGTH = 8;

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_REGEX.test(username);
}

export function isValidPassword(password: string) {
  return password.length >= PASSWORD_MIN_LENGTH && password.length <= 72;
}

export async function verifyUserPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function findUserByUsername(username: string) {
  const normalized = normalizeUsername(username);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, normalized))
    .limit(1);

  return user ?? null;
}

export async function findUserById(userId: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
}

export async function createUser(username: string, password: string) {
  const normalized = normalizeUsername(username);

  if (!isValidUsername(normalized)) {
    throw new Error("Invalid username format");
  }

  if (!isValidPassword(password)) {
    throw new Error("Invalid password length");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [created] = await db
    .insert(users)
    .values({
      username: normalized,
      passwordHash,
    })
    .onConflictDoNothing()
    .returning();

  if (!created) {
    throw new Error("Username already exists");
  }

  return created;
}
