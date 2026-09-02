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

  // A platform_admin with no active impersonation has no org data to show
  // here — send them to the promoters picker instead. Once impersonating a
  // promoter, session.user.role is that promoter's "super_admin", so the
  // normal check below already lets them through.
  if (session.user.role === "platform_admin") {
    redirect("/promoters");
  }

  if (session.user.role !== "super_admin") {
    redirect("/portal");
  }

  return <PayrollShell>{children}</PayrollShell>;
}