import { Button } from "../ui/Button.jsx";
import "./SuggestionsPanel.css";

function ConfidenceBar({ confidence }) {
  const pct = Math.round(confidence * 100);
  return (
    <div className="suggestion-card__confidence" aria-label={`${pct}% confidence`}>
      <div className="suggestion-card__confidence-fill" style={{ width: `${pct}%` }} />
      <span className="suggestion-card__confidence-label">{pct}%</span>
    </div>
  );
}

/**
 * Sidebar panel listing AI-inferred scheduling suggestions with
 * accept/dismiss actions.
 */
export function SuggestionsPanel({ suggestions, onAccept, onDismiss }) {
  return (
    <section className="suggestions-panel" aria-label="Suggestions">
      <h2 className="suggestions-panel__title">Suggestions</h2>
      {suggestions.length === 0 ? (
        <p className="suggestions-panel__empty">
          No suggestions yet. Import events or add a few recurring events and we&rsquo;ll spot
          patterns here.
        </p>
      ) : (
        <ul className="suggestions-panel__list">
          {suggestions.map((s) => (
            <li key={s.id} className="suggestion-card">
              <p className="suggestion-card__description">{s.description}</p>
              <ConfidenceBar confidence={s.confidence} />
              <div className="suggestion-card__actions">
                <Button size="sm" variant="primary" onClick={() => onAccept(s.id)}>
                  Add to calendar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDismiss(s.id)}>
                  Dismiss
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default SuggestionsPanel;
