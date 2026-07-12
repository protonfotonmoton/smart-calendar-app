/**
 * xlsxParser.js
 *
 * Parses an XLSX/XLS ArrayBuffer into normalized CalendarEvent objects
 * using SheetJS (xlsx). Uses the same column auto-detection as csvParser.
 */
import * as XLSX from "xlsx";
import { buildEventsFromRows } from "./eventBuilder.js";

/**
 * @param {ArrayBuffer} arrayBuffer - raw XLSX/XLS file contents
 * @returns {{ events: object[], warnings: string[], errors: string[] }}
 */
export function parseXLSX(arrayBuffer) {
  const errors = [];

  let workbook;
  try {
    workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
  } catch (e) {
    return { events: [], warnings: [], errors: [`Failed to read workbook: ${e.message}`] };
  }

  const sheetName = workbook.SheetNames && workbook.SheetNames[0];
  if (!sheetName) {
    return { events: [], warnings: [], errors: ["Workbook contains no sheets."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

  if (rows.length === 0) {
    return { events: [], warnings: [], errors: ["Sheet contains no rows."] };
  }

  const headers = Object.keys(rows[0]);
  const built = buildEventsFromRows(rows, headers, "xlsx");

  return {
    events: built.events,
    warnings: built.warnings,
    errors: [...errors, ...built.errors],
  };
}
