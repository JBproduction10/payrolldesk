import { cookies } from "next/headers";
import type { Session } from "next-auth";
import { getOrganizationById } from "./db/organizations";

export const ACTIVE_ORG_COOKIE = "activeOrgId";

/**
 * super_admin is the platform owner, not scoped to one promoter — they pick
 * which Organization they're currently viewing (like ClientSwitcher, one
 * level up), stored in a cookie as that Organization's id. Every other role
 * belongs to exactly one org and always resolves to their own orgOwnerId,
 * unchanged.
 */
export async function getEffectiveOrgOwnerId(session: Session): Promise<string> {
  if (session.user.role !== "super_admin") {
    return session.user.orgOwnerId;
  }

  const store = await cookies();
  const activeOrgId = store.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) return session.user.orgOwnerId;

  // Cookie could point at a since-deleted or suspended org — fall back to
  // the platform owner's own default rather than serving stale/blocked data.
  try {
    const org = await getOrganizationById(activeOrgId);
    if (!org || org.status === "suspended") return session.user.orgOwnerId;
    return org.orgOwnerId;
  } catch {
    return session.user.orgOwnerId;
  }
}
