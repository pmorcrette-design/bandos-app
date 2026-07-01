import type {
  RouteComputationResult,
  RouteLegResult,
  RoutePlannerRequest
} from "@/lib/routing/types";
import {
  buildGoogleMapsDirectionsUrl,
  buildMappyDirectionsUrl
} from "@/lib/routing/urls";

const AVERAGE_TOURING_SPEED_KMH = 72;

function getLegDistanceMeters(distanceKm: number | undefined, index: number) {
  if (typeof distanceKm === "number" && distanceKm > 0) {
    return Math.round(distanceKm * 1000);
  }

  if (index === 0) {
    return 0;
  }

  return 120_000;
}

export function computeDemoRoute(
  request: RoutePlannerRequest,
  warning?: string
): RouteComputationResult {
  const legs: RouteLegResult[] = request.points.slice(1).map((point, index) => {
    const previous = request.points[index];
    const distanceMeters = getLegDistanceMeters(
      point.distanceFromPreviousKm,
      index + 1
    );
    const durationSeconds =
      distanceMeters === 0
        ? 0
        : Math.round((distanceMeters / 1000 / AVERAGE_TOURING_SPEED_KMH) * 3600);

    return {
      index,
      fromPointId: previous.id,
      toPointId: point.id,
      from: previous.label,
      to: point.label,
      distanceMeters,
      durationSeconds,
      staticDurationSeconds: durationSeconds,
      googleMapsUrl: buildGoogleMapsDirectionsUrl([previous, point]),
      mappyUrl: buildMappyDirectionsUrl(previous.location, point.location),
      openStreetMapUrl: null
    };
  });

  const totalDistanceMeters = legs.reduce(
    (sum, leg) => sum + leg.distanceMeters,
    0
  );
  const totalDurationSeconds = legs.reduce(
    (sum, leg) => sum + leg.durationSeconds,
    0
  );

  return {
    tourId: request.tourId,
    source: "demo",
    googleLive: false,
    openStreetMapLive: false,
    distanceMeters: totalDistanceMeters,
    durationSeconds: totalDurationSeconds,
    staticDurationSeconds: totalDurationSeconds,
    polyline: null,
    legs,
    googleMapsUrl: buildGoogleMapsDirectionsUrl(request.points),
    mappyUrl: buildMappyDirectionsUrl(
      request.points[0]?.location ?? "",
      request.points[request.points.length - 1]?.location ?? ""
    ),
    openStreetMapUrl: null,
    warnings: warning ? [warning] : []
  };
}
