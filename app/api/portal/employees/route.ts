import { NextResponse } from "next/server";
import auth from "@/auth";
import { addEmployeeScoped, updateEmployeeScoped } from "@/lib/db/workspace";
import type { Employee } from "@/lib/types";

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

  let body: Omit<Employee, "id" | "clientId" | "code" | "values">;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (
    !body?.name?.trim() ||
    !body?.email?.trim() ||
    !body?.departmentId ||
    !body?.position?.trim() ||
    !(body.baseSalary > 0)
  ) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const actor = { id: session.user.id, name: session.user.name ?? "School admin", role: session.user.role };

  try {
    const employee = await addEmployeeScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      {
        ...body,
        name: body.name.trim(),
        email: body.email.trim(),
        phone: body.phone?.trim() ?? "",
        position: body.position.trim(),
        joinDate: body.joinDate || new Date().toISOString().slice(0, 10),
        status: body.status ?? "active",
        channels: body.phone?.trim() ? ["email", "whatsapp"] : ["email"],
      },
      actor,
    );
    return NextResponse.json({ employee });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Department")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to add employee — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}

export async function PATCH(req: Request) {
  const session = await requireSchoolAdmin();
  if (!session) return NextResponse.json({ error: "Not authorized." }, { status: 403 });

  let body: { id?: string; patch?: Partial<Employee> };
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
    await updateEmployeeScoped(
      session.user.orgOwnerId,
      session.user.clientId as string,
      body.id,
      body.patch,
      actor,
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Department")) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Failed to update employee — is MONGODB_URI configured?", err);
    return NextResponse.json({ error: "Couldn't reach the database." }, { status: 503 });
  }
}
