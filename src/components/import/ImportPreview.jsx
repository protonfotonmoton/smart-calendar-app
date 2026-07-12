import { Button } from "../ui/Button.jsx";
import "./ImportPreview.css";

const PREVIEW_LIMIT = 10;

/**
 * Table preview of parsed import events before confirming the import.
 */
export function ImportPreview({ importState, onConfirm, onBack }) {
  const { events, warnings, fileName } = importState;
  const preview = events.slice(0, PREVIEW_LIMIT);

  return (
    <div className="import-preview">
      <p className="import-preview__summary">
        Found <strong>{events.length}</strong> event{events.length === 1 ? "" : "s"} in{" "}
        <strong>{fileName}</strong>
        {events.length > PREVIEW_LIMIT && ` — showing first ${PREVIEW_LIMIT}`}.
      </p>

      {warnings.length > 0 && (
        <details className="import-preview__warnings">
          <summary>{warnings.length} warning(s)</summary>
          <ul>
            {warnings.slice(0, 20).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="import-preview__table-wrap">
        <table className="import-preview__table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Start</th>
              <th>End</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((ev) => (
              <tr key={ev.id}>
                <td>{ev.title}</td>
                <td>{ev.date}</td>
                <td>{ev.startTime}</td>
                <td>{ev.endTime}</td>
                <td>{ev.location || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="import-preview__footer">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={events.length === 0}>
          Import {events.length} Event{events.length === 1 ? "" : "s"}
        </Button>
      </div>
    </div>
  );
}

export default ImportPreview;
