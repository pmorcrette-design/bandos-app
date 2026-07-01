import Link from "next/link";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { signInAction } from "@/app/actions";
import { BandosLogo } from "@/components/brand/bandos-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export const dynamic = "force-dynamic";

const errorMessages = {
  invalid_credentials: {
    fr: "Email ou mot de passe incorrect. Utilise un compte d'équipe actif.",
    en: "Incorrect email or password. Use an active team account."
  },
} as const;

const successMessages = {
  reset_success: {
    fr: "Ton mot de passe a été mis à jour. Tu peux te reconnecter.",
    en: "Your password was updated. You can sign in again."
  }
} as const;

export default async function SignInPage({
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
  const resetCode =
    typeof resolvedSearchParams.reset === "string"
      ? resolvedSearchParams.reset
      : "";
  const errorMessage =
    errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages][locale]
      : null;
  const successMessage =
    resetCode in successMessages
      ? successMessages[resetCode as keyof typeof successMessages][locale]
      : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col justify-between rounded-[32px] border border-white/8 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-8 shadow-shell">
        <div>
          <div className="flex items-start justify-between gap-4">
            <BandosLogo />
            <LanguageToggle locale={locale} />
          </div>
          <p className="mt-10 text-sm uppercase tracking-[0.26em] text-coral-300">
            {t(locale, "Workspace opérations tournée", "Touring operations workspace")}
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-mist-50">
            {t(
              locale,
              "Pilote ton groupe comme une vraie opération de tournée.",
              "Run your band like a real touring operation."
            )}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-mist-300">
            {t(
              locale,
              "BandOS centralise le routing, les advances, la coordination d'équipe, les prestataires, le merch, la finance et les documents de tournée dans une seule interface premium.",
              "BandOS centralizes routing, advances, crew coordination, vendors, merch, finance, and tour documents in one premium control plane."
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            t(locale, "Workspaces sécurisés", "Protected band workspaces"),
            t(locale, "Ops live de route et de concerts", "Live route and show ops"),
            t(locale, "Finance et merch orientés tournée", "Tour-grade finance and merch")
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-mist-200"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <Card className="self-center p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
          {t(locale, "Connexion", "Sign in")}
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-mist-50">
          {t(locale, "Accéder au workspace", "Access your workspace")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-mist-300">
          {t(
            locale,
            "Utilise un compte équipe avec email et mot de passe pour accéder à ton workspace BandOS.",
            "Use your team email and password to access your BandOS workspace."
          )}
        </p>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {successMessage}
          </div>
        ) : null}

        <form action={signInAction} className="mt-8 space-y-4">
          <label className="space-y-2">
            <span className="text-sm text-mist-200">
              {t(locale, "Email", "Email")}
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
              {t(locale, "Mot de passe", "Password")}
            </span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
              <Input
                name="password"
                type="password"
                placeholder={t(locale, "Ton mot de passe", "Your password")}
                className="pl-10"
              />
            </div>
          </label>
          <Button type="submit" className="w-full">
            {t(locale, "Entrer dans BandOS", "Enter BandOS")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-6 text-sm text-mist-300">
          {t(locale, "Besoin d'un nouveau workspace ?", "Need a new workspace?")}{" "}
          <Link
            href="/auth/sign-up"
            className="font-medium text-coral-300 transition hover:text-coral-200"
          >
            {t(locale, "Créer un compte", "Create an account")}
          </Link>
        </p>
        <p className="mt-3 text-sm text-mist-300">
          <Link
            href="/auth/forgot-password"
            className="font-medium text-coral-300 transition hover:text-coral-200"
          >
            {t(locale, "Mot de passe oublié ?", "Forgot password?")}
          </Link>
        </p>
        <Link
          href="/"
          className={buttonStyles({
            variant: "ghost",
            className: "mt-6 w-full justify-center"
          })}
        >
          {t(locale, "Retour à l'accueil", "Back to landing page")}
        </Link>
      </Card>
    </main>
  );
}
