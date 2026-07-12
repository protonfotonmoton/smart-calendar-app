import { describe, expect, it } from "vitest";
import { detectPatterns } from "../../lib/inference/patternDetector.js";
import { generateSuggestions } from "../../lib/inference/suggestionEngine.js";

function ev(title, date, startTime = "09:00", endTime = "09:30") {
  return {
    id: `${title}_${date}`,
    title,
    date,
    startTime,
    endTime,
    location: "",
    description: "",
    color: "blue",
  };
}

describe("generateSuggestions", () => {
  it("returns an empty array for no patterns", () => {
    expect(generateSuggestions([], [])).toEqual([]);
  });

  it("generates a suggestion for a weekly pattern with a human-readable description", () => {
    const events = [
      ev("Standup", "2026-06-01"),
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
    ];
    const patterns = detectPatterns(events);
    const suggestions = generateSuggestions(patterns, events);

    expect(suggestions.length).toBeGreaterThan(0);
    const suggestion = suggestions[0];
    expect(suggestion.description.toLowerCase()).toContain("monday");
    expect(suggestion.description.toLowerCase()).toContain("standup");
    expect(suggestion.proposedEvent.title).toBe("Standup");
    expect(suggestion.proposedEvent.isSuggested).toBe(true);
    expect(suggestion.proposedEvent.isRecurring).toBe(true);
    expect(suggestion.confidence).toBeGreaterThan(0);
  });

  it("proposes the next occurrence date after the last known event", () => {
    const events = [
      ev("Standup", "2026-06-01"),
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
    ];
    const patterns = detectPatterns(events);
    const [suggestion] = generateSuggestions(patterns, events);
    expect(suggestion.proposedEvent.date).toBe("2026-06-29");
  });

  it("does not suggest an event that already exists", () => {
    const events = [
      ev("Standup", "2026-06-01"),
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
      ev("Standup", "2026-06-29"), // next occurrence already on the calendar
    ];
    const patterns = detectPatterns(events);
    const suggestions = generateSuggestions(patterns, events);
    expect(suggestions.find((s) => s.proposedEvent.date === "2026-06-29")).toBeUndefined();
  });

  it("filters out low-confidence patterns", () => {
    const lowConfidencePattern = {
      type: "weekly",
      weekday: 1,
      time: "09:00",
      title: "Maybe Meeting",
      events: [ev("Maybe Meeting", "2026-06-01"), ev("Maybe Meeting", "2026-06-22")],
      confidence: 0.1,
    };
    const suggestions = generateSuggestions([lowConfidencePattern], []);
    expect(suggestions).toEqual([]);
  });

  it("sorts suggestions by descending confidence", () => {
    const events = [
      ev("Standup", "2026-06-01"),
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
      ev("Rent Payment", "2026-05-01", "10:00", "10:05"),
      ev("Rent Payment", "2026-06-01", "10:00", "10:05"),
    ];
    const patterns = detectPatterns(events);
    const suggestions = generateSuggestions(patterns, events);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].confidence).toBeGreaterThanOrEqual(suggestions[i].confidence);
    }
  });
});
