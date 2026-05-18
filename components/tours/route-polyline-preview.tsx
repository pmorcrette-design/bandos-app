"use client";

import { useMemo } from "react";

import { t, type Locale } from "@/lib/i18n";
import { decodePolyline } from "@/lib/routing/polyline";

export function RoutePolylinePreview({
  polyline,
  locale = "fr"
}: {
  polyline: string | null;
  locale?: Locale;
}) {
  const path = useMemo(() => {
    if (!polyline) {
      return null;
    }

    const points = decodePolyline(polyline);

    if (points.length < 2) {
      return null;
    }

    const longitudes = points.map((point) => point.longitude);
    const latitudes = points.map((point) => point.latitude);
    const minX = Math.min(...longitudes);
    const maxX = Math.max(...longitudes);
    const minY = Math.min(...latitudes);
    const maxY = Math.max(...latitudes);
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;

    return points
      .map((point, index) => {
        const x = ((point.longitude - minX) / width) * 100;
        const y = 100 - ((point.latitude - minY) / height) * 100;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [polyline]);

  if (!path) {
    return (
      <div className="flex h-48 items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-black/20 text-sm text-mist-300">
        {t(
          locale,
          "Le tracé apparaîtra ici dès qu'au moins deux dates valides seront routées.",
          "The route preview will appear here once at least two valid stops are routed."
        )}
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/8 bg-[radial-gradient(circle_at_top,_rgba(239,90,76,0.16),_transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
      <svg viewBox="0 0 100 100" className="h-48 w-full">
        <path
          d={path}
          fill="none"
          stroke="rgba(239,90,76,0.18)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="6"
        />
        <path
          d={path}
          fill="none"
          stroke="#ef5a4c"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
    </div>
  );
}
