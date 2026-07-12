/**
 * useImport.js
 *
 * Orchestrates the file -> parse -> preview -> confirm import flow used by
 * FileImport.jsx / ImportPreview.jsx.
 */
import { useCallback, useState } from "react";
import { parseCSV } from "../lib/parsing/csvParser.js";
import { parseXLSX } from "../lib/parsing/xlsxParser.js";

const INITIAL_STATE = {
  status: "idle", // idle | parsing | preview | error
  fileName: null,
  events: [],
  warnings: [],
  errors: [],
};

export function useImport({ onImport } = {}) {
  const [importState, setImportState] = useState(INITIAL_STATE);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setImportState({ ...INITIAL_STATE, status: "parsing", fileName: file.name });

    const isCSV = /\.csv$/i.test(file.name) || file.type === "text/csv";
    const isExcel = /\.xlsx?$/i.test(file.name);

    if (!isCSV && !isExcel) {
      setImportState({
        ...INITIAL_STATE,
        status: "error",
        fileName: file.name,
        errors: ["Unsupported file type. Please upload a .csv, .xlsx, or .xls file."],
      });
      return;
    }

    try {
      let result;
      if (isCSV) {
        const text = await file.text();
        result = parseCSV(text);
      } else {
        const buffer = await file.arrayBuffer();
        result = parseXLSX(buffer);
      }

      if (result.events.length === 0 && result.errors.length > 0) {
        setImportState({
          status: "error",
          fileName: file.name,
          events: [],
          warnings: result.warnings,
          errors: result.errors,
        });
        return;
      }

      setImportState({
        status: "preview",
        fileName: file.name,
        events: result.events,
        warnings: result.warnings,
        errors: result.errors,
      });
    } catch (e) {
      setImportState({
        status: "error",
        fileName: file.name,
        events: [],
        warnings: [],
        errors: [`Failed to parse file: ${e.message}`],
      });
    }
  }, []);

  const confirmImport = useCallback(() => {
    if (importState.events.length === 0) return;
    onImport?.(importState.events);
    setImportState(INITIAL_STATE);
  }, [importState.events, onImport]);

  const cancelImport = useCallback(() => {
    setImportState(INITIAL_STATE);
  }, []);

  return { importState, handleFile, confirmImport, cancelImport };
}
