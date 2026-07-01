import type {
  RouteComputationResult,
  RouteLegResult,
  RoutePlannerPoint,
  RoutePlannerRequest
} from "@/lib/routing/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildMappyDirectionsUrl,
  buildOpenStreetMapDirectionsUrl
} from "@/lib/routing/urls";

type GeocodedPoint = {
  id: string;
  label: string;
  location: string;
  kind: RoutePlannerPoint["kind"];
  latitude: number;
  longitude: number;
  routePoint: RoutePlannerPoint;
};

type GeocodeCacheEntry = {
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
const geocodeCache = new Map<string, GeocodeCacheEntry>();
let lastNominatimRequestAt = 0;
const OPTIONAL_BOUNDARY_KINDS = new Set<RoutePlannerPoint["kind"]>([
  "start",
  "return"
]);

function normalizeQueryKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeGeocodingQuery(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .replace(/,+/g, ",")
    .replace(/\s*;\s*/g, ", ")
    .trim()
    .replace(/^,\s*|\s*,$/g, "");
}

function isPlaceholderBoundaryQuery(query: string, label: string) {
  const normalizedQuery = normalizeQueryKey(query);
  const normalizedLabel = normalizeQueryKey(label);

  if (!normalizedQuery) {
    return true;
  }

  if (normalizedQuery === normalizedLabel) {
    return true;
  }

  return ["depart", "departure", "retour", "return"].includes(normalizedQuery);
}

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
  point: RoutePlannerPoint
): Promise<GeocodedPoint> {
  const query = normalizeGeocodingQuery(point.location);

  if (!query) {
    throw new Error(`No address was provided for ${point.label}.`);
  }

  const cacheKey = query.toLowerCase();
  const cached = geocodeCache.get(cacheKey);

  if (cached) {
    return {
      id: point.id,
      label: point.label,
      location: cached.location,
      kind: point.kind,
      latitude: cached.latitude,
      longitude: cached.longitude,
      routePoint: {
        ...point,
        location: cached.location
      }
    };
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
      `Nominatim request failed with status ${response.status} for ${point.label}.`
    );
  }

  const data = (await response.json()) as NominatimSearchResult;
  const match = data[0];

  if (!match) {
    throw new Error(
      `No OpenStreetMap geocoding match found for ${point.label} (${query}).`
    );
  }

  const geocodedPoint = {
    id: point.id,
    label: point.label,
    location: query,
    kind: point.kind,
    latitude: Number(match.lat),
    longitude: Number(match.lon),
    routePoint: {
      ...point,
      location: query
    }
  };

  geocodeCache.set(cacheKey, {
    location: geocodedPoint.location,
    latitude: geocodedPoint.latitude,
    longitude: geocodedPoint.longitude
  });
  return geocodedPoint;
}

async function geocodeRoutePoint(point: RoutePlannerPoint) {
  const normalizedQuery = normalizeGeocodingQuery(point.location);

  if (
    OPTIONAL_BOUNDARY_KINDS.has(point.kind) &&
    isPlaceholderBoundaryQuery(normalizedQuery, point.label)
  ) {
    return {
      geocodedPoint: null,
      warning: `OpenStreetMap skipped ${point.label.toLowerCase()} because the address is incomplete. Enter a real street address to include this leg in the live route.`
    };
  }

  try {
    return {
      geocodedPoint: await geocodeAddress({
        ...point,
        location: normalizedQuery
      }),
      warning: null
    };
  } catch (error) {
    if (!OPTIONAL_BOUNDARY_KINDS.has(point.kind)) {
      throw error;
    }

    const details =
      error instanceof Error ? error.message : `Unable to geocode ${point.label}.`;

    return {
      geocodedPoint: null,
      warning: `${details} ${
        point.kind === "start"
          ? "The departure leg was excluded from the live route."
          : "The return leg was excluded from the live route."
      }`
    };
  }
}

export async function computeOpenStreetMapRoute(
  request: RoutePlannerRequest
): Promise<RouteComputationResult> {
  if (request.points.length < 2) {
    throw new Error("At least two route points are required.");
  }

  const geocodedPoints: GeocodedPoint[] = [];
  const warnings: string[] = [];

  for (const point of request.points) {
    const result = await geocodeRoutePoint(point);

    if (result.warning) {
      warnings.push(result.warning);
    }

    if (result.geocodedPoint) {
      geocodedPoints.push(result.geocodedPoint);
    }
  }

  if (geocodedPoints.length < 2) {
    throw new Error(
      "OpenStreetMap could not compute a live route because fewer than two route points could be geocoded."
    );
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
        fromPointId: from.id,
        toPointId: to.id,
        from: from.label,
        to: to.label,
        distanceMeters: leg.distance,
        durationSeconds: Math.round(leg.duration),
        staticDurationSeconds: Math.round(leg.duration),
        googleMapsUrl: buildGoogleMapsDirectionsUrl([
          from.routePoint,
          to.routePoint
        ]),
        mappyUrl: buildMappyDirectionsUrl(from.location, to.location),
        openStreetMapUrl: buildOpenStreetMapDirectionsUrl(from, to)
      };
    }) ?? [];

  const origin = geocodedPoints[0];
  const destination = geocodedPoints[geocodedPoints.length - 1];
  const activeRoutePoints = geocodedPoints.map((point) => point.routePoint);

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
    googleMapsUrl: buildGoogleMapsDirectionsUrl(activeRoutePoints),
    mappyUrl: buildMappyDirectionsUrl(origin.location, destination.location),
    openStreetMapUrl: buildOpenStreetMapDirectionsUrl(origin, destination),
    warnings: [
      ...warnings,
      "OpenStreetMap mode uses the public Nominatim and OSRM services for local testing. For production, use your own hosted or commercial routing stack."
    ]
  };
}
