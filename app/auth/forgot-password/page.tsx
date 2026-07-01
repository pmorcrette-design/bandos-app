import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";

import { requestPasswordResetAction } from "@/app/actions";
import { BandosLogo } from "@/components/brand/bandos-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export const dynamic = "force-dynamic";

const errorMessages = {
  missing_email: {
    fr: "Renseigne un email pour recevoir le lien de réinitialisation.",
    en: "Enter an email to receive a reset link."
  }
} as const;

const successMessages = {
  sent: {
    fr: "Si cet email existe dans BandOS, un lien de réinitialisation vient d'être envoyé.",
    en: "If this email exists in BandOS, a reset link was just sent."
  }
} as const;

export default async function ForgotPasswordPage({
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
  const successCode =
    typeof resolvedSearchParams.success === "string"
      ? resolvedSearchParams.success
      : "";

  const errorMessage =
    errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages][locale]
      : null;
  const successMessage =
    successCode in successMessages
      ? successMessages[successCode as keyof typeof successMessages][locale]
      : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[0.95fr_1.05fr]">
      <Card className="self-center p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
          {t(locale, "Récupération", "Recovery")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-mist-50">
          {t(locale, "Mot de passe oublié", "Forgot password")}
        </h1>
        <p className="mt-3 text-sm leading-7 text-mist-300">
          {t(
            locale,
            "Entre l'email de ton compte BandOS. Si l'accès existe, on t'enverra un lien sécurisé pour définir un nouveau mot de passe.",
            "Enter your BandOS account email. If the access exists, we will send a secure link so you can set a new password."
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

        <form action={requestPasswordResetAction} className="mt-8 space-y-4">
          <label className="space-y-2">
            <span className="text-sm text-mist-200">{t(locale, "Email", "Email")}</span>
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

          <Button type="submit" className="w-full">
            {t(locale, "Envoyer le lien", "Send reset link")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <Link
          href="/auth/sign-in"
          className={buttonStyles({
            variant: "ghost",
            className: "mt-6 w-full justify-center"
          })}
        >
          {t(locale, "Retour à la connexion", "Back to sign in")}
        </Link>
      </Card>

      <section className="flex flex-col justify-between rounded-[32px] border border-white/8 bg-gradient-to-br from-white/[0.06] to-coral-500/10 p-8 shadow-shell">
        <div className="flex items-start justify-between gap-4">
          <BandosLogo />
          <LanguageToggle locale={locale} />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
            {t(locale, "Sécurité workspace", "Workspace security")}
          </p>
          <div className="mt-6 grid gap-4">
            {[
              t(
                locale,
                "Le lien de réinitialisation reste valable pendant 2 heures.",
                "The reset link remains valid for 2 hours."
              ),
              t(
                locale,
                "Chaque compte équipe garde son propre accès, sans compte partagé.",
                "Each team member keeps their own access, without shared credentials."
              ),
              t(
                locale,
                "Les workspaces clients restent isolés les uns des autres.",
                "Client workspaces stay isolated from each other."
              )
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
