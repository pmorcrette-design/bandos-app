import { NextResponse } from "next/server";

import { computeDemoRoute } from "@/lib/routing/demo";
import { computeGoogleRoute } from "@/lib/routing/google-routes";
import { computeOpenStreetMapRoute } from "@/lib/routing/openstreetmap-osrm";
import type { RoutePlannerRequest } from "@/lib/routing/types";

export async function POST(request: Request) {
  let payload: RoutePlannerRequest;

  try {
    payload = (await request.json()) as RoutePlannerRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  if (!payload?.tourId || !Array.isArray(payload.points) || payload.points.length < 2) {
    return NextResponse.json(
      { error: "A tour id and at least two route points are required." },
      { status: 400 }
    );
  }

  try {
    const result = await computeGoogleRoute(payload);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    const googleMessage =
      error instanceof Error ? error.message : "Google route calculation failed.";

    try {
      const osmResult = await computeOpenStreetMapRoute(payload);
      return NextResponse.json(
        {
          ...osmResult,
          warnings: [
            `Google Routes fallback: ${googleMessage}`,
            ...osmResult.warnings
          ]
        },
        { status: 200 }
      );
    } catch (osmError) {
      const osmMessage =
        osmError instanceof Error ? osmError.message : "OpenStreetMap route calculation failed.";
      const demoResult = computeDemoRoute(
        payload,
        `Google Routes fallback: ${googleMessage}`,
      );

      return NextResponse.json(
        {
          ...demoResult,
          warnings: [...demoResult.warnings, `OpenStreetMap fallback: ${osmMessage}`]
        },
        { status: 200 }
      );
    }
  }
}
