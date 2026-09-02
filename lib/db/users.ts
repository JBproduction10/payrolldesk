import crypto from "crypto";
import { getDb } from "../mongodb";
import type { Role } from "../types";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface UserDoc {
  _id: string;
  name: string;
  email: string;
  /** Empty string means the account is pending — no password set yet, can't sign in. */
  passwordHash: string;
  role: Role;
  /** Owner of the shared workspace this account reads from — self for super_admin. */
  orgOwnerId: string;
  /** School (Client id) this account is scoped to — null for super_admin/promoter. */
  clientId: string | null;
  /** Employee record this account represents — "teacher" role only. */
  employeeId: string | null;
  /** Single-use token for the invited person to set their own password. */
  inviteToken: string | null;
  inviteExpires: string | null;
  createdAt: string;
}

function usersCollection() {
  return getDb().then((db) => db.collection<UserDoc>("users"));
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const users = await usersCollection();
  return users.findOne({ email: email.toLowerCase().trim() });
}

export async function findUserById(id: string): Promise<UserDoc | null> {
  const users = await usersCollection();
  return users.findOne({ _id: id });
}

export async function findUserByInviteToken(token: string): Promise<UserDoc | null> {
  const users = await usersCollection();
  return users.findOne({ inviteToken: token });
}

export async function listTeamMembers(orgOwnerId: string): Promise<UserDoc[]> {
  const users = await usersCollection();
  return users
    .find({ orgOwnerId, role: { $ne: "super_admin" } })
    .sort({ createdAt: -1 })
    .toArray();
}

/**
 * Account ids for every active member matching one of `roles` — used to fan
 * out notifications (e.g. every "treasury" account org-wide, or every
 * "school_admin" scoped to one school). Pass `clientId` to scope the lookup
 * to one school; omit it for org-wide roles like "treasury" that aren't
 * tied to any single client. Includes the org owner themselves when
 * "super_admin" is one of `roles`, since they're a real recipient too.
 */
export async function listUserIdsByRole(
  orgOwnerId: string,
  roles: Role[],
  clientId?: string | null,
): Promise<string[]> {
  const users = await usersCollection();
  const filter: Record<string, unknown> = { orgOwnerId, role: { $in: roles } };
  if (clientId !== undefined) filter.clientId = clientId;
  const rows = await users.find(filter, { projection: { _id: 1 } }).toArray();
  return rows.map((r) => r._id);
}

/** The team account (if any) representing a given employee — used to notify a linked "teacher" login about their own payslip. */
export async function findUserByEmployeeId(
  orgOwnerId: string,
  employeeId: string,
): Promise<UserDoc | null> {
  const users = await usersCollection();
  return users.findOne({ orgOwnerId, employeeId });
}

/** True once any account exists at all — used to lock the one-time /setup route. */
export async function hasAnyUser(): Promise<boolean> {
  const users = await usersCollection();
  const count = await users.countDocuments({}, { limit: 1 });
  return count > 0;
}

/** True once a platform_admin exists — /setup only ever bootstraps this one account. */
export async function hasAnyPlatformAdmin(): Promise<boolean> {
  const users = await usersCollection();
  const count = await users.countDocuments({ role: "platform_admin" }, { limit: 1 });
  return count > 0;
}

/**
 * Creates the very first account (one-time bootstrap via /setup) — a
 * platform_admin, not tied to any promoter's Organization. Every promoter
 * workspace after this is created by a platform_admin via
 * createPromoterAdmin(), not through /setup.
 */
export async function createBootstrapAdmin(params: {
  name: string;
  email: string;
  passwordHash: string;
}): Promise<UserDoc> {
  const id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return insertUser({
    _id: id,
    name: params.name.trim(),
    email: params.email,
    passwordHash: params.passwordHash,
    role: "platform_admin",
    orgOwnerId: id,
    clientId: null,
    employeeId: null,
    inviteToken: null,
    inviteExpires: null,
  });
}

/**
 * Creates a new promoter's owning account — pending, no password yet, same
 * invite-token flow as createTeamMember(). Called by a platform_admin when
 * adding a new Organization; the returned user's `_id` becomes that
 * Organization's `ownerId`, and everything scoped to it (Clients, Employees,
 * etc.) uses this id as `orgOwnerId`.
 */
export async function createPromoterAdmin(params: {
  name: string;
  email: string;
}): Promise<{ user: UserDoc; inviteToken: string }> {
  const id = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const user = await insertUser({
    _id: id,
    name: params.name.trim(),
    email: params.email,
    passwordHash: "",
    role: "super_admin",
    orgOwnerId: id,
    clientId: null,
    employeeId: null,
    inviteToken,
    inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  return { user, inviteToken };
}

/**
 * Creates a scoped team account (promoter/school_admin/teacher/finance) with
 * no password yet — they'll set one themselves via the invite link.
 */
export async function createTeamMember(params: {
  name: string;
  email: string;
  role: Exclude<Role, "super_admin">;
  orgOwnerId: string;
  clientId: string | null;
  employeeId: string | null;
}): Promise<{ user: UserDoc; inviteToken: string }> {
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const user = await insertUser({
    _id: `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
    name: params.name.trim(),
    email: params.email,
    passwordHash: "",
    role: params.role,
    orgOwnerId: params.orgOwnerId,
    clientId: params.clientId,
    employeeId: params.employeeId,
    inviteToken,
    inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  });
  return { user, inviteToken };
}

/** Issues a fresh invite token for an existing pending account ("resend invite"). */
export async function regenerateInvite(id: string): Promise<string | null> {
  const users = await usersCollection();
  const inviteToken = crypto.randomBytes(32).toString("hex");
  const result = await users.findOneAndUpdate(
    { _id: id, passwordHash: "" },
    {
      $set: {
        inviteToken,
        inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      },
    },
  );
  return result ? inviteToken : null;
}

/**
 * Issues a password-reset token for any existing account (active or still
 * pending an invite) — reuses the same token field that activateAccount()
 * already knows how to consume, so "reset" and "finish invite" share one
 * code path. Returns null when no account matches, so callers can give a
 * generic response either way and avoid leaking which emails are registered.
 */
export async function issuePasswordResetToken(
  email: string,
): Promise<{ user: UserDoc; token: string } | null> {
  const users = await usersCollection();
  const token = crypto.randomBytes(32).toString("hex");
  const result = await users.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      $set: {
        inviteToken: token,
        inviteExpires: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? { user: result, token } : null;
}

/** Sets a password on a pending account and clears its invite token — activation. */
export async function activateAccount(
  token: string,
  passwordHash: string,
): Promise<UserDoc | null> {
  const users = await usersCollection();
  const user = await users.findOne({ inviteToken: token });
  if (!user) return null;
  if (!user.inviteExpires || new Date(user.inviteExpires).getTime() < Date.now()) {
    return null;
  }
  const updated: UserDoc = {
    ...user,
    passwordHash,
    inviteToken: null,
    inviteExpires: null,
  };
  await users.updateOne(
    { _id: user._id },
    { $set: { passwordHash, inviteToken: null, inviteExpires: null } },
  );
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const users = await usersCollection();
  await users.deleteOne({ _id: id });
}

/**
 * Updates a team member's name, role, or scope (school / linked employee).
 * Email is intentionally not editable here — it's the login identity, so a
 * change of email is treated as "remove and re-invite" instead.
 */
export async function updateTeamMember(
  id: string,
  orgOwnerId: string,
  patch: {
    name?: string;
    role?: Exclude<Role, "super_admin">;
    clientId?: string | null;
    employeeId?: string | null;
  },
): Promise<UserDoc | null> {
  const users = await usersCollection();
  const update: Partial<UserDoc> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.role !== undefined) update.role = patch.role;
  if (patch.clientId !== undefined) update.clientId = patch.clientId;
  if (patch.employeeId !== undefined) update.employeeId = patch.employeeId;

  return users.findOneAndUpdate(
    { _id: id, orgOwnerId, role: { $ne: "super_admin" } },
    { $set: update },
    { returnDocument: "after" },
  );
}

async function insertUser(doc: Omit<UserDoc, "createdAt">): Promise<UserDoc> {
  const users = await usersCollection();
  const email = doc.email.toLowerCase().trim();
  const existing = await users.findOne({ email });
  if (existing) {
    throw new Error("An account with that email already exists.");
  }
  const full: UserDoc = { ...doc, email, createdAt: new Date().toISOString() };
  await users.insertOne(full);
  return full;
}
