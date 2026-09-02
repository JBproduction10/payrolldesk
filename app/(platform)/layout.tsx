import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { hasPlatformAdminAuthority } from "@/lib/platform-auth";
import { getOrganizationByOwnerId } from "@/lib/db/organizations";
import { PlatformHeader } from "@/components/platform/platform-header";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!hasPlatformAdminAuthority(session)) {
    redirect("/portal");
  }

  const isImpersonating = !!session.user.impersonatorId;
  const viewingOrg = isImpersonating
    ? await getOrganizationByOwnerId(session.user.orgOwnerId).catch(() => null)
    : null;

  return (
    <div className="min-h-screen bg-muted/30">
      <PlatformHeader
        impersonatorName={session.user.impersonatorName ?? null}
        viewingOrgName={viewingOrg?.name ?? session.user.name ?? null}
      />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
