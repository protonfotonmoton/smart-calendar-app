/**
 * eventBuilder.js
 *
 * Shared logic to convert detected-column rows (plain objects keyed by
 * original header names) into normalized CalendarEvent objects, used by
 * both csvParser and xlsxParser.
 */
import { normalizeDate, normalizeTime } from "./dateNormalizer.js";
import { detectColumns } from "./columnDetector.js";

let idCounter = 0;
function generateId(prefix = "imp") {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_COLOR = "blue";

/**
 * @param {object[]} rows - array of row objects keyed by original header names
 * @param {string[]} headers - original header names present in the sheet
 * @param {string} source - "csv" | "xlsx"
 * @returns {{ events: object[], warnings: string[], errors: string[] }}
 */
export function buildEventsFromRows(rows, headers, source) {
  const warnings = [];
  const errors = [];
  const events = [];

  if (!headers || headers.length === 0) {
    errors.push("No columns/headers detected in file.");
    return { events, warnings, errors };
  }

  const columnMap = detectColumns(headers);

  if (!columnMap.title) {
    warnings.push(
      "Could not confidently detect a title/subject column; falling back to the first column."
    );
  }
  if (!columnMap.date) {
    warnings.push("Could not confidently detect a date column; some rows may be skipped.");
  }

  rows.forEach((row, index) => {
    const rowNum = index + 2; // account for header row, 1-indexed for humans

    const rawTitle = columnMap.title ? row[columnMap.title] : row[headers[0]];
    const title = rawTitle !== undefined && rawTitle !== null ? String(rawTitle).trim() : "";

    const rawDate = columnMap.date ? row[columnMap.date] : undefined;
    const date = normalizeDate(rawDate);

    // Skip fully empty rows silently
    const allEmpty = headers.every((h) => {
      const v = row[h];
      return v === undefined || v === null || String(v).trim() === "";
    });
    if (allEmpty) return;

    if (!title) {
      warnings.push(`Row ${rowNum}: missing title, skipped.`);
      return;
    }
    if (!date) {
      warnings.push(`Row ${rowNum}: missing or unparseable date, skipped.`);
      return;
    }

    const startTime = columnMap.startTime ? normalizeTime(row[columnMap.startTime]) : null;
    const endTime = columnMap.endTime ? normalizeTime(row[columnMap.endTime]) : null;
    const location = columnMap.location ? String(row[columnMap.location] ?? "").trim() : "";
    const description = columnMap.description
      ? String(row[columnMap.description] ?? "").trim()
      : "";

    events.push({
      id: generateId(source),
      title,
      date,
      startTime: startTime || "09:00",
      endTime: endTime || (startTime ? addOneHour(startTime) : "10:00"),
      location,
      description,
      color: DEFAULT_COLOR,
      isRecurring: false,
      recurrenceRule: null,
      isImported: true,
      isSuggested: false,
      source,
    });
  });

  return { events, warnings, errors };
}

function addOneHour(time) {
  const [h, m] = time.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
