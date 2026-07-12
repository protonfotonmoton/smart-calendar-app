import { useMemo } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { EventCard } from "./EventCard.jsx";
import "./MonthView.css";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

/**
 * 7-column month grid. Supports click-to-drill-into-day, click event to
 * edit, and HTML5 drag-and-drop to reschedule events between days.
 */
export function MonthView({ currentDate, events, onDayClick, onEventClick, onEventDrop }) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map();
    for (const ev of events) {
      if (!ev.date) continue;
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date).push(ev);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return map;
  }, [events]);

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDrop(e, day) {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/event-id");
    if (eventId) {
      onEventDrop?.(eventId, format(day, "yyyy-MM-dd"));
    }
  }

  function handleDragStart(e, event) {
    e.dataTransfer.setData("text/event-id", event.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="month-view">
      <div className="month-view__weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="month-view__weekday">
            {label}
          </div>
        ))}
      </div>
      <div className="month-view__grid">
        {days.map((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(dateKey) || [];
          const visible = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
          const overflow = dayEvents.length - visible.length;
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              className={`month-view__cell ${inMonth ? "" : "month-view__cell--faded"} ${
                today ? "month-view__cell--today" : ""
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day)}
            >
              <button
                type="button"
                className="month-view__day-number"
                onClick={() => onDayClick?.(day)}
                aria-label={`Go to ${format(day, "MMMM d, yyyy")}`}
              >
                {format(day, "d")}
              </button>
              <div className="month-view__events">
                {visible.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    view="month"
                    onClick={onEventClick}
                    onDragStart={handleDragStart}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    className="month-view__overflow"
                    onClick={() => onDayClick?.(day)}
                  >
                    +{overflow} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
