import Link from "next/link";
import { ArrowRight, Building2, LockKeyhole, Mail, User2 } from "lucide-react";

import { signUpAction } from "@/app/actions";
import { BandosLogo } from "@/components/brand/bandos-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export const dynamic = "force-dynamic";

const signUpErrorMessages = {
  weak_password: {
    fr: "Choisis un mot de passe d'au moins 8 caractères.",
    en: "Choose a password with at least 8 characters."
  },
  email_exists: {
    fr: "Cet email existe déjà dans BandOS.",
    en: "This email already exists in BandOS."
  }
} as const;

export default async function SignUpPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocalePreference();
  const resolvedSearchParams = (await searchParams) ?? {};
  const errorCode =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : "";
  const errorMessage =
    errorCode in signUpErrorMessages
      ? signUpErrorMessages[errorCode as keyof typeof signUpErrorMessages][locale]
      : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="self-center p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-coral-300">
          {t(locale, "Commencer", "Start free")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-mist-50">
          {t(locale, "Créer le workspace du groupe", "Create your band workspace")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-mist-300">
          {t(
            locale,
            "Crée un workspace sécurisé, invite l'équipe et lance la première tournée en quelques minutes.",
            "Spin up a secure workspace, invite the team, and launch your first tour in a few minutes."
          )}
        </p>
        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}
        <form action={signUpAction} className="mt-8 space-y-4">
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Ton nom", "Your name")}
            </span>
            <div className="relative">
              <User2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                name="name"
                placeholder={t(locale, "Ton nom", "Your name")}
                className="pl-10"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Email du groupe", "Band email")}
            </span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                name="email"
                type="email"
                placeholder="you@yourband.com"
                className="pl-10"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Nom temporaire du workspace", "Temporary workspace name")}
            </span>
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                name="workspace"
                placeholder={t(locale, "Nom du groupe", "Band name")}
                className="pl-10"
              />
            </div>
          </label>
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Mot de passe", "Password")}
            </span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                name="password"
                type="password"
                placeholder={t(locale, "Choisis un mot de passe", "Choose a password")}
                className="pl-10"
              />
            </div>
          </label>
          <Button type="submit" className="w-full">
            {t(locale, "Créer le workspace", "Create workspace")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-sm text-mist-300">
          {t(locale, "Déjà un compte ?", "Already have an account?")}{" "}
          <Link
            href="/auth/sign-in"
            className="font-medium text-coral-300 transition hover:text-coral-200"
          >
            {t(locale, "Se connecter", "Sign in")}
          </Link>
        </p>
      </Card>

      <section className="flex flex-col justify-between rounded-[32px] border border-white/8 bg-gradient-to-br from-white/[0.06] to-coral-500/10 p-8 shadow-shell">
        <div className="flex items-start justify-between gap-4">
          <BandosLogo />
          <LanguageToggle locale={locale} />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Ce que tu obtiens dès le jour 1", "What you get on day one")}
          </p>
          <div className="mt-6 grid gap-4">
            {[
              t(locale, "Un workspace protégé pour le groupe, le manager, le merch, le chauffeur et le label", "A protected workspace for your band, manager, merch seller, driver, and label"),
              t(locale, "Des dashboards live pour les concerts, le routing, la finance, le merch, les tâches et les documents", "Live dashboards for shows, route planning, finances, merch, tasks, and documents"),
              t(locale, "Une UX premium pensée pour les groupes qui tournent sérieusement", "A premium operations UX built for serious touring bands")
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm leading-7 text-mist-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
        <Link
          href="/"
          className={buttonStyles({ variant: "ghost", className: "self-start" })}
        >
          {t(locale, "Retour à l'accueil", "Back to landing page")}
        </Link>
      </section>
    </main>
  );
}
