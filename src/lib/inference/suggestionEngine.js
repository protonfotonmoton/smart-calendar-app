/**
 * suggestionEngine.js
 *
 * Turns detected patterns into human-friendly, actionable suggestions.
 *
 * Suggestion shape:
 *   {
 *     id: string,
 *     title: string,
 *     description: string,
 *     pattern: Pattern,
 *     proposedEvent: CalendarEvent,   // the next occurrence to add
 *     confidence: number,
 *     dismissed: boolean,
 *   }
 */
import { addDays, addWeeks, addMonths, format, parseISO } from "date-fns";

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

let idCounter = 0;
function generateId() {
  idCounter += 1;
  return `sugg_${Date.now().toString(36)}_${idCounter}`;
}

function latestEvent(events) {
  return [...events].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

function nextOccurrenceDate(pattern) {
  const last = latestEvent(pattern.events);
  const lastDate = parseISO(last.date);

  switch (pattern.type) {
    case "daily":
      return addDays(lastDate, 1);
    case "weekly":
      return addWeeks(lastDate, 1);
    case "biweekly":
      return addWeeks(lastDate, 2);
    case "monthly":
      return addMonths(lastDate, 1);
    default:
      return addWeeks(lastDate, 1);
  }
}

function describePattern(pattern) {
  const timeLabel = pattern.time || "09:00";
  switch (pattern.type) {
    case "daily":
      return `You seem to have "${pattern.title}" every day at ${timeLabel}. Add as a recurring daily event?`;
    case "weekly":
      return `You seem to have "${pattern.title}" every ${WEEKDAY_NAMES[pattern.weekday]} at ${timeLabel}. Add as recurring?`;
    case "biweekly":
      return `"${pattern.title}" appears every other ${WEEKDAY_NAMES[pattern.weekday]} at ${timeLabel}. Keep it going as a bi-weekly event?`;
    case "monthly":
      return `"${pattern.title}" appears on day ${pattern.dayOfMonth} of the month at ${timeLabel}. Add as a recurring monthly event?`;
    default:
      return `"${pattern.title}" looks like a regular event. Add it as recurring?`;
  }
}

function recurrenceRuleFor(pattern) {
  switch (pattern.type) {
    case "daily":
      return "daily";
    case "weekly":
      return "weekly";
    case "biweekly":
      return "weekly"; // stored as weekly w/ interval metadata for simplicity
    case "monthly":
      return "monthly";
    default:
      return "weekly";
  }
}

/**
 * generateSuggestions
 * @param {object[]} patterns - Pattern[] from patternDetector
 * @param {object[]} existingEvents - CalendarEvent[]
 * @returns {object[]} Suggestion[]
 */
export function generateSuggestions(patterns, existingEvents = []) {
  if (!Array.isArray(patterns) || patterns.length === 0) return [];

  const existingKeys = new Set(
    existingEvents.map((e) => `${(e.title || "").trim().toLowerCase()}|${e.date}|${e.startTime}`)
  );

  const suggestions = [];

  for (const pattern of patterns) {
    if (pattern.confidence < 0.4) continue;

    const proposedDate = nextOccurrenceDate(pattern);
    const proposedDateStr = format(proposedDate, "yyyy-MM-dd");
    const key = `${pattern.title.trim().toLowerCase()}|${proposedDateStr}|${pattern.time}`;

    if (existingKeys.has(key)) continue;

    const sample = pattern.events[0];
    const proposedEvent = {
      id: `suggested_${generateId()}`,
      title: pattern.title,
      date: proposedDateStr,
      startTime: pattern.time || "09:00",
      endTime: sample.endTime || "10:00",
      location: sample.location || "",
      description: sample.description || "",
      color: sample.color || "blue",
      isRecurring: true,
      recurrenceRule: recurrenceRuleFor(pattern),
      isImported: false,
      isSuggested: true,
      source: "suggestion",
    };

    suggestions.push({
      id: generateId(),
      title: `Recurring: ${pattern.title}`,
      description: describePattern(pattern),
      pattern,
      proposedEvent,
      confidence: pattern.confidence,
      dismissed: false,
    });
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}
