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
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user);
  const t = await getTranslations("landingPage");

  const FEATURES = [
    {
      icon: Landmark,
      title: t("feature1Title"),
      description: t("feature1Description"),
      tone: "bg-brand-pine/12 text-brand-pine",
    },
    {
      icon: SlidersHorizontal,
      title: t("feature2Title"),
      description: t("feature2Description"),
      tone: "bg-brand-gold/20 text-[oklch(0.42_0.09_70)]",
    },
    {
      icon: Users,
      title: t("feature3Title"),
      description: t("feature3Description"),
      tone: "bg-brand-olive/15 text-brand-olive",
    },
    {
      icon: Sparkles,
      title: t("feature4Title"),
      description: t("feature4Description"),
      tone: "bg-brand-clay/15 text-brand-clay",
    },
    {
      icon: Send,
      title: t("feature5Title"),
      description: t("feature5Description"),
      tone: "bg-brand-pine-mid/15 text-brand-pine-mid",
    },
    {
      icon: ReceiptText,
      title: t("feature6Title"),
      description: t("feature6Description"),
      tone: "bg-brand-pine-deep/12 text-brand-pine-deep",
    },
  ];

  const TRUST_BADGES = [
    t("trustInviteOnly"),
    t("trustOwnDatabase"),
    t("trustOneWorkspace"),
  ];

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
              {t("goToDashboard")}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button render={<Link href="/login" />} nativeButton={false}>{t("signIn")}</Button>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            <Sparkles className="size-3.5" />
            {t("badge")}
          </span>
          <h1 className="mt-6 font-heading text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            {t("heroDescription")}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href={signedIn ? "/dashboard" : "/login"} />} nativeButton={false}>
              {signedIn ? t("goToDashboard") : t("signIn")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {TRUST_BADGES.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="size-4 text-success" />
                {item}
              </span>
            ))}
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
              {t("ctaTitle")}
            </h2>
            <p className="max-w-xl text-muted-foreground">
              {t("ctaDescription")}
            </p>
            <Button size="lg" render={<Link href={signedIn ? "/dashboard" : "/login"} />} nativeButton={false}>
              {signedIn ? t("goToDashboard") : t("signIn")}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground sm:px-6">
        {t("footer", { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
