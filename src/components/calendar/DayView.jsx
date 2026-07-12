import { useEffect, useMemo, useState } from "react";
import { format, isToday } from "date-fns";
import { EventCard } from "./EventCard.jsx";
import "./DayView.css";

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function timeToMinutes(time) {
  if (!time) return 0;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function layoutEvents(dayEvents) {
  const sorted = [...dayEvents].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
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
    cluster.forEach((ev, i) => result.push({ ...ev, col: i, colCount }));
  }
  return result;
}

/**
 * Single-day agenda view with hourly slots, click-to-create, and a live
 * "now" indicator line.
 */
export function DayView({ currentDate, events, onSlotClick, onEventClick }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayEvents = useMemo(
    () => layoutEvents(events.filter((e) => e.date === dateKey)),
    [events, dateKey]
  );

  const todayCol = isToday(currentDate);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="day-view">
      <div className="day-view__body">
        <div className="day-view__time-gutter">
          {HOURS.map((h) => (
            <div key={h} className="day-view__hour-label" style={{ height: HOUR_HEIGHT }}>
              {h === 0 ? "" : format(new Date(2000, 0, 1, h), "h a")}
            </div>
          ))}
        </div>

        <div className="day-view__col" style={{ height: HOUR_HEIGHT * 24 }}>
          {HOURS.map((h) => (
            <button
              type="button"
              key={h}
              className="day-view__slot"
              style={{ height: HOUR_HEIGHT, top: h * HOUR_HEIGHT }}
              onClick={() => onSlotClick?.(currentDate, `${String(h).padStart(2, "0")}:00`)}
              aria-label={`Create event at ${h}:00`}
            />
          ))}

          {todayCol && (
            <div className="day-view__now-line" style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }} />
          )}

          {dayEvents.map((ev) => {
            const start = timeToMinutes(ev.startTime);
            const end = timeToMinutes(ev.endTime);
            const top = (start / 60) * HOUR_HEIGHT;
            const height = Math.max(((end - start) / 60) * HOUR_HEIGHT, 24);
            const width = 100 / ev.colCount;
            const left = width * ev.col;

            return (
              <div
                key={ev.id}
                className="day-view__event-wrapper"
                style={{ top, height, width: `${width}%`, left: `${left}%` }}
              >
                <EventCard event={ev} view="day" onClick={onEventClick} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default DayView;
