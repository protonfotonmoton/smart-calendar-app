import { describe, expect, it } from "vitest";
import { normalizeDate, normalizeTime } from "../../lib/parsing/dateNormalizer.js";

describe("normalizeDate", () => {
  it("parses ISO dates", () => {
    expect(normalizeDate("2026-07-12")).toBe("2026-07-12");
  });

  it("parses ISO datetimes (keeps date part only)", () => {
    expect(normalizeDate("2026-07-12T09:30:00")).toBe("2026-07-12");
  });

  it("parses US slash dates (MM/DD/YYYY)", () => {
    expect(normalizeDate("07/12/2026")).toBe("2026-07-12");
  });

  it("disambiguates DD/MM/YYYY when day > 12", () => {
    expect(normalizeDate("25/12/2026")).toBe("2026-12-25");
  });

  it("parses YYYY/MM/DD", () => {
    expect(normalizeDate("2026/07/12")).toBe("2026-07-12");
  });

  it("parses long-form dates 'July 12, 2026'", () => {
    expect(normalizeDate("July 12, 2026")).toBe("2026-07-12");
  });

  it("parses long-form dates '12 July 2026'", () => {
    expect(normalizeDate("12 July 2026")).toBe("2026-07-12");
  });

  it("parses abbreviated month names", () => {
    expect(normalizeDate("Jul 12, 2026")).toBe("2026-07-12");
  });

  it("parses Excel serial date numbers", () => {
    // 46215 => 2026-07-12 (Excel epoch 1899-12-30)
    const result = normalizeDate(46215);
    expect(result).toBe("2026-07-12");
  });

  it("parses Date objects", () => {
    expect(normalizeDate(new Date(2026, 6, 12))).toBe("2026-07-12");
  });

  it("returns null for empty/invalid input", () => {
    expect(normalizeDate("")).toBeNull();
    expect(normalizeDate(null)).toBeNull();
    expect(normalizeDate(undefined)).toBeNull();
    expect(normalizeDate("not a date at all!!")).toBeNull();
  });
});

describe("normalizeTime", () => {
  it("parses 24h HH:MM", () => {
    expect(normalizeTime("09:00")).toBe("09:00");
    expect(normalizeTime("21:30")).toBe("21:30");
  });

  it("parses 12h format with AM/PM", () => {
    expect(normalizeTime("9:00 AM")).toBe("09:00");
    expect(normalizeTime("9:00am")).toBe("09:00");
    expect(normalizeTime("9pm")).toBe("21:00");
    expect(normalizeTime("12:00 AM")).toBe("00:00");
    expect(normalizeTime("12:00 PM")).toBe("12:00");
  });

  it("parses time without minutes", () => {
    expect(normalizeTime("9am")).toBe("09:00");
  });

  it("parses Excel fractional-day time serials", () => {
    expect(normalizeTime(0.375)).toBe("09:00"); // 0.375 * 24 = 9
  });

  it("extracts time from ISO datetime strings", () => {
    expect(normalizeTime("2026-07-12T14:45:00")).toBe("14:45");
  });

  it("returns null for empty/invalid input", () => {
    expect(normalizeTime("")).toBeNull();
    expect(normalizeTime(null)).toBeNull();
    expect(normalizeTime("not a time")).toBeNull();
    expect(normalizeTime("25:99")).toBeNull();
  });
});
