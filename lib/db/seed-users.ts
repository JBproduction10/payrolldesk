// lib/db/seed-users.ts
import bcrypt from "bcryptjs";
import { getDb } from "../mongodb";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../demo-accounts";
import type { Role } from "../types";

export { DEMO_PASSWORD };

interface UserSeed {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  orgOwnerId: string;
  clientId: string | null;
  employeeId: string | null;
  inviteToken: string | null;
  inviteExpires: string | null;
  createdAt: string;
}

export async function seedDemoUsers(): Promise<UserSeed[]> {
  const db = await getDb();
  const users = db.collection<UserSeed>("users");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const now = new Date().toISOString();

  const seeds: UserSeed[] = DEMO_ACCOUNTS.map((account) => ({
    _id: account.id,
    name: account.name,
    email: account.email,
    passwordHash,
    role: account.role,
    orgOwnerId: "u_demo_admin",
    clientId: account.clientId,
    employeeId: account.employeeId,
    inviteToken: null,
    inviteExpires: null,
    createdAt: now,
  }));

  // Upsert each demo user individually so a partial prior seed (or re-running
  // this route) never trips a duplicate-key error on insertMany.
  await Promise.all(
    seeds.map((seed) =>
      users.updateOne({ _id: seed._id }, { $setOnInsert: seed }, { upsert: true }),
    ),
  );

  // Always return the full current set, freshly read back, so the shape
  // returned is consistent whether users were just created or already existed.
  return users.find({ _id: { $in: seeds.map((s) => s._id) } }).toArray();
}
