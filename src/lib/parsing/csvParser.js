/**
 * csvParser.js
 *
 * Parses CSV text into normalized CalendarEvent objects using PapaParse.
 * Auto-detects common column name variants (title/summary/subject/event,
 * date/start date, start time, end date, end time/duration, location,
 * description/notes).
 */
import Papa from "papaparse";
import { buildEventsFromRows } from "./eventBuilder.js";

/**
 * @param {string} text - raw CSV file contents
 * @returns {{ events: object[], warnings: string[], errors: string[] }}
 */
export function parseCSV(text) {
  if (typeof text !== "string" || text.trim() === "") {
    return { events: [], warnings: [], errors: ["File is empty."] };
  }

  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const errors = [];
  if (result.errors && result.errors.length > 0) {
    for (const err of result.errors) {
      // "TooFewFields"/"TooManyFields" on trailing blank lines are common & harmless
      if (err.code !== "TooFewFields" && err.code !== "TooManyFields") {
        errors.push(`${err.type}: ${err.message} (row ${err.row ?? "?"})`);
      }
    }
  }

  const headers = result.meta && result.meta.fields ? result.meta.fields.filter(Boolean) : [];
  const rows = result.data || [];

  const built = buildEventsFromRows(rows, headers, "csv");

  return {
    events: built.events,
    warnings: built.warnings,
    errors: [...errors, ...built.errors],
  };
}
