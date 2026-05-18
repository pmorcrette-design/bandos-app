import { BandosLogo } from "@/components/brand/bandos-logo";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { t } from "@/lib/i18n";
import { getLocalePreference } from "@/lib/preferences";

export default async function OnboardingPage() {
  const locale = await getLocalePreference();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <BandosLogo />
        <LanguageToggle locale={locale} />
        <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
          {t(locale, "L'operating system pour les groupes en tournée", "The operating system for bands on tour")}
        </p>
      </div>
      <OnboardingForm locale={locale} />
    </main>
  );
}
