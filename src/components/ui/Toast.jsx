import "./Toast.css";

/**
 * Toast notification stack. Renders a fixed-position list of transient
 * messages. Consumers manage the list of toasts in App-level state and
 * call `onDismiss` to remove a toast (e.g. after a timeout or manually).
 *
 * Props:
 *   toasts: { id, message, type }[]   type: "success" | "error" | "info"
 *   onDismiss: (id) => void
 */
export function ToastStack({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="ui-toast-stack" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ui-toast ui-toast--${toast.type || "info"}`}>
          <span className="ui-toast__message">{toast.message}</span>
          <button
            type="button"
            className="ui-toast__dismiss"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default ToastStack;
