import { describe, expect, it } from "vitest";
import { parseCSV } from "../../lib/parsing/csvParser.js";

describe("parseCSV", () => {
  it("parses a well-formed CSV with standard headers", () => {
    const csv = `Title,Date,Start Time,End Time,Location,Description
Team Standup,2026-07-13,09:00,09:15,Zoom,Daily sync
Sprint Planning,2026-07-14,10:00,11:00,Room 5,Plan the sprint`;

    const { events, errors } = parseCSV(csv);
    expect(errors).toHaveLength(0);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      title: "Team Standup",
      date: "2026-07-13",
      startTime: "09:00",
      endTime: "09:15",
      location: "Zoom",
      description: "Daily sync",
      isImported: true,
      source: "csv",
    });
  });

  it("auto-detects alternate column name variants", () => {
    const csv = `Subject,Start Date,Start Time,End Time,Venue,Notes
Client Call,07/12/2026,2:00 PM,3:00 PM,Office,Discuss contract`;

    const { events, warnings } = parseCSV(csv);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Client Call");
    expect(events[0].date).toBe("2026-07-12");
    expect(events[0].startTime).toBe("14:00");
    expect(events[0].location).toBe("Office");
    expect(warnings).toHaveLength(0);
  });

  it("detects Event/Summary column variants for title", () => {
    const csv = `Event,Date
Board Meeting,2026-08-01`;
    const { events } = parseCSV(csv);
    expect(events[0].title).toBe("Board Meeting");
  });

  it("skips rows missing a title, with a warning", () => {
    const csv = `Title,Date
,2026-07-01
Valid Event,2026-07-02`;
    const { events, warnings } = parseCSV(csv);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Valid Event");
    expect(warnings.some((w) => w.includes("missing title"))).toBe(true);
  });

  it("skips rows with unparseable dates, with a warning", () => {
    const csv = `Title,Date
Bad Date Event,not-a-date
Good Event,2026-07-05`;
    const { events, warnings } = parseCSV(csv);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Good Event");
    expect(warnings.some((w) => w.includes("unparseable date"))).toBe(true);
  });

  it("ignores fully empty rows", () => {
    const csv = `Title,Date
Event One,2026-07-01

Event Two,2026-07-02`;
    const { events } = parseCSV(csv);
    expect(events).toHaveLength(2);
  });

  it("defaults start/end times when missing", () => {
    const csv = `Title,Date
All Day Thing,2026-07-01`;
    const { events } = parseCSV(csv);
    expect(events[0].startTime).toBe("09:00");
    expect(events[0].endTime).toBe("10:00");
  });

  it("returns an error for empty input", () => {
    const { events, errors } = parseCSV("");
    expect(events).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns an error when no headers are present", () => {
    const { errors } = parseCSV("\n\n");
    expect(errors.length).toBeGreaterThan(0);
  });
});
