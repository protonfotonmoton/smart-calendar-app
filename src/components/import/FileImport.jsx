import { useCallback, useRef, useState } from "react";
import { Modal } from "../ui/Modal.jsx";
import { Button } from "../ui/Button.jsx";
import { ImportPreview } from "./ImportPreview.jsx";
import "./FileImport.css";

/**
 * Full-screen import modal: drag-drop + file picker for CSV/XLSX, followed
 * by a preview/confirm step.
 */
export function FileImport({ isOpen, importState, onFile, onConfirm, onCancel, onClose }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = useCallback(
    (fileList) => {
      const file = fileList?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Import Events" size="lg">
      {importState.status === "preview" ? (
        <ImportPreview importState={importState} onConfirm={onConfirm} onBack={onCancel} />
      ) : (
        <div className="file-import">
          <div
            className={`file-import__dropzone ${isDragging ? "file-import__dropzone--active" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            aria-label="Drag and drop a CSV or Excel file here, or click to choose a file"
          >
            <div className="file-import__icon" aria-hidden="true">
              ⬆
            </div>
            <p className="file-import__title">Drag & drop a CSV or Excel file</p>
            <p className="file-import__subtitle">or click to browse — .csv, .xlsx, .xls supported</p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="visually-hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {importState.status === "parsing" && (
            <p className="file-import__status">Parsing {importState.fileName}…</p>
          )}

          {importState.status === "error" && (
            <div className="file-import__errors" role="alert">
              <p className="file-import__errors-title">
                Couldn&rsquo;t import {importState.fileName}
              </p>
              <ul>
                {importState.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <details className="file-import__help">
            <summary>Expected columns</summary>
            <p>
              We auto-detect common column names: <strong>Title/Summary/Subject/Event</strong>,{" "}
              <strong>Date/Start Date</strong>, <strong>Start Time</strong>,{" "}
              <strong>End Date</strong>, <strong>End Time/Duration</strong>,{" "}
              <strong>Location</strong>, and <strong>Description/Notes</strong>.
            </p>
          </details>

          <div className="file-import__footer">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default FileImport;
