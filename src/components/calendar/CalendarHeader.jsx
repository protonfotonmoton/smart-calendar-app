import { format } from "date-fns";
import { Button } from "../ui/Button.jsx";
import "./CalendarHeader.css";

const VIEWS = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "day", label: "Day" },
];

function getPeriodLabel(currentDate, view) {
  if (view === "month") return format(currentDate, "MMMM yyyy");
  if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");

  // week: compute Sun-Sat range label
  const day = currentDate.getDay();
  const start = new Date(currentDate);
  start.setDate(currentDate.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = format(start, sameMonth ? "MMM d" : "MMM d");
  const endLabel = format(end, sameMonth ? "d, yyyy" : "MMM d, yyyy");
  return `${startLabel} – ${endLabel}`;
}

/**
 * Top navigation bar: period label, prev/next/today, view switcher,
 * new event / import / sync actions.
 */
export function CalendarHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onNewEvent,
  onImport,
  onSync,
}) {
  return (
    <header className="cal-header">
      <div className="cal-header__left">
        <h1 className="cal-header__brand">Smart Calendar</h1>
        <div className="cal-header__nav" role="group" aria-label="Calendar navigation">
          <Button variant="ghost" size="sm" onClick={onPrev} aria-label="Previous period">
            ‹
          </Button>
          <Button variant="secondary" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={onNext} aria-label="Next period">
            ›
          </Button>
        </div>
        <span className="cal-header__period" aria-live="polite">
          {getPeriodLabel(currentDate, view)}
        </span>
      </div>

      <div className="cal-header__right">
        <div className="cal-header__tabs" role="tablist" aria-label="Calendar view">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              className={`cal-header__tab ${view === v.id ? "cal-header__tab--active" : ""}`}
              onClick={() => onViewChange(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onImport}>
          Import
        </Button>
        <Button variant="secondary" size="sm" onClick={onSync}>
          Sync
        </Button>
        <Button variant="primary" size="sm" onClick={onNewEvent}>
          + New Event
        </Button>
      </div>
    </header>
  );
}

export default CalendarHeader;
