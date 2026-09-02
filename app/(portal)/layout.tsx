import { redirect } from "next/navigation";
import auth from "@/auth";
import { PortalTopbar } from "@/components/layout/portal-topbar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role === "platform_admin") {
    redirect("/promoters");
  }
  if (session.user.role === "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <PortalTopbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 print:max-w-none print:p-0">{children}</div>
      </main>
    </div>
  );
}
