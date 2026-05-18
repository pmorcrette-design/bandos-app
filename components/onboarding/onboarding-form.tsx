"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Plus } from "lucide-react";

import { completeOnboardingAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { t, translateBandRole, type Locale } from "@/lib/i18n";

const bandRoles = [
  "vocalist",
  "guitarist",
  "drummer",
  "bassist",
  "manager",
  "merch seller",
  "driver",
  "tour manager"
] as const;

export function OnboardingForm({
  locale
}: {
  locale: Locale;
}) {
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([
    { name: "Widespread Disease", role: "vocalist" },
    { name: "Mae Hollow", role: "tour manager" },
    { name: "Dani Croft", role: "merch seller" }
  ]);
  const [bandName, setBandName] = useState("WIDESPREAD DISEASE");
  const [genre, setGenre] = useState("Metalcore");
  const [country, setCountry] = useState("France");
  const [tourName, setTourName] = useState("Northbound Ruin 2026");
  const [tourStart, setTourStart] = useState("London");
  const [logo, setLogo] = useState("/widespread-disease-logo.jpg");

  const progress = useMemo(() => ((step + 1) / 3) * 100, [step]);

  return (
    <form action={completeOnboardingAction} className="space-y-6">
      <input type="hidden" name="bandName" value={bandName} />
      <input type="hidden" name="genre" value={genre} />
      <input type="hidden" name="country" value={country} />
      <input type="hidden" name="tourName" value={tourName} />
      <input type="hidden" name="tourStart" value={tourStart} />
      <input type="hidden" name="logo" value={logo} />
      <input
        type="hidden"
        name="members"
        value={members.map((member) => `${member.name}:${member.role}`).join("|")}
      />

      <Card className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge tone="accent">Workspace onboarding</Badge>
            <h2 className="mt-3 text-3xl font-semibold text-mist-50">
              {t(locale, "Configure ton opération de tournée", "Set up your touring operation")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-mist-300">
              {t(
                locale,
                "Crée le workspace du groupe, définis l'équipe et enregistre la première tournée pour ouvrir le dashboard avec un vrai contexte.",
                "Create the band workspace, define the crew, and log the first run so the dashboard opens with real context."
              )}
            </p>
          </div>
          <div className="min-w-[160px]">
            <p className="mb-2 text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Progression", "Progress")}
            </p>
            <ProgressBar value={progress} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[t(locale, "Groupe", "Band"), t(locale, "Équipe", "Team"), t(locale, "Première tournée", "First Tour")].map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                step === index
                  ? "border-coral-500/30 bg-coral-500/10 text-mist-50"
                  : "border-white/8 bg-white/[0.03] text-mist-300 hover:bg-white/5"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.24em]">
                {t(locale, "Étape", "Step")} {index + 1}
              </p>
              <p className="mt-2 text-base font-medium">{label}</p>
            </button>
          ))}
        </div>

        {step === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom du groupe", "Band name")}
              </span>
              <Input
                value={bandName}
                onChange={(event) => setBandName(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Genre", "Genre")}</span>
              <Input
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">{t(locale, "Pays", "Country")}</span>
              <Input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Fichier logo", "Logo file")}
              </span>
              <Input value={logo} onChange={(event) => setLogo(event.target.value)} />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            {members.map((member, index) => (
              <div
                key={`${member.name}-${index}`}
                className="grid gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:grid-cols-[1.5fr_1fr]"
              >
                <Input
                  value={member.name}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, name: event.target.value }
                          : entry
                      )
                    )
                  }
                />
                <select
                  value={member.role}
                  onChange={(event) =>
                    setMembers((current) =>
                      current.map((entry, entryIndex) =>
                        entryIndex === index
                          ? { ...entry, role: event.target.value }
                          : entry
                      )
                    )
                  }
                  className="h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-mist-50 outline-none"
                >
                  {bandRoles.map((role) => (
                    <option key={role} value={role} className="bg-graphite-900">
                      {translateBandRole(locale, role)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setMembers((current) => [
                  ...current,
                  { name: t(locale, "Nouveau membre", "New member"), role: "guitarist" }
                ])
              }
            >
              <Plus className="h-4 w-4" />
              {t(locale, "Ajouter un membre", "Add member")}
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Nom de la première tournée", "First tour name")}
              </span>
              <Input
                value={tourName}
                onChange={(event) => setTourName(event.target.value)}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm text-mist-200">
                {t(locale, "Ville de départ", "Start city")}
              </span>
              <Input
                value={tourStart}
                onChange={(event) => setTourStart(event.target.value)}
              />
            </label>
            <div className="rounded-2xl border border-coral-500/20 bg-coral-500/10 p-4 md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-coral-500 text-white">
                  <Check className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-mist-50">
                    {t(
                      locale,
                      "BandOS va générer ton premier dashboard avec tournée active, finance, CRM, merch, documents et état des checklists de voyage.",
                      "BandOS will generate your first dashboard with active tour, finances, CRM, merch, documents, and border checklist status."
                    )}
                  </p>
                  <p className="mt-2 text-sm text-mist-200">
                    {t(
                      locale,
                      "Tu pourras modifier chaque champ après l'onboarding. Le but est de donner immédiatement un contexte opérationnel au workspace.",
                      "You can edit every field after onboarding. The goal here is to give the workspace immediate operational context."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="flex flex-wrap justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
        >
          {t(locale, "Retour", "Back")}
        </Button>
        {step < 2 ? (
          <Button type="button" onClick={() => setStep((current) => current + 1)}>
            {t(locale, "Continuer", "Continue")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit">
            {t(locale, "Lancer le workspace", "Launch workspace")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
