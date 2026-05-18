import type {
  RouteComputationResult,
  RoutePlannerPoint,
  RoutePlannerRequest
} from "@/lib/routing/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildMappyDirectionsUrl
} from "@/lib/routing/urls";

const GOOGLE_ROUTES_API_URL =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

type GoogleComputeRoutesResponse = {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: {
      encodedPolyline?: string;
    };
    legs?: Array<{
      distanceMeters?: number;
      duration?: string;
      staticDuration?: string;
    }>;
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};

function parseDurationSeconds(value: string | undefined) {
  if (!value) {
    return 0;
  }

  if (!value.endsWith("s")) {
    return Number(value) || 0;
  }

  return Number(value.slice(0, -1)) || 0;
}

function toGoogleWaypoint(point: RoutePlannerPoint) {
  return {
    address: point.location
  };
}

export function hasGoogleRoutesApiKey() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

export async function computeGoogleRoute(
  request: RoutePlannerRequest
): Promise<RouteComputationResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY is missing.");
  }

  if (request.points.length < 2) {
    throw new Error("At least two route points are required.");
  }

  const origin = request.points[0];
  const destination = request.points[request.points.length - 1];
  const intermediates = request.points.slice(1, -1);

  const response = await fetch(GOOGLE_ROUTES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.legs.distanceMeters,routes.legs.duration,routes.legs.staticDuration"
    },
    body: JSON.stringify({
      origin: toGoogleWaypoint(origin),
      destination: toGoogleWaypoint(destination),
      intermediates: intermediates.map((point) => ({
        waypoint: toGoogleWaypoint(point)
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: false,
      routeModifiers: {
        avoidTolls: request.options.avoidTolls,
        avoidHighways: request.options.avoidHighways,
        avoidFerries: request.options.avoidFerries
      },
      departureTime: request.options.departureTime || undefined,
      languageCode: "en-GB",
      units: "METRIC"
    }),
    cache: "no-store"
  });

  const data = (await response.json()) as GoogleComputeRoutesResponse;

  if (!response.ok || data.error) {
    const details =
      data.error?.message ||
      `Google Routes API request failed with status ${response.status}.`;
    throw new Error(details);
  }

  const route = data.routes?.[0];

  if (!route) {
    throw new Error("Google Routes API returned no route.");
  }

  const legs =
    route.legs?.map((leg, index) => {
      const from = request.points[index];
      const to = request.points[index + 1];

      return {
        index,
        from: from.label,
        to: to.label,
        distanceMeters: leg.distanceMeters ?? 0,
        durationSeconds: parseDurationSeconds(leg.duration),
        staticDurationSeconds: leg.staticDuration
          ? parseDurationSeconds(leg.staticDuration)
          : null,
        googleMapsUrl: buildGoogleMapsDirectionsUrl([from, to]),
        mappyUrl: buildMappyDirectionsUrl(from.location, to.location),
        openStreetMapUrl: null
      };
    }) ?? [];

  return {
    tourId: request.tourId,
    source: "google-routes",
    googleLive: true,
    openStreetMapLive: false,
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: parseDurationSeconds(route.duration),
    staticDurationSeconds: route.staticDuration
      ? parseDurationSeconds(route.staticDuration)
      : null,
    polyline: route.polyline?.encodedPolyline ?? null,
    legs,
    googleMapsUrl: buildGoogleMapsDirectionsUrl(request.points),
    mappyUrl: buildMappyDirectionsUrl(origin.location, destination.location),
    openStreetMapUrl: null,
    warnings: []
  };
}
