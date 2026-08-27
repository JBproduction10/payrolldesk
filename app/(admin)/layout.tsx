import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { PayrollShell } from "@/components/layout/payroll-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "super_admin") {
    redirect("/portal");
  }

  return <PayrollShell>{children}</PayrollShell>;
}