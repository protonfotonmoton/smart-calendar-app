import "./EventCard.css";

/**
 * Reusable event card/pill used across Month/Week/Day views.
 *
 * Props:
 *   event: CalendarEvent
 *   view: "month" | "week" | "day"
 *   onClick: (event) => void
 *   onDragStart: (e, event) => void
 *   style: optional inline style (used by Week/Day views for positioning)
 */
export function EventCard({ event, view = "month", onClick, onDragStart, style }) {
  const colorClass = `ev-${event.color || "blue"}`;

  function handleKeyDown(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(event);
    }
  }

  return (
    <div
      className={`event-card event-card--${view} ${colorClass}`}
      style={style}
      role="button"
      tabIndex={0}
      draggable={Boolean(onDragStart)}
      onDragStart={(e) => onDragStart?.(e, event)}
      onClick={() => onClick?.(event)}
      onKeyDown={handleKeyDown}
      title={event.title}
    >
      <span className="event-card__bar" aria-hidden="true" />
      <div className="event-card__content">
        <div className="event-card__title-row">
          <span className="event-card__title">{event.title}</span>
          {event.isSuggested && <span className="event-card__badge">suggested</span>}
        </div>
        {view !== "month" && (
          <span className="event-card__time">
            {event.startTime}–{event.endTime}
          </span>
        )}
        {event.location && view === "day" && (
          <span className="event-card__location">📍 {event.location}</span>
        )}
      </div>
    </div>
  );
}

export default EventCard;
