/**
 * googleProvider.js
 *
 * Google Calendar sync provider implementing the CalendarProvider contract
 * (see ./providerInterface.js). Uses the OAuth 2.0 Authorization Code flow
 * with PKCE (suitable for a public/SPA client — no client secret required),
 * via a popup window, and talks directly to the Google Calendar REST API v3.
 *
 * Required environment variables (see .env.example):
 *   VITE_GOOGLE_CLIENT_ID     - OAuth 2.0 Client ID from Google Cloud Console
 *   VITE_GOOGLE_REDIRECT_URI  - Redirect URI registered for the client
 *                               (e.g. http://localhost:5173/oauth/callback)
 *
 * Scopes requested: openid, email, and https://www.googleapis.com/auth/calendar.events
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

const STORAGE_KEY = "sca_google_token";
const VERIFIER_STORAGE_KEY = "sca_google_pkce_verifier";

function getClientId() {
  return import.meta.env?.VITE_GOOGLE_CLIENT_ID || "";
}

function getRedirectUri() {
  return (
    import.meta.env?.VITE_GOOGLE_REDIRECT_URI ||
    (typeof window !== "undefined" ? `${window.location.origin}/oauth/callback` : "")
  );
}

/** Generates a cryptographically random PKCE code verifier. */
function generateCodeVerifier() {
  const array = new Uint8Array(64);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return base64UrlEncode(array);
}

function base64UrlEncode(bytes) {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function readStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeToken(token) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(token));
}

function clearStoredToken() {
  localStorage.removeItem(STORAGE_KEY);
}

function isTokenExpired(token) {
  if (!token || !token.expires_at) return true;
  return Date.now() >= token.expires_at - 60_000; // 1 min buffer
}

/**
 * Opens a popup window and resolves with the authorization `code` once the
 * user completes the consent flow and is redirected back with `?code=...`.
 */
function openAuthPopup(url, redirectUri) {
  return new Promise((resolve, reject) => {
    const popup = window.open(url, "google-oauth", "width=480,height=640");
    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site to connect Google Calendar."));
      return;
    }

    const redirectOrigin = new URL(redirectUri).origin;

    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          window.removeEventListener("message", onMessage);
          reject(new Error("Google sign-in window was closed before completing."));
          return;
        }
        // If popup navigated back to our redirect URI, pull the code from its URL.
        if (popup.location.origin === redirectOrigin) {
          const params = new URL(popup.location.href).searchParams;
          const code = params.get("code");
          const error = params.get("error");
          clearInterval(timer);
          popup.close();
          window.removeEventListener("message", onMessage);
          if (error) reject(new Error(`Google OAuth error: ${error}`));
          else if (code) resolve(code);
          else reject(new Error("No authorization code returned by Google."));
        }
      } catch {
        // Cross-origin access to popup.location throws while on accounts.google.com — ignore & keep polling.
      }
    }, 500);

    function onMessage(event) {
      if (event.origin !== redirectOrigin) return;
      if (event.data && event.data.code) {
        clearInterval(timer);
        popup.close();
        window.removeEventListener("message", onMessage);
        resolve(event.data.code);
      }
    }
    window.addEventListener("message", onMessage);
  });
}

async function exchangeCodeForToken(code, verifier) {
  const body = new URLSearchParams({
    client_id: getClientId(),
    code,
    code_verifier: verifier,
    grant_type: "authorization_code",
    redirect_uri: getRedirectUri(),
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to exchange authorization code: ${res.status} ${text}`);
  }

  const json = await res.json();
  return {
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: Date.now() + (json.expires_in || 3600) * 1000,
    token_type: json.token_type,
  };
}

async function refreshAccessToken(token) {
  if (!token.refresh_token) throw new Error("No refresh token available; please reconnect Google Calendar.");

  const body = new URLSearchParams({
    client_id: getClientId(),
    refresh_token: token.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google access token: ${res.status}`);
  }

  const json = await res.json();
  const refreshed = {
    ...token,
    access_token: json.access_token,
    expires_at: Date.now() + (json.expires_in || 3600) * 1000,
  };
  storeToken(refreshed);
  return refreshed;
}

async function getValidToken() {
  let token = readStoredToken();
  if (!token) throw new Error("Not connected to Google Calendar.");
  if (isTokenExpired(token)) {
    token = await refreshAccessToken(token);
  }
  return token;
}

function toGoogleEvent(event) {
  return {
    summary: event.title,
    location: event.location || undefined,
    description: event.description || undefined,
    start: { dateTime: `${event.date}T${event.startTime}:00` },
    end: { dateTime: `${event.date}T${event.endTime}:00` },
  };
}

function fromGoogleEvent(gEvent) {
  const startRaw = gEvent.start?.dateTime || gEvent.start?.date;
  const endRaw = gEvent.end?.dateTime || gEvent.end?.date;
  const [date, startTimePart] = (startRaw || "").split("T");
  const [, endTimePart] = (endRaw || "").split("T");

  return {
    id: `google_${gEvent.id}`,
    title: gEvent.summary || "(untitled)",
    date,
    startTime: startTimePart ? startTimePart.slice(0, 5) : "00:00",
    endTime: endTimePart ? endTimePart.slice(0, 5) : "23:59",
    location: gEvent.location || "",
    description: gEvent.description || "",
    color: "blue",
    isRecurring: Boolean(gEvent.recurrence),
    recurrenceRule: gEvent.recurrence ? gEvent.recurrence.join(";") : null,
    isImported: false,
    isSuggested: false,
    source: "google",
    remoteId: gEvent.id,
  };
}

async function apiFetch(path, options = {}) {
  const token = await getValidToken();
  const res = await fetch(`${CALENDAR_API_BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: "Bearer " + token.access_token,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const message = errBody?.error?.message || `Google Calendar API error (${res.status})`;
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const googleProvider = {
  id: "google",
  name: "Google Calendar",

  async connect() {
    const clientId = getClientId();
    if (!clientId) {
      throw new Error(
        "Missing VITE_GOOGLE_CLIENT_ID. Set it in your .env file (see .env.example) to enable Google Calendar sync."
      );
    }

    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);

    const redirectUri = getRedirectUri();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: SCOPES,
      access_type: "offline",
      prompt: "consent",
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    const authUrl = `${AUTH_ENDPOINT}?${params.toString()}`;
    const code = await openAuthPopup(authUrl, redirectUri);
    const savedVerifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
    const token = await exchangeCodeForToken(code, savedVerifier);
    storeToken(token);
    sessionStorage.removeItem(VERIFIER_STORAGE_KEY);
  },

  async disconnect() {
    const token = readStoredToken();
    if (token?.access_token) {
      try {
        await fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token.access_token)}`, {
          method: "POST",
        });
      } catch {
        // Best-effort revoke; ignore network errors and clear local state regardless.
      }
    }
    clearStoredToken();
  },

  async isConnected() {
    const token = readStoredToken();
    if (!token) return false;
    if (!isTokenExpired(token)) return true;
    if (!token.refresh_token) return false;
    try {
      await refreshAccessToken(token);
      return true;
    } catch {
      return false;
    }
  },

  async fetchEvents(startDate, endDate) {
    const params = new URLSearchParams({
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    const data = await apiFetch(`/calendars/primary/events?${params.toString()}`);
    return (data?.items || []).map(fromGoogleEvent);
  },

  async createEvent(event) {
    const data = await apiFetch("/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify(toGoogleEvent(event)),
    });
    return data.id;
  },

  async updateEvent(event) {
    if (!event.remoteId) throw new Error("Cannot update a Google event without a remoteId.");
    await apiFetch(`/calendars/primary/events/${event.remoteId}`, {
      method: "PATCH",
      body: JSON.stringify(toGoogleEvent(event)),
    });
  },

  async deleteEvent(eventId) {
    await apiFetch(`/calendars/primary/events/${eventId}`, { method: "DELETE" });
  },
};
