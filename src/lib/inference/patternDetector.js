/**
 * patternDetector.js
 *
 * Detects recurring patterns from a flat list of CalendarEvent objects.
 * Groups events by (title similarity + weekday/time or day-of-month) and
 * scores a confidence value for each detected pattern.
 *
 * Pattern shape:
 *   {
 *     type: "weekly" | "daily" | "biweekly" | "monthly",
 *     weekday?: number,       // 0-6 (Sun-Sat), for weekly/biweekly
 *     time?: string,          // "HH:MM" start time
 *     dayOfMonth?: number,    // 1-31, for monthly
 *     title: string,          // representative title
 *     events: CalendarEvent[],
 *     confidence: number,     // 0-1
 *   }
 */

function parseDateLocal(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function normalizeTitle(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function daysBetween(a, b) {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

/**
 * Groups events that share a normalized title.
 */
function groupByTitle(events) {
  const groups = new Map();
  for (const ev of events) {
    if (!ev.date) continue;
    const key = normalizeTitle(ev.title);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ev);
  }
  return groups;
}

/**
 * Computes how consistent the interval between sorted event dates is.
 * Returns a 0-1 score where 1 = perfectly consistent spacing.
 */
function intervalConsistency(sortedEvents, expectedGapDays) {
  if (sortedEvents.length < 2) return 0;
  let consistent = 0;
  for (let i = 1; i < sortedEvents.length; i++) {
    const gap = daysBetween(parseDateLocal(sortedEvents[i - 1].date), parseDateLocal(sortedEvents[i].date));
    if (Math.abs(gap - expectedGapDays) <= 1) consistent += 1;
  }
  return consistent / (sortedEvents.length - 1);
}

/**
 * detectPatterns
 * @param {object[]} events - CalendarEvent[]
 * @returns {object[]} Pattern[]
 */
export function detectPatterns(events) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const patterns = [];
  const groups = groupByTitle(events);

  for (const [, groupEvents] of groups) {
    if (groupEvents.length < 2) continue;

    // Sub-group by start time, since the same title could occur at different
    // times of day for unrelated reasons.
    const byTime = new Map();
    for (const ev of groupEvents) {
      const time = ev.startTime || "00:00";
      if (!byTime.has(time)) byTime.set(time, []);
      byTime.get(time).push(ev);
    }

    for (const [time, sameTimeEvents] of byTime) {
      if (sameTimeEvents.length < 2) continue;

      const sorted = [...sameTimeEvents].sort((a, b) => (a.date < b.date ? -1 : 1));

      // --- Daily pattern: consistent ~1 day gaps across the whole same-time group ---
      const dailyConsistency = intervalConsistency(sorted, 1);
      if (sorted.length >= 3 && dailyConsistency >= 0.7) {
        patterns.push({
          type: "daily",
          time,
          title: sorted[0].title,
          events: sorted,
          confidence: round((sorted.length / (sorted.length + 1)) * dailyConsistency),
        });
      }

      // --- Weekly pattern: same weekday, ~7 day gaps ---
      const weekdayCounts = new Map();
      for (const ev of sorted) {
        const wd = parseDateLocal(ev.date).getDay();
        weekdayCounts.set(wd, (weekdayCounts.get(wd) || 0) + 1);
      }
      const [dominantWeekday, dominantCount] =
        [...weekdayCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];

      if (dominantCount >= 2) {
        const sameWeekdayEvents = sorted.filter(
          (ev) => parseDateLocal(ev.date).getDay() === dominantWeekday
        );

        if (sameWeekdayEvents.length >= 2) {
          const weeklyConsistency = intervalConsistency(sameWeekdayEvents, 7);
          const biweeklyConsistency = intervalConsistency(sameWeekdayEvents, 14);

          if (weeklyConsistency >= 0.6) {
            patterns.push({
              type: "weekly",
              weekday: dominantWeekday,
              time,
              title: sameWeekdayEvents[0].title,
              events: sameWeekdayEvents,
              confidence: round(
                (sameWeekdayEvents.length / (sameWeekdayEvents.length + 1)) * weeklyConsistency
              ),
            });
          } else if (biweeklyConsistency >= 0.6) {
            patterns.push({
              type: "biweekly",
              weekday: dominantWeekday,
              time,
              title: sameWeekdayEvents[0].title,
              events: sameWeekdayEvents,
              confidence: round(
                (sameWeekdayEvents.length / (sameWeekdayEvents.length + 1)) * biweeklyConsistency
              ),
            });
          }
        }
      }

      // --- Monthly pattern: same day-of-month ---
      const domCounts = new Map();
      for (const ev of sorted) {
        const dom = parseDateLocal(ev.date).getDate();
        domCounts.set(dom, (domCounts.get(dom) || 0) + 1);
      }
      const [dominantDom, dominantDomCount] =
        [...domCounts.entries()].sort((a, b) => b[1] - a[1])[0] || [];

      if (dominantDomCount >= 2) {
        const sameDomEvents = sorted.filter(
          (ev) => parseDateLocal(ev.date).getDate() === dominantDom
        );
        if (sameDomEvents.length >= 2) {
          const monthlyConsistency = intervalConsistency(sameDomEvents, 30);
          if (monthlyConsistency >= 0.5) {
            patterns.push({
              type: "monthly",
              dayOfMonth: dominantDom,
              time,
              title: sameDomEvents[0].title,
              events: sameDomEvents,
              confidence: round(
                (sameDomEvents.length / (sameDomEvents.length + 1)) * monthlyConsistency
              ),
            });
          }
        }
      }
    }
  }

  // Deduplicate: keep the highest-confidence pattern per (title+type+weekday/dayOfMonth)
  const dedupMap = new Map();
  for (const p of patterns) {
    const key = `${normalizeTitle(p.title)}|${p.type}|${p.weekday ?? ""}|${p.dayOfMonth ?? ""}|${p.time}`;
    const existing = dedupMap.get(key);
    if (!existing || existing.confidence < p.confidence) {
      dedupMap.set(key, p);
    }
  }

  return [...dedupMap.values()].sort((a, b) => b.confidence - a.confidence);
}

function round(n) {
  return Math.round(n * 100) / 100;
}
