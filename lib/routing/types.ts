export type RoutePlannerOptions = {
  avoidTolls: boolean;
  avoidHighways: boolean;
  avoidFerries: boolean;
  departureTime?: string | null;
};

export type RoutePlannerPointKind = "start" | "show" | "return";

export type RoutePlannerPoint = {
  id: string;
  label: string;
  location: string;
  kind?: RoutePlannerPointKind;
  distanceFromPreviousKm?: number;
};

export type RoutePlannerRequest = {
  tourId: string;
  points: RoutePlannerPoint[];
  options: RoutePlannerOptions;
};

export type RouteLegResult = {
  index: number;
  fromPointId: string | null;
  toPointId: string | null;
  from: string;
  to: string;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number | null;
  googleMapsUrl: string;
  mappyUrl: string;
  openStreetMapUrl: string | null;
};

export type RouteComputationSource = "google-routes" | "osm-osrm" | "demo";

export type RouteComputationResult = {
  tourId: string;
  source: RouteComputationSource;
  googleLive: boolean;
  openStreetMapLive: boolean;
  distanceMeters: number;
  durationSeconds: number;
  staticDurationSeconds: number | null;
  polyline: string | null;
  legs: RouteLegResult[];
  googleMapsUrl: string;
  mappyUrl: string;
  openStreetMapUrl: string | null;
  warnings: string[];
};
