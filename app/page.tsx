import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CreditCard,
  FileStack,
  Globe2,
  MapPinned,
  ShieldCheck,
  Truck
} from "lucide-react";

import { BandosLogo } from "@/components/brand/bandos-logo";
import { FadeIn } from "@/components/shared/fade-in";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { RouteMap } from "@/components/shared/route-map";
import { WorkspaceLogo } from "@/components/shared/workspace-logo";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  faqs,
  featureCards,
  landingProblems,
  pricingPlans,
  testimonials,
  trustedBands,
  workflowSteps
} from "@/lib/mock-data";
import { getCurrencyPreference } from "@/lib/preferences";
import {
  formatCompactCurrency,
  formatCurrency,
  replaceCurrencyInText
} from "@/lib/utils";
import { getLocalePreference } from "@/lib/preferences";
import { t } from "@/lib/i18n";

function ScreenshotCard({
  title,
  body,
  children
}: {
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
        <div>
          <p className="text-sm font-medium text-mist-50">{title}</p>
          <p className="mt-1 text-sm text-mist-300">{body}</p>
        </div>
        <div className="flex gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-coral-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        </div>
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

export default async function LandingPage() {
  const currencyPreference = await getCurrencyPreference();
  const locale = await getLocalePreference();
  const merchRevenue = formatCompactCurrency(4800, currencyPreference, "GBP");
  const financeBalance = formatCurrency(2180, currencyPreference, "GBP");

  return (
    <main className="pb-24">
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="rounded-[34px] border border-white/8 bg-gradient-to-b from-white/[0.06] to-white/[0.03] px-6 py-6 shadow-shell sm:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <BandosLogo />
            <div className="flex flex-wrap items-center gap-3">
              <LanguageToggle locale={locale} />
              <Link
                href="/auth/sign-in"
                className={buttonStyles({ variant: "ghost" })}
              >
                {t(locale, "Connexion", "Sign in")}
              </Link>
              <Link
                href="/auth/sign-up"
                className={buttonStyles({ variant: "primary" })}
              >
                {t(locale, "Commencer", "Start free")}
              </Link>
            </div>
          </div>

          <div className="mt-14 grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
            <FadeIn className="self-center">
              <Badge tone="accent">BandOS</Badge>
              <h1 className="mt-5 max-w-3xl text-balance text-5xl font-semibold leading-tight text-mist-50 sm:text-6xl">
                {t(
                  locale,
                  "Pilote ton groupe comme une vraie opération de tournée.",
                  "Run your band like a real touring operation."
                )}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-mist-300">
                {t(
                  locale,
                  "BandOS remplace les discussions dispersées, notes, tableurs, dossiers Drive et contrats introuvables par un workspace moderne pour la logistique de tournée, le booking, le merch, la finance et les documents de voyage critiques.",
                  "BandOS replaces scattered chats, notes, sheets, drive folders, and buried contracts with one modern workspace for touring logistics, bookings, merch, finance, and critical travel documents."
                )}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/auth/sign-up"
                  className={buttonStyles({ variant: "primary", size: "lg" })}
                >
                  {t(locale, "Essayer gratuitement", "Start Free")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#pricing"
                  className={buttonStyles({ variant: "secondary", size: "lg" })}
                >
                  {t(locale, "Réserver une démo", "Book Demo")}
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-3 text-sm text-mist-300">
                {[
                  t(locale, "groupes DIY", "DIY bands"),
                  t(locale, "tour managers", "tour managers"),
                  t(locale, "labels", "labels"),
                  t(locale, "bookers", "booking agents"),
                  t(locale, "services tournée", "tour services")
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="space-y-4">
                <ScreenshotCard
                  title={t(locale, "Cockpit opérations", "Operations cockpit")}
                  body={t(
                    locale,
                    "Prochain concert, routing, merch et état des documents dans un seul centre de contrôle.",
                    "Next show, routing, merch, and travel readiness in one live control plane."
                  )}
                >
                  <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[24px] border border-white/8 bg-black/20 p-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
                        {t(locale, "Prochain concert", "Next show")}
                      </p>
                      <p className="mt-3 text-2xl font-semibold text-mist-50">
                        The Black Heart
                      </p>
                      <p className="mt-2 text-sm text-mist-300">
                        London • Sat 23 May • Load-in 16:00
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
                            {t(locale, "Confirmations en attente", "Pending confirms")}
                          </p>
                          <p className="mt-2 text-xl text-mist-50">6</p>
                        </div>
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                          <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
                            {t(locale, "Revenus merch", "Merch revenue")}
                          </p>
                          <p className="mt-2 text-xl text-mist-50">
                            {merchRevenue}
                          </p>
                        </div>
                      </div>
                    </div>
                    <RouteMap compact locale={locale} />
                  </div>
                </ScreenshotCard>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow={t(locale, "Construit avec des groupes en tournée", "Built with touring bands")}
            title={t(
              locale,
              "Pensé en collaboration directe avec Widespread Disease.",
              "Shaped in close collaboration with Widespread Disease."
            )}
            body={t(
              locale,
              "L'identité du workspace et le flow de démo actuel sont calibrés autour d'un vrai groupe qui opère dans le produit.",
              "The current workspace identity and demo flow are tuned around one real band operating inside the product."
            )}
          />
          <div className="mt-8 grid gap-4 sm:max-w-sm">
            {trustedBands.map((band) => (
              <Card
                key={band.name}
                className="flex flex-col items-center justify-center gap-4 py-6 text-center text-sm font-medium text-mist-100"
              >
                <WorkspaceLogo
                  src={band.logo}
                  alt={`${band.name} logo`}
                  size="lg"
                  className="h-24 w-24 rounded-[30px]"
                  priority
                />
                <span>{band.name}</span>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow={t(locale, "Problème", "Problem")}
            title={t(
              locale,
              "Les groupes en tournée méritent un logiciel pensé pour le mouvement.",
              "Touring bands deserve software designed for movement."
            )}
            body={t(
              locale,
              "BandOS n'est ni un réseau social ni une plateforme fan. C'est un workspace opérationnel professionnel pour les groupes en tournée.",
              "BandOS is not a social network and not a fan platform. It is a professional operational workspace for bands on tour."
            )}
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {landingProblems.map((problem, index) => (
              <Card key={problem.title} className={index === 1 ? "lg:-mt-6" : ""}>
                <p className="text-lg font-medium text-mist-50">{problem.title}</p>
                <p className="mt-3 text-sm leading-7 text-mist-300">
                  {problem.body}
                </p>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Features"
            title="Every core touring workflow in one premium stack."
            body="Routing, show operations, documents, merch, providers, and finance all live in the same interface."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureCards.map((feature, index) => (
              <Card key={feature.title} className={index === 0 ? "xl:col-span-2" : ""}>
                <p className="text-xl font-medium text-mist-50">{feature.title}</p>
                <p className="mt-3 text-sm leading-7 text-mist-300">{feature.body}</p>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Screenshots"
            title="Designed to feel like premium operations software."
            body="BandOS borrows the confidence of modern SaaS dashboards while staying grounded in touring reality."
          />
          <div className="mt-8 grid gap-4 xl:grid-cols-3">
            <ScreenshotCard
              title="Booking CRM"
              body="Tags, statuses, venue history, and real pipeline management."
            >
              <div className="space-y-3">
                {[
                  ["The Black Heart", "confirmed", "£150 guarantee"],
                  ["The Peer Hat", "negotiating", "70/30 split"],
                  ["Baroeg", "replied", "EPK requested"]
                ].map(([name, status, deal]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-mist-50">{name}</p>
                      <Badge
                        tone={status === "confirmed" ? "success" : "accent"}
                      >
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-mist-300">
                      {replaceCurrencyInText(deal, currencyPreference)}
                    </p>
                  </div>
                ))}
              </div>
            </ScreenshotCard>

            <ScreenshotCard
              title="Tour services"
              body="Vetted transport and support providers with cost and fit signals."
            >
              <div className="space-y-3">
                {[
                  ["Nomads of Prague", "Sleeper setup", "£680/day"],
                  ["Beat The Street", "B license compatible", "£420/day"],
                  ["IBEX Touring", "Driver included", "£760/day"]
                ].map(([name, tag, price]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-mist-50">{name}</p>
                      <p className="text-sm text-mist-200">
                        {replaceCurrencyInText(price, currencyPreference)}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-coral-300">{tag}</p>
                  </div>
                ))}
              </div>
            </ScreenshotCard>

            <ScreenshotCard
              title="Finance and docs"
              body="Profit visibility, exports, and operational files in one place."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3 text-mist-50">
                    <CreditCard className="h-4 w-4 text-coral-300" />
                    Tour balance
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-mist-50">
                    {financeBalance}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm text-mist-200">
                      <FileStack className="h-4 w-4 text-coral-300" />
                      32 files attached
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-sm text-mist-200">
                      <ShieldCheck className="h-4 w-4 text-coral-300" />
                      Border docs 82%
                    </div>
                  </div>
                </div>
              </div>
            </ScreenshotCard>
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Workflow"
            title="One workflow from first hold to final settlement."
            body="BandOS keeps planning and operating in the same system so nothing gets lost between booking and show day."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <Card key={step.title}>
                <p className="text-xs uppercase tracking-[0.24em] text-coral-300">
                  0{index + 1}
                </p>
                <p className="mt-4 text-xl font-medium text-mist-50">
                  {step.title}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist-300">
                  {step.body}
                </p>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Testimonials"
            title="Credible for the people actually carrying the run."
            body="Built to feel at home for artists, managers, drivers, labels, and agents who operate under pressure."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.author}>
                <p className="text-base leading-8 text-mist-100">
                  “{testimonial.quote}”
                </p>
                <div className="mt-6">
                  <p className="font-medium text-mist-50">{testimonial.author}</p>
                  <p className="text-sm text-mist-300">{testimonial.title}</p>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section id="pricing" className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="Pricing"
            title="Priced like operational software, not a fan tool."
            body="Choose the right level for DIY bands, touring teams, or full roster operations."
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.featured ? "border-coral-500/20 bg-coral-500/10" : ""}
              >
                <p className="text-sm uppercase tracking-[0.24em] text-mist-300">
                  {plan.name}
                </p>
                <p className="mt-3 text-4xl font-semibold text-mist-50">
                  {replaceCurrencyInText(plan.price, currencyPreference)}
                </p>
                <p className="mt-3 text-sm leading-7 text-mist-300">
                  {plan.description}
                </p>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div
                      key={feature}
                      className="rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-mist-100"
                    >
                      {feature}
                    </div>
                  ))}
                </div>
                <Link
                  href="/auth/sign-up"
                  className={buttonStyles({
                    variant: plan.featured ? "primary" : "secondary",
                    className: "mt-6 w-full"
                  })}
                >
                  Start with {plan.name}
                </Link>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-6">
        <FadeIn>
          <SectionHeading
            eyebrow="FAQ"
            title="Clear answers for touring teams."
          />
          <div className="mt-8 space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <p className="text-lg font-medium text-mist-50">{faq.question}</p>
                <p className="mt-3 text-sm leading-7 text-mist-300">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </FadeIn>
      </section>

      <footer className="mx-auto mt-24 max-w-7xl px-6">
        <Card className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <BandosLogo />
            <p className="mt-4 max-w-xl text-sm leading-7 text-mist-300">
              The operating system for bands on tour.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-mist-300 sm:text-right">
            <div className="flex items-center gap-2 sm:justify-end">
              <Truck className="h-4 w-4 text-coral-300" />
              Tour services and routing
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <MapPinned className="h-4 w-4 text-coral-300" />
              Travel docs and routing
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <Globe2 className="h-4 w-4 text-coral-300" />
              Multi-role operational workspaces
            </div>
          </div>
        </Card>
      </footer>
    </main>
  );
}
