import type { Session } from "next-auth";

/**
 * True if this session can manage Organizations — either a platform_admin
 * signed in directly, or a platform_admin currently viewing a promoter's
 * workspace (role is "super_admin" for the duration, but impersonatorId
 * marks who's really behind it).
 */
export function hasPlatformAdminAuthority(session: Session | null): boolean {
  if (!session?.user) return false;
  return session.user.role === "platform_admin" || !!session.user.impersonatorId;
}
