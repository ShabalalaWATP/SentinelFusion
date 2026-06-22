# Architecture

## Monorepo

```text
apps/
  api/       Fastify backend, AIS and aircraft ingestion, OSINT context, analysis, WebSockets
  web/       React/Vite dashboard, MapLibre map, Tailwind UI
packages/
  shared/    Zod schemas and TypeScript contracts shared by API and web
```

## Backend Responsibilities

- Validate configuration at startup.
- Own all external AISstream, OpenAI, flight-provider, FIRMS, and ACLED credentials.
- Run AIS ingestion in mock, replay, or live AISstream mode.
- Run aircraft ingestion in mock, replay, or live provider mode.
- Parse AISstream envelopes and normalise AIS-like messages into shared vessel records.
- Normalise flight-provider responses into shared aircraft records.
- Store latest vessel and aircraft state in in-memory repositories.
- Broadcast normalised vessel and aircraft updates over backend WebSockets.
- Expose health, vessel snapshot, aircraft snapshot, stream status, flight status, context, enrichment, and analysis APIs.
- Fetch OSINT context through server-side provider adapters for marine weather, active fires, airports/runways, satellite snapshots, and conflict/protest events.
- Ground analysis requests in repository snapshots, analytics, selected area context, and validated cached intel.

Required interfaces are implemented in `apps/api/src/domain/interfaces.ts`:

- `IAisStreamClient`
- `IAisMessageNormaliser`
- `IVesselRepository`
- `IVesselAnalyticsService`
- `IRealtimeBroadcaster`
- `IAnalysisAgentService`
- `IFlightTrackingClient`
- `IAircraftRepository`
- `IAircraftAnalyticsService`
- `IAircraftRealtimeBroadcaster`
- `IVesselIntelService`
- `IAircraftIntelService`
- `IMarineWeatherService`
- `IFireContextService`
- `IAirportContextService`
- `ISatelliteContextService`
- `IConflictContextService`

## Frontend Responsibilities

- Connect only to our backend.
- Render the MapLibre map and WebGL vessel, aircraft, observed-track, area, and OSINT layers.
- Keep state in dedicated stores.
- Render AIS, ADS-B, provider, web-intel, and analysis fields as text only.
- Render analysis output as text only.
- Present map styles and projections through explicit abstractions.
- Keep provider credentials out of browser configuration.
- Provide dashboard panels for overview analysis, observed tracks, alerts, military intel, and settings.

Required frontend abstractions are implemented under `apps/web/src`:

- `IMapStyleProvider`
- `MapStyleRegistry`
- `realtimeClient`
- `flightRealtimeClient`
- `apiClient`
- `vesselStore`
- `aircraftStore`
- `mapStore`
- `analysisStore`

## Data Flow

```mermaid
flowchart LR
  MockAIS["Mock AIS client"] --> Normaliser["AIS normaliser"]
  ReplayAIS["Replay fixture client"] --> Parser["AISstream parser"]
  LiveAIS["AISstream live client"] --> Parser
  MockFlight["Mock flight client"] --> AircraftRepo["Aircraft repository"]
  LiveFlight["OpenSky or ADS-B Exchange client"] --> AircraftRepo
  Parser --> Normaliser
  Normaliser --> Repository["Vessel repository"]
  Repository --> Analytics["Analytics service"]
  Repository --> Broadcaster["Realtime broadcaster"]
  Analytics --> Broadcaster
  Broadcaster --> WebSocket["/ws/vessels"]
  AircraftRepo --> AircraftAnalytics["Aircraft analytics"]
  AircraftRepo --> AircraftBroadcaster["Aircraft realtime broadcaster"]
  AircraftAnalytics --> AircraftBroadcaster
  AircraftBroadcaster --> FlightWebSocket["/ws/aircraft"]
  Repository --> API["/vessels"]
  AircraftRepo --> AircraftAPI["/aircraft"]
  Repository --> Analysis["/analysis"]
  AircraftRepo --> Analysis
  Analytics --> Analysis
  AircraftAnalytics --> Analysis
  Context["Provider context routes"] --> Analysis
  Analysis --> OpenAI["OpenAI Responses API"]
  API --> Web["React dashboard"]
  AircraftAPI --> Web
  WebSocket --> Web
  FlightWebSocket --> Web
  Web --> Analysis
  Web --> Context
```

## Operating Modes

- Default API startup uses `AIS_MODE=live`, `FLIGHT_MODE=live`, `FLIGHT_PROVIDER=opensky`, and `ANALYSIS_MODE=live`.
- Default startup requires `AISSTREAM_API_KEY` and `OPENAI_API_KEY`.
- `AIS_MODE=live` connects to `wss://stream.aisstream.io/v0/stream`.
- `FLIGHT_MODE=live` connects to the configured flight provider, OpenSky by default.
- `ANALYSIS_MODE=live` uses the OpenAI Responses API.
- `AIS_MODE=mock` uses synthetic local vessel updates.
- `AIS_MODE=replay` uses recorded AISstream-style JSONL fixtures.
- `FLIGHT_MODE=mock` uses synthetic local aircraft updates.
- `ANALYSIS_MODE=mock` returns deterministic local analysis.
- Context provider modes use `live`, `mock`, or `off` where supported.
