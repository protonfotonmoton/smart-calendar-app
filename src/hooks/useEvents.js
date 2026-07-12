/**
 * useEvents.js
 *
 * Manages the calendar events array with localStorage persistence.
 * Event shape:
 *   { id, title, date, startTime, endTime, location, description, color,
 *     isRecurring, recurrenceRule, isImported, isSuggested, source }
 */
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "sca_events";

let idCounter = 0;
function generateId() {
  idCounter += 1;
  return `ev_${Date.now().toString(36)}_${idCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function loadEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Storage might be full or unavailable (e.g. private browsing) — fail silently,
    // the in-memory state remains usable for the current session.
  }
}

export function useEvents() {
  const [events, setEvents] = useState(loadEvents);

  useEffect(() => {
    saveEvents(events);
  }, [events]);

  const addEvent = useCallback((event) => {
    const newEvent = {
      id: generateId(),
      title: "",
      date: "",
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      description: "",
      color: "blue",
      isRecurring: false,
      recurrenceRule: null,
      isImported: false,
      isSuggested: false,
      source: "manual",
      ...event,
    };
    setEvents((prev) => [...prev, newEvent]);
    return newEvent;
  }, []);

  const updateEvent = useCallback((id, updates) => {
    setEvents((prev) => prev.map((ev) => (ev.id === id ? { ...ev, ...updates } : ev)));
  }, []);

  const deleteEvent = useCallback((id) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id));
  }, []);

  const importEvents = useCallback((newEvents) => {
    setEvents((prev) => [...prev, ...newEvents.map((ev) => ({ ...ev, id: ev.id || generateId() }))]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, addEvent, updateEvent, deleteEvent, importEvents, clearEvents };
}
