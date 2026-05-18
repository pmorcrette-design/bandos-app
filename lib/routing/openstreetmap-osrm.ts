import type {
  RouteComputationResult,
  RouteLegResult,
  RoutePlannerRequest
} from "@/lib/routing/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildMappyDirectionsUrl,
  buildOpenStreetMapDirectionsUrl
} from "@/lib/routing/urls";

type GeocodedPoint = {
  label: string;
  location: string;
  latitude: number;
  longitude: number;
};

type NominatimSearchResult = Array<{
  lat: string;
  lon: string;
  display_name: string;
}>;

type OsrmRouteResponse = {
  code: string;
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: string;
    legs?: Array<{
      distance: number;
      duration: number;
    }>;
  }>;
};

const NOMINATIM_BASE_URL =
  process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL ?? "https://router.project-osrm.org";
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const geocodeCache = new Map<string, GeocodedPoint>();
let lastNominatimRequestAt = 0;

function sleep(durationMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}

async function throttleNominatim() {
  const now = Date.now();
  const elapsed = now - lastNominatimRequestAt;

  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await sleep(NOMINATIM_MIN_INTERVAL_MS - elapsed);
  }

  lastNominatimRequestAt = Date.now();
}

async function geocodeAddress(
  query: string,
  label: string
): Promise<GeocodedPoint> {
  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  await throttleNominatim();

  const searchParams = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1"
  });

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?${searchParams.toString()}`,
    {
      headers: {
        "User-Agent": "BandOS/0.1 (touring route planner)",
        Referer: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(
      `Nominatim request failed with status ${response.status} for ${label}.`
    );
  }

  const data = (await response.json()) as NominatimSearchResult;
  const match = data[0];

  if (!match) {
    throw new Error(`No OpenStreetMap geocoding match found for ${label}.`);
  }

  const point = {
    label,
    location: query,
    latitude: Number(match.lat),
    longitude: Number(match.lon)
  };

  geocodeCache.set(cacheKey, point);
  return point;
}

export async function computeOpenStreetMapRoute(
  request: RoutePlannerRequest
): Promise<RouteComputationResult> {
  if (request.points.length < 2) {
    throw new Error("At least two route points are required.");
  }

  const geocodedPoints: GeocodedPoint[] = [];

  for (const point of request.points) {
    geocodedPoints.push(await geocodeAddress(point.location, point.label));
  }

  const coordinateList = geocodedPoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");
  const searchParams = new URLSearchParams({
    overview: "full",
    geometries: "polyline",
    steps: "false"
  });

  const response = await fetch(
    `${OSRM_BASE_URL}/route/v1/driving/${coordinateList}?${searchParams.toString()}`,
    {
      headers: {
        "User-Agent": "BandOS/0.1 (touring route planner)"
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`OSRM request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as OsrmRouteResponse;

  if (data.code !== "Ok" || !data.routes?.[0]) {
    throw new Error(
      `OSRM route computation failed${data.code ? ` (${data.code})` : ""}.`
    );
  }

  const route = data.routes[0];

  const legs: RouteLegResult[] =
    route.legs?.map((leg, index) => {
      const from = geocodedPoints[index];
      const to = geocodedPoints[index + 1];
      return {
        index,
        from: from.label,
        to: to.label,
        distanceMeters: leg.distance,
        durationSeconds: Math.round(leg.duration),
        staticDurationSeconds: Math.round(leg.duration),
        googleMapsUrl: buildGoogleMapsDirectionsUrl([
          request.points[index],
          request.points[index + 1]
        ]),
        mappyUrl: buildMappyDirectionsUrl(from.location, to.location),
        openStreetMapUrl: buildOpenStreetMapDirectionsUrl(from, to)
      };
    }) ?? [];

  const origin = geocodedPoints[0];
  const destination = geocodedPoints[geocodedPoints.length - 1];

  return {
    tourId: request.tourId,
    source: "osm-osrm",
    googleLive: false,
    openStreetMapLive: true,
    distanceMeters: route.distance,
    durationSeconds: Math.round(route.duration),
    staticDurationSeconds: Math.round(route.duration),
    polyline: route.geometry ?? null,
    legs,
    googleMapsUrl: buildGoogleMapsDirectionsUrl(request.points),
    mappyUrl: buildMappyDirectionsUrl(origin.location, destination.location),
    openStreetMapUrl: buildOpenStreetMapDirectionsUrl(origin, destination),
    warnings: [
      "OpenStreetMap mode uses the public Nominatim and OSRM services for local testing. For production, use your own hosted or commercial routing stack."
    ]
  };
}
