/**
 * providerInterface.js
 *
 * Abstract contract that every calendar sync provider must implement.
 * This file has no executable logic — it exists purely to document the
 * shape providers must conform to (via JSDoc typedefs), and to serve as
 * living documentation / IDE intellisense for provider authors.
 *
 * @typedef {Object} CalendarEvent
 * @property {string} id
 * @property {string} title
 * @property {string} date            - "YYYY-MM-DD"
 * @property {string} startTime       - "HH:MM"
 * @property {string} endTime         - "HH:MM"
 * @property {string} [location]
 * @property {string} [description]
 * @property {string} [color]
 * @property {boolean} [isRecurring]
 * @property {string|null} [recurrenceRule] - "daily" | "weekly" | "monthly" | null
 *
 * @typedef {Object} CalendarProvider
 * @property {string} id - Provider identifier (e.g., 'google', 'apple', 'samsung')
 * @property {string} name - Display name
 * @property {() => Promise<void>} connect - Initiate OAuth/connection flow
 * @property {() => Promise<void>} disconnect - Revoke access
 * @property {() => Promise<boolean>} isConnected - Check connection status
 * @property {(startDate: Date, endDate: Date) => Promise<CalendarEvent[]>} fetchEvents - Fetch remote events
 * @property {(event: CalendarEvent) => Promise<string>} createEvent - Create event, returns remote ID
 * @property {(event: CalendarEvent) => Promise<void>} updateEvent - Update event
 * @property {(eventId: string) => Promise<void>} deleteEvent - Delete event
 */

/**
 * Helper used by concrete providers to assert they satisfy the contract
 * at runtime (useful in tests / registry validation).
 * @param {Partial<CalendarProvider>} provider
 * @returns {boolean}
 */
export function isValidProvider(provider) {
  const requiredMethods = [
    "connect",
    "disconnect",
    "isConnected",
    "fetchEvents",
    "createEvent",
    "updateEvent",
    "deleteEvent",
  ];
  if (!provider || typeof provider !== "object") return false;
  if (typeof provider.id !== "string" || typeof provider.name !== "string") return false;
  return requiredMethods.every((m) => typeof provider[m] === "function");
}
