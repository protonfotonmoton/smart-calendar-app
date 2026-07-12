/**
 * useSuggestions.js
 *
 * Runs the pattern-detection + suggestion-generation pipeline over the
 * current events list, and lets the UI accept/dismiss individual
 * suggestions.
 */
import { useCallback, useMemo, useState } from "react";
import { detectPatterns } from "../lib/inference/patternDetector.js";
import { generateSuggestions } from "../lib/inference/suggestionEngine.js";

export function useSuggestions(events) {
  const [dismissedIds, setDismissedIds] = useState(() => new Set());

  const suggestions = useMemo(() => {
    const realEvents = events.filter((e) => !e.isSuggested);
    const patterns = detectPatterns(realEvents);
    const generated = generateSuggestions(patterns, realEvents);
    return generated.filter((s) => !dismissedIds.has(s.id));
  }, [events, dismissedIds]);

  const dismissSuggestion = useCallback((id) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const acceptSuggestion = useCallback(
    (id, onAccept) => {
      const suggestion = suggestions.find((s) => s.id === id);
      if (suggestion) {
        onAccept?.(suggestion.proposedEvent);
        setDismissedIds((prev) => new Set(prev).add(id));
      }
    },
    [suggestions]
  );

  return { suggestions, dismissSuggestion, acceptSuggestion };
}
