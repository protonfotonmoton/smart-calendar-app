import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

/**
 * Generic accessible modal wrapper with focus trap, Escape-to-close, and
 * backdrop-click-to-close.
 *
 * Props:
 *   isOpen: boolean
 *   onClose: () => void
 *   title: string (used for aria-labelledby)
 *   children: ReactNode
 *   size: "sm" | "md" | "lg"
 */
export function Modal({ isOpen, onClose, title, children, size = "md", labelledBy }) {
  const dialogRef = useRef(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 8)}`).current;

  useEffect(() => {
    if (!isOpen) return undefined;

    const previouslyFocused = document.activeElement;
    const dialogNode = dialogRef.current;
    const focusables = () =>
      dialogNode
        ? Array.from(
            dialogNode.querySelectorAll(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            )
          ).filter((el) => !el.disabled)
        : [];

    const toFocus = focusables();
    (toFocus[0] || dialogNode)?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="ui-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`ui-modal ui-modal--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || titleId}
        ref={dialogRef}
        tabIndex={-1}
      >
        {title && (
          <div className="ui-modal__header">
            <h2 id={titleId} className="ui-modal__title">
              {title}
            </h2>
            <button
              type="button"
              className="ui-modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>
        )}
        <div className="ui-modal__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
