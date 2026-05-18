import { CreditCard, RadioTower } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { t, type Locale } from "@/lib/i18n";
import type { SumUpConnectionStatus } from "@/lib/integrations/sumup";

function formatTransactionAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(currency === "EUR" ? "fr-FR" : "en-GB", {
    style: "currency",
    currency
  }).format(amount);
}

function formatSyncDate(timestamp: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(timestamp));
}

function getConnectionTone(status: SumUpConnectionStatus) {
  if (status.connected) {
    return "success" as const;
  }

  if (status.configured) {
    return "warning" as const;
  }

  return "accent" as const;
}

export function SumUpConnectionCard({
  locale,
  status,
  compact = false
}: {
  locale: Locale;
  status: SumUpConnectionStatus;
  compact?: boolean;
}) {
  const infoTiles = [
    {
      label: t(locale, "Marchand", "Merchant"),
      value: status.merchantName ?? t(locale, "À connecter", "Not connected"),
      meta:
        status.defaultCurrency && status.defaultLocale
          ? `${status.defaultCurrency} • ${status.defaultLocale}`
          : status.merchantCode ?? "—"
    },
    {
      label: t(locale, "Transactions", "Transactions"),
      value: status.transactionSyncReady
        ? t(locale, "Historique prêt", "History ready")
        : t(locale, "Scopes manquants", "Missing scopes"),
      meta: status.lastSyncAt
        ? `${t(locale, "Synchro", "Synced")} ${formatSyncDate(status.lastSyncAt, locale)}`
        : t(locale, "Pas encore de synchro", "No sync yet")
    },
    {
      label: t(locale, "Reader", "Reader"),
      value:
        status.readerId && status.readerStatus
          ? `${status.readerStatus}${status.readerState ? ` • ${status.readerState}` : ""}`
          : status.readerId
            ? t(locale, "Configuré", "Configured")
            : t(locale, "Non renseigné", "Not set"),
      meta: status.readerId ?? t(locale, "Ajoute SUMUP_READER_ID", "Add SUMUP_READER_ID")
    }
  ];

  return (
    <Card className={compact ? "p-5" : undefined}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <CreditCard className="h-5 w-5 text-coral-300" />
            </div>
            <div>
              <p className="text-lg font-medium text-mist-50">SumUp</p>
              <p className="text-sm text-mist-300">
                {t(
                  locale,
                  "Sync merch, lecteur et historique de transactions.",
                  "Sync merch, reader status, and transaction history."
                )}
              </p>
            </div>
          </div>
        </div>
        <Badge tone={getConnectionTone(status)}>
          {status.connected
            ? t(locale, "Connecté", "Connected")
            : status.configured
              ? t(locale, "À finaliser", "Needs attention")
              : t(locale, "Prêt à brancher", "Ready to connect")}
        </Badge>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {infoTiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
          >
            <p className="text-[11px] uppercase tracking-[0.24em] text-mist-300">
              {tile.label}
            </p>
            <p className="mt-2 text-sm font-medium text-mist-50">{tile.value}</p>
            <p className="mt-1 text-sm text-mist-300">{tile.meta}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-white/8 bg-black/20 p-4 text-sm text-mist-200">
        {status.connected ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-mist-50">
                {status.merchantCode}
                {status.country ? ` • ${status.country}` : ""}
              </p>
              <p className="mt-1 text-mist-300">
                {t(
                  locale,
                  "API officielle SumUp branchée sur merchant, transactions history et reader status.",
                  "Official SumUp API wired to merchant, transaction history, and reader status."
                )}
              </p>
            </div>
            {status.readerStatus ? (
              <Badge tone={status.readerStatus === "ONLINE" ? "success" : "warning"}>
                <RadioTower className="mr-1 h-3 w-3" />
                {status.readerStatus}
              </Badge>
            ) : null}
          </div>
        ) : status.configured ? (
          <>
            <p className="font-medium text-mist-50">
              {t(locale, "Connexion incomplète", "Connection incomplete")}
            </p>
            <p className="mt-2 text-amber-200">
              {status.error ??
                t(
                  locale,
                  "BandOS n'arrive pas encore à joindre SumUp avec la configuration fournie.",
                  "BandOS cannot reach SumUp yet with the current configuration."
                )}
            </p>
          </>
        ) : (
          <>
            <p className="font-medium text-mist-50">
              {t(locale, "Variables à renseigner", "Environment variables to set")}
            </p>
            <p className="mt-2 text-mist-300">
              `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, `SUMUP_READER_ID`
            </p>
          </>
        )}
      </div>

      {!compact ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-mist-50">
            {t(locale, "Dernières transactions", "Latest transactions")}
          </p>
          <div className="mt-3 space-y-3">
            {status.recentTransactions.length ? (
              status.recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex flex-col gap-3 rounded-[24px] border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-mist-50">{transaction.id}</p>
                    <p className="mt-1 text-sm text-mist-300">
                      {transaction.paymentType} • {transaction.status}
                    </p>
                  </div>
                  <div className="text-sm text-mist-200 sm:text-right">
                    <p className="font-medium text-mist-50">
                      {formatTransactionAmount(transaction.amount, transaction.currency)}
                    </p>
                    <p className="mt-1">{transaction.timestamp || "—"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-white/10 p-4 text-sm text-mist-300">
                {t(
                  locale,
                  "Aucune transaction remontée pour l'instant.",
                  "No transactions synced yet."
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
