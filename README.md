# BandOS

BandOS is a premium touring operations workspace for bands, tour managers, labels, and booking teams. This project is built with Next.js, TypeScript, Tailwind CSS, Framer Motion, Zustand, Prisma, and PostgreSQL-oriented schema design.

## Product highlights

- Dark premium SaaS landing page with polished product storytelling
- Protected workspace shell with onboarding and demo auth
- Touring modules for tours, shows, booking CRM, services, finance, merch, EPK, tasks, documents, team, and settings
- Realistic touring mock data for routing, documents, and cross-border workflows
- Merch inventory manager with stock cost, sale price, margins, reorder thresholds, and location-aware stock
- Show economics with room hire, ticket price, venue capacity, and break-even visibility
- Command palette, keyboard shortcuts, responsive layouts, empty states, and skeleton loaders
- Google Routes API integration for in-app route computation with Mappy and Google Maps deep-links

## Getting started

1. Install dependencies with `npm install`
2. Copy `.env.example` to `.env`
3. Optionally set `GOOGLE_MAPS_API_KEY` if you want live Google route calculation
4. Optionally set `SUMUP_API_KEY`, `SUMUP_MERCHANT_CODE`, and `SUMUP_READER_ID` if you want live SumUp connection status and transaction sync
5. Run `npm run dev`
6. Open `http://localhost:3000`

## Route planning

- The tour builder calls `POST /api/routing/compute` to calculate itineraries.
- If `GOOGLE_MAPS_API_KEY` is configured, the app tries Google Maps Platform Routes API first.
- If the key is missing or Google fails, the app falls back to OpenStreetMap using Nominatim for geocoding and OSRM for routing.
- If both live providers fail, BandOS falls back to a deterministic demo estimate so the UI remains testable locally.
- Each route leg includes a direct OpenStreetMap URL and Mappy handoff URL, while the full itinerary keeps a Google Maps deep-link for waypoint sharing.
- The public Nominatim usage policy limits requests to roughly 1 request per second and requires app identification. BandOS throttles these requests server-side for local testing.
- For production, point `NOMINATIM_BASE_URL` and `OSRM_BASE_URL` to your own hosted or commercial endpoints.

## Auth model

The current implementation includes a working demo auth flow using secure cookies so protected routes function immediately without external setup. Prisma models and environment placeholders are included to support a future database-backed auth layer and Google OAuth wiring.

## SumUp integration

- BandOS includes a SumUp connection layer in Settings and Merch.
- If `SUMUP_API_KEY` and `SUMUP_MERCHANT_CODE` are configured, BandOS checks merchant connectivity and can pull recent transaction history from SumUp.
- If `SUMUP_READER_ID` is also configured, the app marks reader-driven checkout flows as ready for future merch POS flows.
- A local JSON status endpoint is available at `GET /api/integrations/sumup/status`.
- For a single workspace, API keys are the easiest setup. For a multi-merchant SaaS rollout, SumUp OAuth 2.0 is the right path.
