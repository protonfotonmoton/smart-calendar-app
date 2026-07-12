/**
 * calDavProvider.js
 *
 * Foundation / stub for CalDAV-based sync, covering Apple iCloud Calendar
 * and (indirectly) Samsung Calendar. This is intentionally NOT a full
 * implementation — CalDAV requires either a server-side proxy (to avoid
 * CORS and to safely hold app-specific passwords) or a native shell, which
 * is out of scope for a pure client-side Vite/React app. The methods below
 * document the real integration approach and fail loudly with actionable
 * guidance rather than silently doing nothing.
 *
 * --- Apple iCloud Calendar ---
 * Apple exposes calendars via CalDAV at https://caldav.icloud.com. Auth uses
 * an "app-specific password" (generated at appleid.apple.com) rather than
 * the user's main Apple ID password. A typical flow:
 *   1. PROPFIND https://caldav.icloud.com/ (with Basic auth) to discover the
 *      principal URL for the account.
 *   2. PROPFIND the principal to discover the calendar-home-set.
 *   3. PROPFIND the calendar-home-set to enumerate individual calendars.
 *   4. REPORT (calendar-query) against a calendar collection to fetch VEVENT
 *      resources within a date range.
 *   5. PUT a .ics VEVENT resource to create/update; DELETE to remove.
 * Because CalDAV servers rarely send permissive CORS headers, all of the
 * above must be proxied through a backend service that holds the
 * app-specific password server-side — never expose it in client JS.
 *
 * --- Samsung Calendar ---
 * Samsung's own calendar app is backed by the Android `CalendarProvider`
 * content-provider API, which is a native/on-device API — not reachable
 * from a web app at all. Two realistic integration paths:
 *   a) Ship a thin native/Capacitor/React Native shell that talks to
 *      `CalendarContract` on-device and syncs to our backend.
 *   b) Samsung accounts can alternatively be configured to sync with a
 *      CalDAV or Google account; in that case, users effectively use the
 *      CalDAV or Google provider instead, and Samsung Calendar picks up
 *      the events via its own native account sync.
 * This provider intentionally does not claim to support Samsung directly —
 * `id: 'caldav'` is reused for any generic CalDAV endpoint (iCloud or a
 * self-hosted server such as Radicale/Nextcloud), and Samsung guidance is
 * limited to option (b) above.
 */

const NOT_IMPLEMENTED = (action) =>
  new Error(
    `CalDAV ${action} is not implemented in this build. CalDAV requires a server-side proxy ` +
      "to hold credentials and bypass CORS (see comments in src/lib/sync/calDavProvider.js). " +
      "Configure VITE_CALDAV_URL / VITE_CALDAV_USERNAME / VITE_CALDAV_PASSWORD against your own " +
      "proxy implementation to enable this provider."
  );

function getConfig() {
  return {
    url: import.meta.env?.VITE_CALDAV_URL || "",
    username: import.meta.env?.VITE_CALDAV_USERNAME || "",
    // Never log or persist the password in localStorage in a real implementation;
    // it should live only in the backend proxy that performs the CalDAV requests.
    hasPassword: Boolean(import.meta.env?.VITE_CALDAV_PASSWORD),
  };
}

const CONNECTION_KEY = "sca_caldav_connected";

export const calDavProvider = {
  id: "caldav",
  name: "CalDAV (Apple iCloud / self-hosted)",

  async connect() {
    const config = getConfig();
    if (!config.url) {
      throw new Error(
        "Missing VITE_CALDAV_URL. CalDAV sync requires a configured server URL (e.g. " +
          "https://caldav.icloud.com for Apple iCloud) and a backend proxy to perform the " +
          "actual PROPFIND/REPORT requests. See calDavProvider.js for the full integration plan."
      );
    }
    // In a full implementation this would call our backend proxy, which performs
    // the CalDAV PROPFIND discovery handshake and returns a session/cookie or
    // confirms the stored app-specific password is valid.
    throw NOT_IMPLEMENTED("connect()");
  },

  async disconnect() {
    localStorage.removeItem(CONNECTION_KEY);
  },

  async isConnected() {
    return localStorage.getItem(CONNECTION_KEY) === "true";
  },

  async fetchEvents() {
    throw NOT_IMPLEMENTED("fetchEvents()");
  },

  async createEvent() {
    throw NOT_IMPLEMENTED("createEvent()");
  },

  async updateEvent() {
    throw NOT_IMPLEMENTED("updateEvent()");
  },

  async deleteEvent() {
    throw NOT_IMPLEMENTED("deleteEvent()");
  },
};
