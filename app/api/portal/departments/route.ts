import { NextResponse } from "next/server";
import auth from "@/auth";
import { addDepartmentScoped, updateDepartmentScoped } from "@/lib/db/workspace";
import type { Department } from "@/lib/types";

async function requireSchoolAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "school_admin" || !session.user.clientId) {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  const session = await requireSchoolAdmin();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: Omit<Department, "id" | "clientId">;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body?.name?.trim()) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "School admin", role: session.user.role };

  try {
    const department = await addDepartmentScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      {
        name: body.name.trim(),
        description: body.description?.trim() ?? "",
        headId: body.headId ?? null,
        color: body.color ?? "pine",
      },
      actor,
    );
    return NextResponse.json({ department });
  } catch (err) {
    console.error("Failed to add department — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireSchoolAdmin();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: { id?: string; patch?: Partial<Department> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!body.id || !body.patch) {
    return NextResponse.json({ error: "Missing id or patch." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "School admin", role: session.user.role };

  try {
    await updateDepartmentScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      body.id,
      body.patch,
      actor,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to update department — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
