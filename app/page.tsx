import Link from "next/link";
import {
  ReceiptText,
  Users,
  SlidersHorizontal,
  Send,
  Landmark,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Landmark,
    title: "Run payroll for every client",
    description:
      "Switch between client workspaces in one click — each with its own employees, departments, currency and pay day.",
    tone: "bg-brand-pine/12 text-brand-pine",
  },
  {
    icon: SlidersHorizontal,
    title: "Design your own payslip fields",
    description:
      "Add earnings, deductions and info fields as fixed amounts, percentages, or per-employee values — scoped to specific departments if you like.",
    tone: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
  },
  {
    icon: Users,
    title: "Group staff by department",
    description:
      "Organise employees into departments with heads, headcounts and live payroll totals for each team.",
    tone: "bg-brand-olive/15 text-brand-olive",
  },
  {
    icon: Sparkles,
    title: "Generate payslips in one click",
    description:
      "Pick a pay period and generate draft payslips for every active employee, calculated automatically from your field designer.",
    tone: "bg-brand-clay/15 text-brand-clay",
  },
  {
    icon: Send,
    title: "Deliver by email or WhatsApp",
    description:
      "Send payslips individually or all at once, by email and WhatsApp, and track delivery status per employee.",
    tone: "bg-brand-pine-mid/15 text-brand-pine-mid",
  },
  {
    icon: ReceiptText,
    title: "Your data, your account",
    description:
      "Every workspace is saved to your own account and backed by a real database — sign in from anywhere to pick up where you left off.",
    tone: "bg-brand-pine-deep/12 text-brand-pine-deep",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);


  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ReceiptText className="size-4.5" />
          </span>
          <span className="font-heading text-lg font-semibold text-foreground">
            Payroll Desk
          </span>
        </div>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button render={<Link href="/dashboard" />} nativeButton={false}>
              Go to dashboard
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false}>Sign in</Button>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5" />
            Built for payroll teams serving multiple clients
          </span>
          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            One desk to run payroll for every client you serve
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Design your own payslip fields, group employees by department, generate
            payslips automatically, and deliver them by email or WhatsApp — all from
            one clean, multi-client workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href={signedIn ? "/dashboard" : "/login"} />} nativeButton={false}>
              {signedIn ? "Go to dashboard" : "Sign in"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {["Invite-only access", "Backed by your own database", "One workspace, every school"].map(
              (item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" />
                  {item}
                </span>
              ),
            )}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${f.tone}`}
                >
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-heading text-base font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-secondary/40">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6">
            <h2 className="font-heading text-2xl font-semibold text-foreground sm:text-3xl">
              Ready to simplify payroll for every client you run?
            </h2>
            <p className="max-w-xl text-muted-foreground">
              Access is by invite only — your administrator adds you and you're in.
            </p>
            <Button size="lg" render={<Link href={signedIn ? "/dashboard" : "/login"} />} nativeButton={false}>
              {signedIn ? "Go to dashboard" : "Sign in"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Payroll Desk. Built for teams running payroll for
        multiple clients.
      </footer>
    </div>
  );
}
