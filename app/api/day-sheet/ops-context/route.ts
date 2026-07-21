import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/session";
import { normalizeLocale, type Locale } from "@/lib/i18n";
import {
  findClosestForecastHourIndex,
  getCalendarDayDifference,
  getIsoDateInTimeZone,
  normalizeOpenMeteoDate,
  normalizeOpenMeteoTime
} from "@/lib/open-meteo";

type ContextPayload = {
  address?: string;
  city?: string;
  country?: string;
  venue?: string;
  date?: string;
  eventTime?: string;
  locale?: Locale;
};

type GeocodeResult = {
  name: string;
  country: string;
  timezone: string;
  latitude: number;
  longitude: number;
};

type ForecastUnavailableReason =
  | "invalid-date"
  | "past-date"
  | "outside-forecast-range"
  | "forecast-error";

type ForecastPayload = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    apparent_temperature?: number[];
    relative_humidity_2m?: number[];
    wind_speed_10m?: number[];
    weather_code?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
    uv_index_max?: number[];
  };
};

const OPEN_METEO_SOURCE_URL = "https://open-meteo.com/";
const openMeteoApiKey = process.env.OPEN_METEO_API_KEY?.trim() || null;

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

function getOpenMeteoUrl(kind: "geocoding" | "forecast") {
  if (kind === "geocoding") {
    return openMeteoApiKey
      ? "https://customer-geocoding-api.open-meteo.com/v1/search"
      : "https://geocoding-api.open-meteo.com/v1/search";
  }

  return openMeteoApiKey
    ? "https://customer-api.open-meteo.com/v1/forecast"
    : "https://api.open-meteo.com/v1/forecast";
}

function addApiKey(params: URLSearchParams) {
  if (openMeteoApiKey) {
    params.set("apikey", openMeteoApiKey);
  }
}

async function geocodeLocation(query: string, locale: Locale) {
  const params = new URLSearchParams({
    name: query,
    count: "1",
    language: locale,
    format: "json"
  });
  addApiKey(params);
  const response = await fetch(`${getOpenMeteoUrl("geocoding")}?${params}`, {
    method: "GET",
    next: { revalidate: 604_800 }
  });

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

function getLocalTime(timezone: string, date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function buildWarning(params: {
  rainProbability: number | null;
  windSpeed: number | null;
  apparentTemperature: number | null;
  locale: Locale;
}) {
  if ((params.rainProbability ?? 0) >= 70) {
    return params.locale === "fr"
      ? "Fort risque de pluie autour du concert."
      : "Heavy rain risk around show time.";
  }

  if ((params.windSpeed ?? 0) >= 35) {
    return params.locale === "fr"
      ? "Vent fort attendu autour du concert."
      : "High winds expected around show time.";
  }

  if ((params.apparentTemperature ?? 0) >= 30) {
    return params.locale === "fr"
      ? "Chaleur élevée attendue autour du concert."
      : "High heat expected around show time.";
  }

  if (params.apparentTemperature !== null && params.apparentTemperature <= 0) {
    return params.locale === "fr"
      ? "Température très basse prévue autour du concert."
      : "Very low temperature expected around show time.";
  }

  return null;
}

function buildUnavailableContext(
  geocodeMatch: GeocodeResult,
  forecastDate: string | null,
  forecastTime: string | null,
  reason: ForecastUnavailableReason
) {
  return {
    ...geocodeMatch,
    currentTime: getLocalTime(geocodeMatch.timezone),
    forecastDate,
    forecastTime,
    forecastStatus: "unavailable" as const,
    weatherUnavailableReason: reason,
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
    warning: null,
    sourceName: "Open-Meteo",
    sourceUrl: OPEN_METEO_SOURCE_URL
  };
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

  const localNow = new Date();
  const today = getIsoDateInTimeZone(localNow, geocodeMatch.timezone);
  const requestedDate = normalizeOpenMeteoDate(payload.date);
  const requestedTime = normalizeOpenMeteoTime(payload.eventTime);

  if (payload.date?.trim() && !requestedDate) {
    return NextResponse.json({
      context: buildUnavailableContext(
        geocodeMatch,
        null,
        requestedTime,
        "invalid-date"
      )
    });
  }

  const forecastDate = requestedDate ?? today;
  const dayOffset = getCalendarDayDifference(today, forecastDate);
  const forecastTime =
    requestedTime ?? (dayOffset === 0 ? getLocalTime(geocodeMatch.timezone, localNow) : "18:00");

  if (dayOffset === null || dayOffset < 0) {
    return NextResponse.json({
      context: buildUnavailableContext(
        geocodeMatch,
        forecastDate,
        forecastTime,
        "past-date"
      )
    });
  }

  // Open-Meteo exposes today plus the following 15 calendar days.
  if (dayOffset > 15) {
    return NextResponse.json({
      context: buildUnavailableContext(
        geocodeMatch,
        forecastDate,
        forecastTime,
        "outside-forecast-range"
      )
    });
  }

  const forecastParams = new URLSearchParams({
    latitude: String(geocodeMatch.latitude),
    longitude: String(geocodeMatch.longitude),
    hourly:
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,precipitation_probability",
    daily: "sunrise,sunset,uv_index_max",
    start_date: forecastDate,
    end_date: forecastDate,
    timezone: geocodeMatch.timezone,
    temperature_unit: "celsius",
    wind_speed_unit: "kmh"
  });
  addApiKey(forecastParams);
  const forecastResponse = await fetch(
    `${getOpenMeteoUrl("forecast")}?${forecastParams}`,
    {
      method: "GET",
      next: { revalidate: 1_800 }
    }
  );

  if (!forecastResponse.ok) {
    return NextResponse.json({
      context: buildUnavailableContext(
        geocodeMatch,
        forecastDate,
        forecastTime,
        "forecast-error"
      )
    });
  }

  const forecastPayload = (await forecastResponse.json()) as ForecastPayload;
  const hourlyTime = forecastPayload.hourly?.time ?? [];
  const targetIndex = findClosestForecastHourIndex(
    hourlyTime,
    forecastDate,
    forecastTime
  );

  if (targetIndex < 0) {
    return NextResponse.json({
      context: buildUnavailableContext(
        geocodeMatch,
        forecastDate,
        forecastTime,
        "forecast-error"
      )
    });
  }

  const hourlyForecast = hourlyTime
    .slice(targetIndex, targetIndex + 8)
    .map((time, index) => ({
      time,
      temperature:
        forecastPayload.hourly?.temperature_2m?.[targetIndex + index] ?? null,
      weatherCode:
        forecastPayload.hourly?.weather_code?.[targetIndex + index] ?? null,
      precipitationProbability:
        forecastPayload.hourly?.precipitation_probability?.[targetIndex + index] ??
        null
    }));
  const rainProbability =
    forecastPayload.hourly?.precipitation_probability?.[targetIndex] ?? null;
  const apparentTemperature =
    forecastPayload.hourly?.apparent_temperature?.[targetIndex] ?? null;
  const windSpeed = forecastPayload.hourly?.wind_speed_10m?.[targetIndex] ?? null;

  return NextResponse.json(
    {
      context: {
        ...geocodeMatch,
        currentTime: getLocalTime(geocodeMatch.timezone, localNow),
        forecastDate,
        forecastTime: hourlyTime[targetIndex]?.slice(11, 16) || forecastTime,
        forecastStatus: "forecast",
        weatherUnavailableReason: null,
        temperature: forecastPayload.hourly?.temperature_2m?.[targetIndex] ?? null,
        apparentTemperature,
        humidity:
          forecastPayload.hourly?.relative_humidity_2m?.[targetIndex] ?? null,
        windSpeed,
        rainProbability,
        weatherCode: forecastPayload.hourly?.weather_code?.[targetIndex] ?? null,
        sunrise: forecastPayload.daily?.sunrise?.[0] ?? null,
        sunset: forecastPayload.daily?.sunset?.[0] ?? null,
        uvIndex: forecastPayload.daily?.uv_index_max?.[0] ?? null,
        hourlyForecast,
        warning: buildWarning({
          rainProbability,
          windSpeed,
          apparentTemperature,
          locale
        }),
        sourceName: "Open-Meteo",
        sourceUrl: OPEN_METEO_SOURCE_URL
      }
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate"
      }
    }
  );
}
