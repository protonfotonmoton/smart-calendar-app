import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseXLSX } from "../../lib/parsing/xlsxParser.js";

function buildWorkbookArrayBuffer(rows) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return buffer;
}

describe("parseXLSX", () => {
  it("parses a well-formed workbook with standard headers", () => {
    const buffer = buildWorkbookArrayBuffer([
      {
        Title: "Team Standup",
        Date: "2026-07-13",
        "Start Time": "09:00",
        "End Time": "09:15",
        Location: "Zoom",
        Description: "Daily sync",
      },
      {
        Title: "Sprint Planning",
        Date: "2026-07-14",
        "Start Time": "10:00",
        "End Time": "11:00",
        Location: "Room 5",
        Description: "Plan the sprint",
      },
    ]);

    const { events, errors } = parseXLSX(buffer);
    expect(errors).toHaveLength(0);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      title: "Team Standup",
      date: "2026-07-13",
      startTime: "09:00",
      endTime: "09:15",
      location: "Zoom",
      isImported: true,
      source: "xlsx",
    });
  });

  it("auto-detects alternate column name variants", () => {
    const buffer = buildWorkbookArrayBuffer([
      { Subject: "Client Call", "Start Date": "2026-07-12", "Start Time": "14:00", Venue: "Office" },
    ]);

    const { events } = parseXLSX(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Client Call");
    expect(events[0].date).toBe("2026-07-12");
    expect(events[0].location).toBe("Office");
  });

  it("skips rows missing required fields", () => {
    const buffer = buildWorkbookArrayBuffer([
      { Title: "", Date: "2026-07-01" },
      { Title: "Valid Event", Date: "2026-07-02" },
    ]);

    const { events, warnings } = parseXLSX(buffer);
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe("Valid Event");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("returns an error for a workbook with no rows", () => {
    const worksheet = XLSX.utils.aoa_to_sheet([[]]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empty");
    const buffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

    const { events, errors } = parseXLSX(buffer);
    expect(events).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("returns an error for corrupt/unreadable data", () => {
    const garbage = new TextEncoder().encode("this is not a real xlsx file").buffer;
    const { events, errors } = parseXLSX(garbage);
    expect(events).toHaveLength(0);
    expect(errors.length).toBeGreaterThan(0);
  });
});
