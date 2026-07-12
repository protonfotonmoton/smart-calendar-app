# Smart Calendar App

A full-featured, CSS-first calendar scheduling web app built with Vite + React.
It supports Month/Week/Day calendar views, CSV/XLSX schedule import, AI-style
recurring-pattern suggestions, and calendar sync foundations for Google
Calendar (fully implemented) and CalDAV/Apple/Samsung (documented stub).

## Features

- **Month / Week / Day views** with keyboard-accessible event cards, drag-and-drop
  rescheduling (Month view), overlap-aware event layout (Week/Day), and a live
  "now" indicator line.
- **Create / edit / delete events** via an accessible modal dialog (focus trap,
  Escape/backdrop-to-close, validation).
- **CSV & XLSX import** with drag-and-drop, automatic column-name detection
  (Title/Summary/Subject/Event, Date/Start Date, Start/End Time, Location,
  Description/Notes), a preview table, and per-row warnings for skipped rows.
- **Pattern detection & suggestions** — a lightweight inference engine scans
  your events for recurring daily/weekly/bi-weekly/monthly patterns and
  suggests adding them as recurring events, with a confidence score.
- **Calendar sync** — a pluggable provider registry with a fully working
  Google Calendar OAuth 2.0 (PKCE) + REST API v3 integration, and a
  documented CalDAV foundation for Apple iCloud / self-hosted servers.
- **Polished dark-mode-first design system** — pure CSS (no framework), CSS
  variables, gradients, and smooth transitions.
- **localStorage persistence** — events are saved under the `sca_events` key.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Architecture

```
src/
  main.jsx                     Entry point
  App.jsx                      Root component: view/date state, modals, toasts
  index.css                    Design system (CSS variables, resets)

  components/
    calendar/                  CalendarHeader, MonthView, WeekView, DayView,
                                EventCard, EventModal, SuggestionsPanel
    import/                    FileImport (drag-drop), ImportPreview (table)
    sync/                      SyncPanel (connect/disconnect providers)
    ui/                        Button, Modal, Toast (generic primitives)

  hooks/
    useCalendar.js              current date / view / navigation
    useEvents.js                events CRUD + localStorage persistence
    useImport.js                file -> parse -> preview -> confirm flow
    useSuggestions.js           runs the inference engine over events

  lib/
    parsing/
      csvParser.js               CSV -> CalendarEvent[] (PapaParse)
      xlsxParser.js               XLSX -> CalendarEvent[] (SheetJS/xlsx)
      columnDetector.js           shared header auto-detection
      eventBuilder.js             shared row -> CalendarEvent normalization
      dateNormalizer.js           date/time string -> ISO primitives
    inference/
      patternDetector.js          detects daily/weekly/biweekly/monthly patterns
      suggestionEngine.js         turns patterns into actionable suggestions
    sync/
      providerInterface.js        CalendarProvider JSDoc contract
      googleProvider.js           Google Calendar OAuth (PKCE) + REST API v3
      calDavProvider.js           CalDAV stub/foundation (Apple/Samsung)
      index.js                    provider registry

  tests/
    parsing/                     csvParser, xlsxParser, dateNormalizer
    inference/                   patternDetector, suggestionEngine
```

## Import format examples

Column names are auto-detected (case-insensitive, `_`/`-`/space tolerant).

**CSV**

```csv
Title,Date,Start Time,End Time,Location,Description
Team Standup,2026-07-13,09:00,09:15,Zoom,Daily sync
Sprint Planning,07/14/2026,10:00 AM,11:00 AM,Room 5,Plan the sprint
```

Recognized column aliases:

| Field       | Accepted header names                                        |
| ----------- | -------------------------------------------------------------- |
| Title       | Title, Summary, Subject, Event, Event Name, Name                |
| Date        | Date, Start Date, Event Date                                    |
| Start Time  | Start Time, Time, Start                                          |
| End Date    | End Date                                                         |
| End Time    | End Time, End, Duration                                          |
| Location    | Location, Place, Venue, Where                                    |
| Description | Description, Notes, Details, Desc                               |

**XLSX** uses the same header aliases — the first sheet's header row is
read and mapped the same way as CSV.

Dates support ISO (`2026-07-12`), US slash (`07/12/2026`), day-first when
unambiguous (`25/12/2026`), long-form (`July 12, 2026`), and Excel serial
date/time numbers. Rows missing a title or an unparseable date are skipped
with a warning shown in the import preview.

## Google Calendar setup

1. In the [Google Cloud Console](https://console.cloud.google.com/), create
   an OAuth 2.0 **Web application** client ID.
2. Add an authorized redirect URI matching `VITE_GOOGLE_REDIRECT_URI`
   (e.g. `http://localhost:5173/oauth/callback`).
3. Enable the **Google Calendar API** for the project.
4. Copy `.env.example` to `.env` and set:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/oauth/callback
   ```
5. Restart `npm run dev`. Clicking **Connect** in the Sync panel opens a
   popup for the OAuth consent screen using PKCE (no client secret needed),
   then reads/writes events via the Calendar API v3 (`/calendars/primary/events`).

Scopes requested: `openid`, `email`, `https://www.googleapis.com/auth/calendar.events`.

## Apple / Samsung strategy

CalDAV (`src/lib/sync/calDavProvider.js`) is intentionally a **documented
foundation, not a full implementation**, because it requires a backend proxy:

- **Apple iCloud** exposes calendars via CalDAV at `https://caldav.icloud.com`,
  authenticated with an app-specific password. CalDAV servers rarely send
  permissive CORS headers, so browser JS can't call them directly — a small
  backend service must perform the PROPFIND/REPORT/PUT/DELETE requests and
  hold the credentials server-side.
- **Samsung Calendar** is backed by the on-device Android `CalendarProvider`
  API, which isn't reachable from a web app at all. Realistic paths are (a)
  a native/Capacitor/React Native shell that syncs via `CalendarContract`, or
  (b) configuring the Samsung account to sync via CalDAV or Google, so this
  app's Google/CalDAV providers cover it indirectly.

The provider currently throws clear, actionable errors describing what a
full implementation would require instead of silently no-op-ing.

## Tests

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage
```

44 tests cover date/time normalization, CSV/XLSX parsing (including column
auto-detection and malformed/missing data), recurring-pattern detection, and
suggestion generation.

## Environment variables

| Variable                    | Required for      | Description                                      |
| ---------------------------- | ------------------ | ------------------------------------------------- |
| `VITE_GOOGLE_CLIENT_ID`      | Google Calendar sync | OAuth 2.0 client ID (public/SPA, PKCE flow)      |
| `VITE_GOOGLE_REDIRECT_URI`   | Google Calendar sync | Registered OAuth redirect URI                    |
| `VITE_CALDAV_URL`            | CalDAV (future)    | CalDAV server base URL (e.g. iCloud)              |
| `VITE_CALDAV_USERNAME`       | CalDAV (future)    | CalDAV account username                           |
| `VITE_CALDAV_PASSWORD`       | CalDAV (future)    | App-specific password (must live behind a proxy)  |

Copy `.env.example` to `.env` and fill in the values you need — `.env` is
git-ignored.

## Known limitations

- CalDAV/Apple/Samsung sync is a documented stub, not a working integration
  (see "Apple / Samsung strategy" above) — it requires a backend proxy that
  is out of scope for this client-only app.
- The `xlsx` (SheetJS) package's latest npm-registry release (`0.18.5`) has
  known ReDoS and prototype-pollution advisories with no newer patch
  published to npm (SheetJS ships later fixes only via their own CDN, which
  wasn't reachable from this build environment). Avoid importing untrusted
  `.xlsx` files in production without additional sandboxing.
- Recurring events created from suggestions or the event form store a
  `recurrenceRule` but do not currently expand into individual future
  occurrences on the calendar grid — only the single stored event is shown.
- Google Calendar sync fetches/creates/updates/deletes events via the API,
  but does not yet perform automatic two-way background sync or conflict
  resolution.

## License

See [LICENSE](./LICENSE).
