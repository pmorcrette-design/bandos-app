import { t, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function RouteMap({
  compact = false,
  className,
  locale = "en",
  title = "London to Sheffield",
  distanceLabel = "1,046 km mapped",
  stops = []
}: {
  compact?: boolean;
  className?: string;
  locale?: Locale;
  title?: string;
  distanceLabel?: string;
  stops?: Array<{
    city: string;
    country: string;
    distance: string;
    note: string;
  }>;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(239,90,76,0.18),_transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6",
        className
      )}
    >
      <div className="absolute inset-0 bg-grid-fade bg-[size:40px_40px] opacity-30" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-mist-300">
              {t(locale, "Vue de route", "Route overview")}
            </p>
            <h3 className="mt-2 text-xl font-semibold text-mist-50">{title}</h3>
          </div>
          {!compact ? (
            <div className="rounded-full border border-coral-500/20 bg-coral-500/10 px-3 py-1 text-xs text-coral-300">
              {distanceLabel}
            </div>
          ) : null}
        </div>
        <div className="mt-8 space-y-4">
          {stops.length ? (
            stops.map((stop, index) => (
              <div
                key={`${stop.city}-${stop.country}-${stop.distance}-${index}`}
                className="grid grid-cols-[20px_1fr] gap-4"
              >
                <div className="relative flex justify-center">
                  <span className="mt-1 h-3 w-3 rounded-full bg-coral-400 shadow-[0_0_0_6px_rgba(239,90,76,0.12)]" />
                  {index < stops.length - 1 ? (
                    <span className="absolute top-5 h-14 w-px bg-gradient-to-b from-coral-400/80 to-white/10" />
                  ) : null}
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-mist-50">
                        {stop.city}
                      </p>
                      <p className="text-xs uppercase tracking-[0.2em] text-mist-300">
                        {stop.country}
                      </p>
                    </div>
                    <div className="text-right text-sm text-mist-200">
                      <p>{stop.distance}</p>
                      <p className="text-xs text-mist-300">{stop.note}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-mist-300">
              {t(
                locale,
                "Aucune route active pour le moment. Importe ou garde au moins une date visible pour remplir cette vue.",
                "No active route yet. Import or keep at least one visible show to populate this view."
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
