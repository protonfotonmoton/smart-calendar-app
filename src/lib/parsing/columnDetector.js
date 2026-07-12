/**
 * columnDetector.js
 *
 * Shared column-name auto-detection logic used by both the CSV and XLSX
 * parsers. Maps a variety of common header spellings to canonical
 * CalendarEvent field names.
 */

const FIELD_ALIASES = {
  title: ["title", "summary", "subject", "event", "event name", "name"],
  date: ["date", "start date", "start_date", "startdate", "event date"],
  startTime: ["start time", "start_time", "starttime", "time", "start"],
  endDate: ["end date", "end_date", "enddate"],
  endTime: ["end time", "end_time", "endtime", "end", "duration"],
  location: ["location", "place", "venue", "where"],
  description: ["description", "notes", "details", "desc"],
};

function normalizeHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Given an array of raw header strings, returns a map of
 * canonical field -> original header string (or null if not found).
 */
export function detectColumns(headers) {
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeHeader(h) }));
  const mapping = {};

  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    let found = null;
    for (const alias of aliases) {
      const match = normalized.find((h) => h.norm === alias);
      if (match) {
        found = match.raw;
        break;
      }
    }
    // fallback: partial/contains match
    if (!found) {
      for (const alias of aliases) {
        const match = normalized.find((h) => h.norm.includes(alias));
        if (match) {
          found = match.raw;
          break;
        }
      }
    }
    mapping[field] = found;
  }

  return mapping;
}

export const CANONICAL_FIELDS = Object.keys(FIELD_ALIASES);
