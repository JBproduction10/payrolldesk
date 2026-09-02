import { NextResponse } from "next/server";
import auth from "@/auth";
import { getWorkspace } from "@/lib/db/workspace";
import { listTeamMembers } from "@/lib/db/users";
import { buildBackupFiles } from "@/lib/export";
import { createZip } from "@/lib/zip";
import { getEffectiveOrgOwnerId } from "@/lib/active-org";

/**
 * "Download everything" — a safety net independent of us or the database:
 * a self-contained zip the super_admin can save wherever they like, with
 * both a raw JSON dump (workspace.json) and a CSV per table for opening
 * straight in Excel/Sheets.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const orgOwnerId = await getEffectiveOrgOwnerId(session);
  const [state, team] = await Promise.all([
    getWorkspace(orgOwnerId),
    listTeamMembers(orgOwnerId),
  ]);

  const files = buildBackupFiles(
    state,
    team.map((t) => ({
      name: t.name,
      email: t.email,
      role: t.role,
      clientId: t.clientId,
      employeeId: t.employeeId,
      createdAt: t.createdAt,
    })),
  );

  const zip = createZip(files.map((f) => ({ name: f.name, data: Buffer.from(f.content, "utf8") })));

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="payrolldesk-backup-${stamp}.zip"`,
      "Content-Length": String(zip.length),
    },
  });
}
