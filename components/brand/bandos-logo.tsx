import { cn } from "@/lib/utils";

export function BandosLogo({
  compact = false,
  className
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-10 w-10 rounded-2xl border border-white/10 bg-ink shadow-card">
        <div className="absolute left-2 top-[11px] h-1.5 w-5 rounded-full bg-coral-500" />
        <div className="absolute left-2 top-[18px] h-1.5 w-4 rounded-full bg-coral-500" />
        <div className="absolute left-2 top-[25px] h-1.5 w-3 rounded-full bg-coral-500" />
        <div className="absolute left-[17px] top-[7px] h-6 w-4 rounded-r-[10px] border-b-[5px] border-r-[5px] border-t-[5px] border-mist-50" />
      </div>
      {!compact ? (
        <div>
          <div className="text-lg font-semibold tracking-tight text-mist-50">
            Band<span className="text-coral-400">OS</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.28em] text-mist-300">
            Tour. Manage. Grow.
          </div>
        </div>
      ) : null}
    </div>
  );
}
