import { useEffect, useMemo, useState } from "react";
import { addDays, format, isToday, startOfWeek } from "date-fns";
import { EventCard } from "./EventCard.jsx";
import "./WeekView.css";

const HOUR_HEIGHT = 56; // px per hour
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Computes a simple side-by-side layout for overlapping events within a
 * single day column. Returns each event annotated with { col, colCount }.
 */
function layoutDayEvents(dayEvents) {
  const sorted = [...dayEvents].sort(
    (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  const clusters = [];
  let current = [];
  let currentEnd = -1;

  for (const ev of sorted) {
    const start = timeToMinutes(ev.startTime);
    const end = timeToMinutes(ev.endTime);
    if (current.length === 0 || start < currentEnd) {
      current.push(ev);
      currentEnd = Math.max(currentEnd, end);
    } else {
      clusters.push(current);
      current = [ev];
      currentEnd = end;
    }
  }
  if (current.length > 0) clusters.push(current);

  const result = [];
  for (const cluster of clusters) {
    const colCount = cluster.length;
    cluster.forEach((ev, i) => {
      result.push({ ...ev, col: i, colCount });
    });
  }
  return result;
}

/**
 * Week column view: time axis on the left, 7 day columns with events
 * positioned by time, an all-day row, click-to-create on empty slots, and
 * a live "now" indicator line.
 */
export function WeekView({ currentDate, events, onSlotClick, onEventClick, onEventDrop }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const weekStart = useMemo(() => startOfWeek(currentDate), [currentDate]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const dayEvents = events.filter((e) => e.date === key);
      map.set(key, layoutDayEvents(dayEvents));
    }
    return map;
  }, [days, events]);

  function handleDragStart(e, event) {
    e.dataTransfer.setData("text/event-id", event.id);
  }

  function handleDrop(e, day) {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/event-id");
    if (eventId) onEventDrop?.(eventId, format(day, "yyyy-MM-dd"));
  }

  return (
    <div className="week-view">
      <div className="week-view__header">
        <div className="week-view__time-gutter" />
        {days.map((day) => (
          <div key={day.toISOString()} className={`week-view__day-head ${isToday(day) ? "week-view__day-head--today" : ""}`}>
            <span className="week-view__day-name">{format(day, "EEE")}</span>
            <span className="week-view__day-num">{format(day, "d")}</span>
          </div>
        ))}
      </div>

      <div className="week-view__body">
        <div className="week-view__time-gutter">
          {HOURS.map((h) => (
            <div key={h} className="week-view__hour-label" style={{ height: HOUR_HEIGHT }}>
              {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const isTodayCol = isToday(day);
          const nowMinutes = now.getHours() * 60 + now.getMinutes();

          return (
            <div
              key={key}
              className="week-view__day-col"
              style={{ height: HOUR_HEIGHT * 24 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, day)}
            >
              {HOURS.map((h) => (
                <button
                  type="button"
                  key={h}
                  className="week-view__slot"
                  style={{ height: HOUR_HEIGHT, top: h * HOUR_HEIGHT }}
                  onClick={() => onSlotClick?.(day, `${String(h).padStart(2, "0")}:00`)}
                  aria-label={`Create event on ${format(day, "MMM d")} at ${h}:00`}
                />
              ))}

              {isTodayCol && (
                <div className="week-view__now-line" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} />
              )}

              {dayEvents.map((ev) => {
                const start = timeToMinutes(ev.startTime);
                const end = timeToMinutes(ev.endTime);
                const top = (start / 60) * HOUR_HEIGHT;
                const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 20);
                const width = 100 / ev.colCount;
                const left = width * ev.col;

                return (
                  <div
                    key={ev.id}
                    className="week-view__event-wrapper"
                    style={{ top, height, width: `${width}%`, left: `${left}%` }}
                  >
                    <EventCard event={ev} view="week" onClick={onEventClick} onDragStart={handleDragStart} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeekView;
