import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { normalizeLocale, type Locale } from "@/lib/i18n";

type ContextPayload = {
  address?: string;
  city?: string;
  country?: string;
  venue?: string;
  locale?: Locale;
};

type GeocodeResult = {
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

function buildQueries(payload: ContextPayload) {
  const queries = [
    [payload.address, payload.city, payload.country].filter(Boolean).join(" "),
    [payload.venue, payload.city, payload.country].filter(Boolean).join(" "),
    [payload.city, payload.country].filter(Boolean).join(" ")
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(new Set(queries));
}

async function geocodeLocation(query: string, locale: Locale) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query
    )}&count=1&language=${locale}&format=json`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Geocoding failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    results?: Array<{
      name?: string;
      country?: string;
      timezone?: string;
      latitude?: number;
      longitude?: number;
    }>;
  };

  const match = payload.results?.[0];

  if (
    !match ||
    typeof match.latitude !== "number" ||
    typeof match.longitude !== "number" ||
    !match.timezone
  ) {
    return null;
  }

  return {
    name: match.name ?? query,
    country: match.country ?? "",
    timezone: match.timezone,
    latitude: match.latitude,
    longitude: match.longitude
  } satisfies GeocodeResult;
}

function buildWarning(params: {
  rainProbability: number | null;
  windSpeed: number | null;
  apparentTemperature: number | null;
  locale: Locale;
}) {
  if ((params.rainProbability ?? 0) >= 70) {
    return params.locale === "fr"
      ? "Fort risque de pluie sur place."
      : "Heavy rain risk on site.";
  }

  if ((params.windSpeed ?? 0) >= 35) {
    return params.locale === "fr"
      ? "Vent fort attendu autour de la date."
      : "High winds expected around show time.";
  }

  if ((params.apparentTemperature ?? 0) >= 30) {
    return params.locale === "fr"
      ? "Chaleur élevée attendue aujourd'hui."
      : "High heat expected today.";
  }

  if (
    params.apparentTemperature !== null &&
    params.apparentTemperature <= 0
  ) {
    return params.locale === "fr"
      ? "Température très basse prévue aujourd'hui."
      : "Very low temperature expected today.";
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getSessionUser();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: ContextPayload;

  try {
    payload = (await request.json()) as ContextPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const locale = normalizeLocale(payload.locale);
  const queries = buildQueries(payload);

  if (!queries.length) {
    return NextResponse.json({ context: null }, { status: 200 });
  }

  let geocodeMatch: GeocodeResult | null = null;

  for (const query of queries) {
    try {
      geocodeMatch = await geocodeLocation(query, locale);
    } catch {
      geocodeMatch = null;
    }

    if (geocodeMatch) {
      break;
    }
  }

  if (!geocodeMatch) {
    return NextResponse.json({ context: null }, { status: 200 });
  }

  const forecastResponse = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${geocodeMatch.latitude}&longitude=${geocodeMatch.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,weather_code,precipitation_probability&daily=sunrise,sunset,uv_index_max&forecast_days=1&timezone=${encodeURIComponent(
      geocodeMatch.timezone
    )}`,
    {
      method: "GET",
      cache: "no-store"
    }
  );

  if (!forecastResponse.ok) {
    return NextResponse.json(
      {
        context: {
          ...geocodeMatch,
          currentTime: new Intl.DateTimeFormat("en-GB", {
            timeZone: geocodeMatch.timezone,
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          }).format(new Date()),
          temperature: null,
          apparentTemperature: null,
          humidity: null,
          windSpeed: null,
          rainProbability: null,
          weatherCode: null,
          sunrise: null,
          sunset: null,
          uvIndex: null,
          hourlyForecast: [],
          warning: null
        }
      },
      { status: 200 }
    );
  }

  const forecastPayload = (await forecastResponse.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      wind_speed_10m?: number;
      weather_code?: number;
    };
    hourly?: {
      time?: string[];
      temperature_2m?: number[];
      weather_code?: number[];
      precipitation_probability?: number[];
    };
    daily?: {
      sunrise?: string[];
      sunset?: string[];
      uv_index_max?: number[];
    };
  };

  const currentTimeKey = forecastPayload.current?.time ?? null;
  const hourlyTime = forecastPayload.hourly?.time ?? [];
  const currentIndex = currentTimeKey ? hourlyTime.indexOf(currentTimeKey) : 0;
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const hourlyForecast = hourlyTime.slice(safeIndex, safeIndex + 8).map((time, index) => ({
    time,
    temperature:
      forecastPayload.hourly?.temperature_2m?.[safeIndex + index] ?? null,
    weatherCode:
      forecastPayload.hourly?.weather_code?.[safeIndex + index] ?? null,
    precipitationProbability:
      forecastPayload.hourly?.precipitation_probability?.[safeIndex + index] ?? null
  }));

  const rainProbability =
    forecastPayload.hourly?.precipitation_probability?.[safeIndex] ?? null;
  const apparentTemperature =
    forecastPayload.current?.apparent_temperature ?? null;
  const windSpeed = forecastPayload.current?.wind_speed_10m ?? null;

  return NextResponse.json(
    {
      context: {
        ...geocodeMatch,
        currentTime: new Intl.DateTimeFormat("en-GB", {
          timeZone: geocodeMatch.timezone,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false
        }).format(new Date()),
        temperature: forecastPayload.current?.temperature_2m ?? null,
        apparentTemperature,
        humidity: forecastPayload.current?.relative_humidity_2m ?? null,
        windSpeed,
        rainProbability,
        weatherCode: forecastPayload.current?.weather_code ?? null,
        sunrise: forecastPayload.daily?.sunrise?.[0] ?? null,
        sunset: forecastPayload.daily?.sunset?.[0] ?? null,
        uvIndex: forecastPayload.daily?.uv_index_max?.[0] ?? null,
        hourlyForecast,
        warning: buildWarning({
          rainProbability,
          windSpeed,
          apparentTemperature,
          locale
        })
      }
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
