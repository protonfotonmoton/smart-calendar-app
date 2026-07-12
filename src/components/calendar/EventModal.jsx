import { useEffect, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import "./EventModal.css";

const COLORS = [
  { id: "blue", label: "Blue" },
  { id: "green", label: "Green" },
  { id: "purple", label: "Purple" },
  { id: "orange", label: "Orange" },
  { id: "pink", label: "Pink" },
  { id: "teal", label: "Teal" },
  { id: "red", label: "Red" },
  { id: "yellow", label: "Yellow" },
];

const RECURRENCE_OPTIONS = [
  { id: "none", label: "Does not repeat" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

function emptyForm(defaults = {}) {
  return {
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    description: "",
    color: "blue",
    recurrenceRule: "none",
    ...defaults,
  };
}

/**
 * Create/Edit event modal. In edit mode (event prop provided with an id),
 * shows Update + Delete actions; otherwise shows Create.
 */
export function EventModal({ isOpen, event, defaultDate, defaultTime, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(() => emptyForm());
  const [error, setError] = useState("");

  const isEditMode = Boolean(event?.id);

  useEffect(() => {
    if (!isOpen) return;
    if (event) {
      setForm(
        emptyForm({
          title: event.title || "",
          date: event.date || "",
          startTime: event.startTime || "09:00",
          endTime: event.endTime || "10:00",
          location: event.location || "",
          description: event.description || "",
          color: event.color || "blue",
          recurrenceRule: event.recurrenceRule || "none",
        })
      );
    } else {
      setForm(
        emptyForm({
          date: defaultDate || "",
          startTime: defaultTime || "09:00",
          endTime: defaultTime ? addHour(defaultTime) : "10:00",
        })
      );
    }
    setError("");
  }, [isOpen, event, defaultDate, defaultTime]);

  function addHour(time) {
    const [h, m] = time.split(":").map(Number);
    const total = (h * 60 + m + 60) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.date) {
      setError("Date is required.");
      return;
    }
    if (form.endTime <= form.startTime) {
      setError("End time must be after start time.");
      return;
    }

    onSave({
      ...form,
      title: form.title.trim(),
      isRecurring: form.recurrenceRule !== "none",
      recurrenceRule: form.recurrenceRule === "none" ? null : form.recurrenceRule,
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Edit Event" : "New Event"}
      size="md"
    >
      <form className="event-modal-form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p className="event-modal-form__error" role="alert">
            {error}
          </p>
        )}

        <label className="event-modal-form__field">
          <span>Title *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
            required
            autoFocus
          />
        </label>

        <div className="event-modal-form__row">
          <label className="event-modal-form__field">
            <span>Date *</span>
            <input
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              required
            />
          </label>
        </div>

        <div className="event-modal-form__row">
          <label className="event-modal-form__field">
            <span>Start Time</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(e) => handleChange("startTime", e.target.value)}
            />
          </label>
          <label className="event-modal-form__field">
            <span>End Time</span>
            <input
              type="time"
              value={form.endTime}
              onChange={(e) => handleChange("endTime", e.target.value)}
            />
          </label>
        </div>

        <label className="event-modal-form__field">
          <span>Location</span>
          <input
            type="text"
            value={form.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="Optional"
          />
        </label>

        <label className="event-modal-form__field">
          <span>Description</span>
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={3}
            placeholder="Optional"
          />
        </label>

        <div className="event-modal-form__row">
          <label className="event-modal-form__field">
            <span>Color</span>
            <select value={form.color} onChange={(e) => handleChange("color", e.target.value)}>
              {COLORS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="event-modal-form__field">
            <span>Recurring</span>
            <select
              value={form.recurrenceRule}
              onChange={(e) => handleChange("recurrenceRule", e.target.value)}
            >
              {RECURRENCE_OPTIONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="event-modal-form__actions">
          {isEditMode && (
            <Button
              type="button"
              variant="danger"
              onClick={() => onDelete?.(event.id)}
            >
              Delete
            </Button>
          )}
          <div className="event-modal-form__actions-right">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {isEditMode ? "Update" : "+ Create Event"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default EventModal;
