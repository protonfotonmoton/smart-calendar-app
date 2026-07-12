import { describe, expect, it } from "vitest";
import { detectPatterns } from "../../lib/inference/patternDetector.js";

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

describe("detectPatterns", () => {
  it("returns an empty array for no events", () => {
    expect(detectPatterns([])).toEqual([]);
  });

  it("returns an empty array when there's no repetition", () => {
    const events = [
      ev("One-off Meeting", "2026-07-01"),
      ev("Another Thing", "2026-07-15"),
      ev("Random Errand", "2026-08-03"),
    ];
    expect(detectPatterns(events)).toEqual([]);
  });

  it("detects a weekly pattern from same-weekday, same-time events", () => {
    // Mondays at 09:00 for 4 consecutive weeks
    const events = [
      ev("Standup", "2026-06-01"), // Monday
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
    ];

    const patterns = detectPatterns(events);
    expect(patterns.length).toBeGreaterThan(0);
    const weekly = patterns.find((p) => p.type === "weekly");
    expect(weekly).toBeDefined();
    expect(weekly.weekday).toBe(1); // Monday
    expect(weekly.time).toBe("09:00");
    expect(weekly.confidence).toBeGreaterThan(0.4);
  });

  it("detects a daily pattern", () => {
    const events = [
      ev("Daily Check-in", "2026-07-01", "08:00", "08:10"),
      ev("Daily Check-in", "2026-07-02", "08:00", "08:10"),
      ev("Daily Check-in", "2026-07-03", "08:00", "08:10"),
      ev("Daily Check-in", "2026-07-04", "08:00", "08:10"),
    ];

    const patterns = detectPatterns(events);
    const daily = patterns.find((p) => p.type === "daily");
    expect(daily).toBeDefined();
    expect(daily.confidence).toBeGreaterThan(0.4);
  });

  it("detects a monthly pattern by day-of-month", () => {
    const events = [
      ev("Rent Payment", "2026-05-01", "10:00", "10:05"),
      ev("Rent Payment", "2026-06-01", "10:00", "10:05"),
      ev("Rent Payment", "2026-07-01", "10:00", "10:05"),
    ];

    const patterns = detectPatterns(events);
    const monthly = patterns.find((p) => p.type === "monthly");
    expect(monthly).toBeDefined();
    expect(monthly.dayOfMonth).toBe(1);
  });

  it("does not treat two isolated events with different times as a pattern", () => {
    const events = [
      ev("Meeting", "2026-06-01", "09:00", "09:30"),
      ev("Meeting", "2026-06-08", "15:00", "15:30"),
    ];
    const patterns = detectPatterns(events);
    // Different times mean they land in separate time-buckets each with only 1 event.
    expect(patterns).toEqual([]);
  });

  it("sorts patterns by descending confidence", () => {
    const events = [
      // Strong weekly pattern (4 consistent weeks)
      ev("Standup", "2026-06-01"),
      ev("Standup", "2026-06-08"),
      ev("Standup", "2026-06-15"),
      ev("Standup", "2026-06-22"),
      // Weaker weekly pattern (only 2 occurrences, gap slightly off)
      ev("1:1", "2026-06-02", "14:00", "14:30"),
      ev("1:1", "2026-06-10", "14:00", "14:30"),
    ];
    const patterns = detectPatterns(events);
    for (let i = 1; i < patterns.length; i++) {
      expect(patterns[i - 1].confidence).toBeGreaterThanOrEqual(patterns[i].confidence);
    }
  });
});
