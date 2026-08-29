import { getDb } from "../mongodb";
import type { ID, Notification, NotificationType } from "../types";

function uid(prefix: string): ID {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function notifications() {
  return getDb().then((db) => db.collection<Notification>("notifications"));
}

export interface NotifyInput {
  orgOwnerId: ID;
  clientId: ID | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/**
 * Fans a single event out to every recipient in `userIds` — one row each,
 * so read state is per-account (see the `Notification` type docs). Silently
 * skipped if `userIds` is empty (e.g. no treasury account exists yet); a
 * missed notification should never block the action that triggered it, so
 * callers are expected to fire this and not let a failure here bubble up.
 * Duplicate ids (a submitter who is also the only school_admin) are
 * collapsed so nobody gets the same notification twice.
 */
export async function notifyUsers(userIds: ID[], input: NotifyInput): Promise<void> {
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return;
  const col = await notifications();
  const at = new Date().toISOString();
  await col.insertMany(
    unique.map((userId) => ({
      id: uid("ntf"),
      orgOwnerId: input.orgOwnerId,
      userId,
      clientId: input.clientId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link,
      read: false,
      createdAt: at,
    })),
  );
}

export interface ListNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
}

/** Most recent notifications for one account, newest first, plus how many are unread. */
export async function listNotifications(
  orgOwnerId: ID,
  userId: ID,
  limit = 30,
): Promise<ListNotificationsResult> {
  const col = await notifications();
  const [rows, unreadCount] = await Promise.all([
    col
      .find({ orgOwnerId, userId }, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 100))
      .toArray(),
    col.countDocuments({ orgOwnerId, userId, read: false }),
  ]);
  return { notifications: rows, unreadCount };
}

/** Marks one notification read — scoped to the requesting user so nobody can mark another account's. */
export async function markNotificationRead(userId: ID, id: ID): Promise<void> {
  const col = await notifications();
  await col.updateOne({ id, userId }, { $set: { read: true } });
}

export async function markAllNotificationsRead(orgOwnerId: ID, userId: ID): Promise<void> {
  const col = await notifications();
  await col.updateMany({ orgOwnerId, userId, read: false }, { $set: { read: true } });
}
