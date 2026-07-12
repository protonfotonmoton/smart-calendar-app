/**
 * useCalendar.js
 *
 * Owns the "which period of time are we looking at, and in what view mode"
 * state for the calendar, plus navigation helpers.
 */
import { useCallback, useState } from "react";
import { addDays, addMonths, addWeeks, subDays, subMonths, subWeeks } from "date-fns";

export function useCalendar(initialDate = new Date()) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [view, setView] = useState("month"); // "month" | "week" | "day"

  const navigatePrev = useCallback(() => {
    setCurrentDate((prev) => {
      if (view === "month") return subMonths(prev, 1);
      if (view === "week") return subWeeks(prev, 1);
      return subDays(prev, 1);
    });
  }, [view]);

  const navigateNext = useCallback(() => {
    setCurrentDate((prev) => {
      if (view === "month") return addMonths(prev, 1);
      if (view === "week") return addWeeks(prev, 1);
      return addDays(prev, 1);
    });
  }, [view]);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  return {
    currentDate,
    setCurrentDate,
    view,
    setView,
    navigatePrev,
    navigateNext,
    goToToday,
  };
}
