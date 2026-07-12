/**
 * dateNormalizer.js
 *
 * Normalizes a wide variety of date/time string formats (as commonly found
 * in CSV/XLSX exports from calendar & scheduling tools) into predictable
 * ISO-ish primitives:
 *   - normalizeDate(value) -> "YYYY-MM-DD" | null
 *   - normalizeTime(value) -> "HH:MM" (24h) | null
 *
 * Supports:
 *   - ISO dates: "2026-07-12"
 *   - US slash dates: "07/12/2026" (MM/DD/YYYY)
 *   - Ambiguous slash dates with day > 12: "12/07/2026" (DD/MM/YYYY fallback)
 *   - Long form: "July 12, 2026", "12 July 2026"
 *   - Excel serial date numbers (e.g. 46000)
 *   - Time strings: "9:00 AM", "09:00", "9am", "21:30"
 */

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Converts an Excel serial date number to a JS Date (UTC midnight based).
 * Excel's epoch starts 1899-12-30 (to account for the fictitious 1900 leap year bug).
 */
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400; // seconds
  const dateInfo = new Date(utcValue * 1000);
  return dateInfo;
}

/**
 * Attempts to parse a "long form" date like "July 12, 2026" or "12 July 2026".
 */
function parseLongFormDate(str) {
  const cleaned = str.trim().replace(/,/g, "");
  const parts = cleaned.split(/\s+/);
  if (parts.length < 3) return null;

  let month = null;
  let day = null;
  let year = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    const monthIndex = MONTH_NAMES.findIndex(
      (m) => m === lower || m.startsWith(lower.slice(0, 3)) && lower.length >= 3
    );
    if (monthIndex !== -1 && month === null) {
      month = monthIndex + 1;
      continue;
    }
    if (/^\d{4}$/.test(part)) {
      year = parseInt(part, 10);
      continue;
    }
    if (/^\d{1,2}(st|nd|rd|th)?$/.test(part)) {
      day = parseInt(part, 10);
    }
  }

  if (month === null || day === null || year === null) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * normalizeDate
 * @param {string|number|Date} value
 * @returns {string|null} "YYYY-MM-DD" or null if unparseable
 */
export function normalizeDate(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null;
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }

  if (typeof value === "number") {
    // Excel serial date
    const d = excelSerialToDate(value);
    if (isNaN(d.getTime())) return null;
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }

  const str = String(value).trim();
  if (!str) return null;

  // Pure numeric string -> could be Excel serial
  if (/^\d{4,6}$/.test(str) && Number(str) > 20000 && Number(str) < 90000) {
    const d = excelSerialToDate(Number(str));
    if (!isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
  }

  // ISO format: YYYY-MM-DD (optionally with time component)
  let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const [, y, mo, da] = m;
    return `${y}-${pad2(mo)}-${pad2(da)}`;
  }

  // Slash / dash separated numeric dates: MM/DD/YYYY, DD/MM/YYYY, MM-DD-YYYY, YYYY/MM/DD
  m = str.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})/);
  if (m) {
    let [, a, b, c] = m;
    a = parseInt(a, 10);
    b = parseInt(b, 10);
    c = parseInt(c, 10);

    // YYYY/MM/DD
    if (String(a).length === 4) {
      return `${a}-${pad2(b)}-${pad2(c)}`;
    }

    // Two-digit year -> assume 2000s
    let year = c;
    if (String(c).length === 2) year = 2000 + c;

    // Disambiguate MM/DD vs DD/MM: if first value > 12, it must be the day.
    if (a > 12 && b <= 12) {
      return `${year}-${pad2(b)}-${pad2(a)}`; // DD/MM/YYYY
    }
    // Default assumption: MM/DD/YYYY (US format)
    return `${year}-${pad2(a)}-${pad2(b)}`;
  }

  // Long form: "July 12, 2026" / "12 July 2026"
  const long = parseLongFormDate(str);
  if (long) {
    return `${long.year}-${pad2(long.month)}-${pad2(long.day)}`;
  }

  // Fallback to native Date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`;
  }

  return null;
}

/**
 * normalizeTime
 * @param {string|number} value
 * @returns {string|null} "HH:MM" (24h) or null if unparseable
 */
export function normalizeTime(value) {
  if (value === null || value === undefined || value === "") return null;

  // Excel time serials are fractional numbers between 0 and 1 (fraction of a day)
  if (typeof value === "number") {
    if (value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${pad2(hours)}:${pad2(minutes)}`;
    }
    return null;
  }

  const str = String(value).trim();
  if (!str) return null;

  // 12-hour format: "9:00 AM", "9:00am", "9 AM", "9am"
  let m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m) {
    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = m[3].toLowerCase();
    if (hours === 12) hours = 0;
    if (meridiem === "pm") hours += 12;
    if (hours > 23 || minutes > 59) return null;
    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  // 24-hour format: "09:00", "21:30", "9:00"
  m = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m) {
    const hours = parseInt(m[1], 10);
    const minutes = parseInt(m[2], 10);
    if (hours > 23 || minutes > 59) return null;
    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  // ISO datetime string, extract time portion
  m = str.match(/T(\d{2}):(\d{2})/);
  if (m) {
    return `${pad2(m[1])}:${pad2(m[2])}`;
  }

  return null;
}
