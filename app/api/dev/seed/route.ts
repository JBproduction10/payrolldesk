// app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { seedDemoUsers, DEMO_PASSWORD } from "@/lib/db/seed-users";

export async function POST() {
  try {
    const users = await seedDemoUsers();

    return NextResponse.json({
      success: true,
      message: "Demo users are ready.",
      users: users.map((user) => ({
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        employeeId: user.employeeId,
        password: DEMO_PASSWORD,
      })),
    });
  } catch (error) {
    console.error("Demo seed failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to seed demo users.",
      },
      { status: 500 },
    );
  }
}