import { useEffect, useState } from "react";
import { Button } from "../ui/Button.jsx";
import { listProviders } from "../../lib/sync/index.js";
import "./SyncPanel.css";

/**
 * Sidebar panel showing sync status per registered provider (Google
 * Calendar, CalDAV) and connect/disconnect controls.
 */
export function SyncPanel({ onNotify }) {
  const providers = listProviders();
  const [statusById, setStatusById] = useState({});
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadStatuses() {
      const entries = await Promise.all(
        providers.map(async (p) => {
          try {
            const connected = await p.isConnected();
            return [p.id, connected];
          } catch {
            return [p.id, false];
          }
        })
      );
      if (!cancelled) setStatusById(Object.fromEntries(entries));
    }
    loadStatuses();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggle(provider) {
    setBusyId(provider.id);
    try {
      const connected = statusById[provider.id];
      if (connected) {
        await provider.disconnect();
        setStatusById((prev) => ({ ...prev, [provider.id]: false }));
        onNotify?.(`Disconnected from ${provider.name}.`, "info");
      } else {
        await provider.connect();
        setStatusById((prev) => ({ ...prev, [provider.id]: true }));
        onNotify?.(`Connected to ${provider.name}.`, "success");
      }
    } catch (e) {
      onNotify?.(e.message || `Failed to update ${provider.name} connection.`, "error");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="sync-panel" aria-label="Calendar sync">
      <h2 className="sync-panel__title">Sync</h2>
      <ul className="sync-panel__list">
        {providers.map((p) => {
          const connected = Boolean(statusById[p.id]);
          return (
            <li key={p.id} className="sync-panel__row">
              <div className="sync-panel__info">
                <span className="sync-panel__name">{p.name}</span>
                <span
                  className={`sync-panel__status ${
                    connected ? "sync-panel__status--connected" : ""
                  }`}
                >
                  {connected ? "Connected" : "Not connected"}
                </span>
              </div>
              <Button
                size="sm"
                variant={connected ? "secondary" : "primary"}
                onClick={() => handleToggle(p)}
                disabled={busyId === p.id}
              >
                {busyId === p.id ? "…" : connected ? "Disconnect" : "Connect"}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default SyncPanel;
