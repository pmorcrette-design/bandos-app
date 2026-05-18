import type { RoutePlannerPoint } from "@/lib/routing/types";

function normalizeLocation(value: string) {
  return value.trim();
}

type Coordinate = {
  latitude: number;
  longitude: number;
};

export function buildGoogleMapsDirectionsUrl(points: RoutePlannerPoint[]) {
  if (points.length < 2) {
    return "https://www.google.com/maps";
  }

  const [origin, ...remaining] = points;
  const destination = remaining[remaining.length - 1];
  const waypoints = remaining.slice(0, -1);
  const searchParams = new URLSearchParams({
    api: "1",
    origin: normalizeLocation(origin.location),
    destination: normalizeLocation(destination.location),
    travelmode: "driving"
  });

  if (waypoints.length > 0) {
    searchParams.set(
      "waypoints",
      waypoints.map((point) => normalizeLocation(point.location)).join("|")
    );
  }

  return `https://www.google.com/maps/dir/?${searchParams.toString()}`;
}

export function buildMappyDirectionsUrl(from: string, to: string) {
  return `https://fr.mappy.com/itineraire#/recherche/${encodeURIComponent(
    normalizeLocation(from)
  )}/${encodeURIComponent(normalizeLocation(to))}/`;
}

export function buildOpenStreetMapDirectionsUrl(
  from: Coordinate,
  to: Coordinate,
  engine = "fossgis_osrm_car"
) {
  const searchParams = new URLSearchParams({
    engine,
    route: `${from.latitude},${from.longitude};${to.latitude},${to.longitude}`
  });

  return `https://www.openstreetmap.org/directions?${searchParams.toString()}`;
}
