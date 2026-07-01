import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";

import { resetPasswordAction } from "@/app/actions";
import { BandosLogo } from "@/components/brand/bandos-logo";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";
import { getPasswordResetTokenRecord } from "@/lib/server/password-reset-store";

export const dynamic = "force-dynamic";

const errorMessages = {
  invalid_token: {
    fr: "Ce lien est invalide ou expiré. Redemande un nouveau lien.",
    en: "This link is invalid or expired. Request a new one."
  },
  weak_password: {
    fr: "Choisis un mot de passe d'au moins 8 caractères.",
    en: "Choose a password with at least 8 characters."
  },
  password_mismatch: {
    fr: "Les mots de passe ne correspondent pas.",
    en: "Passwords do not match."
  }
} as const;

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getLocalePreference();
  const resolvedSearchParams = (await searchParams) ?? {};
  const token =
    typeof resolvedSearchParams.token === "string"
      ? resolvedSearchParams.token
      : "";
  const errorCode =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : "";

  const tokenRecord = token ? await getPasswordResetTokenRecord(token) : null;
  const invalidToken = !token || !tokenRecord;
  const errorMessage =
    errorCode in errorMessages
      ? errorMessages[errorCode as keyof typeof errorMessages][locale]
      : invalidToken
        ? errorMessages.invalid_token[locale]
        : null;

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex flex-col justify-between rounded-[32px] border border-white/8 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-8 shadow-shell">
        <div>
          <div className="flex items-start justify-between gap-4">
            <BandosLogo />
            <LanguageToggle locale={locale} />
          </div>
          <p className="mt-10 text-sm uppercase tracking-[0.26em] text-coral-300">
            {t(locale, "Lien sécurisé", "Secure link")}
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight text-mist-50">
            {t(
              locale,
              "Définis un nouveau mot de passe pour ton workspace.",
              "Set a new password for your workspace."
            )}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-mist-300">
            {t(
              locale,
              "Le lien fonctionne pendant 2 heures. Une fois le mot de passe mis à jour, tu pourras te reconnecter immédiatement.",
              "The link works for 2 hours. Once your password is updated, you can sign in right away."
            )}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            t(locale, "Lien temporaire", "Temporary link"),
            t(locale, "Compte équipe isolé", "Isolated team account"),
            t(locale, "Aucun reset workspace", "No workspace reset")
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
          {t(locale, "Réinitialisation", "Reset")}
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-mist-50">
          {t(locale, "Nouveau mot de passe", "New password")}
        </h2>
        <p className="mt-3 text-sm leading-7 text-mist-300">
          {t(
            locale,
            "Choisis un mot de passe fort pour protéger l'accès au workspace.",
            "Choose a strong password to protect workspace access."
          )}
        </p>

        {errorMessage ? (
          <div className="mt-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </div>
        ) : null}

        {invalidToken ? (
          <div className="mt-8 space-y-4">
            <Link
              href="/auth/forgot-password"
              className={buttonStyles({ className: "w-full justify-center" })}
            >
              {t(locale, "Demander un nouveau lien", "Request a new link")}
            </Link>
            <Link
              href="/auth/sign-in"
              className={buttonStyles({
                variant: "ghost",
                className: "w-full justify-center"
              })}
            >
              {t(locale, "Retour à la connexion", "Back to sign in")}
            </Link>
          </div>
        ) : (
          <form action={resetPasswordAction} className="mt-8 space-y-4">
            <input type="hidden" name="token" value={token} />
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nouveau mot de passe", "New password")}
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
                <Input
                  name="password"
                  type="password"
                  placeholder={t(
                    locale,
                    "Choisis un nouveau mot de passe",
                    "Choose a new password"
                  )}
                  className="pl-10"
                />
              </div>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Confirmer le mot de passe", "Confirm password")}
              </span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-mist-300" />
                <Input
                  name="confirmPassword"
                  type="password"
                  placeholder={t(locale, "Retape le mot de passe", "Retype the password")}
                  className="pl-10"
                />
              </div>
            </label>
            <Button type="submit" className="w-full">
              {t(locale, "Enregistrer le mot de passe", "Save password")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
