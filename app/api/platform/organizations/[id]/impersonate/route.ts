import { NextResponse } from "next/server";
import auth from "@/auth";
import { hasPlatformAdminAuthority } from "@/lib/platform-auth";
import { getOrganizationById } from "@/lib/db/organizations";
import { findUserById } from "@/lib/db/users";
import { signImpersonationToken } from "@/lib/impersonation-token";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!hasPlatformAdminAuthority(session)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const organization = await getOrganizationById(id);
    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }
    if (organization.status === "suspended") {
      return NextResponse.json(
        { error: "This organization is suspended — reactivate it first." },
        { status: 409 },
      );
    }

    // The real platform_admin — either this session directly, or (if we're
    // already impersonating someone else) whoever started that chain, so
    // switching promoters never requires exiting back out first.
    const platformAdminId = session!.user.impersonatorId || session!.user.id;
    const platformAdmin = await findUserById(platformAdminId);
    if (!platformAdmin || platformAdmin.role !== "platform_admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const target = await findUserById(organization.ownerId);
    if (!target) {
      return NextResponse.json(
        { error: "This organization's owner account no longer exists." },
        { status: 409 },
      );
    }

    const token = signImpersonationToken({
      targetUserId: target._id,
      impersonatorId: platformAdmin._id,
      impersonatorName: platformAdmin.name,
    });

    return NextResponse.json({ token, email: target.email });
  } catch (err) {
    console.error("Failed to start impersonation:", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
