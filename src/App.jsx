import { useCallback, useState } from "react";
import { format } from "date-fns";
import { CalendarHeader } from "./components/calendar/CalendarHeader.jsx";
import { MonthView } from "./components/calendar/MonthView.jsx";
import { WeekView } from "./components/calendar/WeekView.jsx";
import { DayView } from "./components/calendar/DayView.jsx";
import { EventModal } from "./components/calendar/EventModal.jsx";
import { SuggestionsPanel } from "./components/calendar/SuggestionsPanel.jsx";
import { FileImport } from "./components/import/FileImport.jsx";
import { SyncPanel } from "./components/sync/SyncPanel.jsx";
import { ToastStack } from "./components/ui/Toast.jsx";
import { useCalendar } from "./hooks/useCalendar.js";
import { useEvents } from "./hooks/useEvents.js";
import { useImport } from "./hooks/useImport.js";
import { useSuggestions } from "./hooks/useSuggestions.js";
import "./App.css";

let toastCounter = 0;

function App() {
  const { currentDate, setCurrentDate, view, setView, navigatePrev, navigateNext, goToToday } =
    useCalendar();
  const { events, addEvent, updateEvent, deleteEvent, importEvents } = useEvents();

  const [toasts, setToasts] = useState([]);
  const notify = useCallback((message, type = "info") => {
    const id = `toast_${Date.now()}_${(toastCounter += 1)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const { suggestions, dismissSuggestion, acceptSuggestion } = useSuggestions(events);

  const { importState, handleFile, confirmImport, cancelImport } = useImport({
    onImport: (importedEvents) => {
      importEvents(importedEvents);
      notify(`Imported ${importedEvents.length} event${importedEvents.length === 1 ? "" : "s"}.`, "success");
      setIsImportOpen(false);
    },
  });

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, event: null, defaultDate: null, defaultTime: null });

  function openCreateModal(defaultDate, defaultTime) {
    setModalState({
      isOpen: true,
      event: null,
      defaultDate: defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(currentDate, "yyyy-MM-dd"),
      defaultTime: defaultTime || null,
    });
  }

  function openEditModal(event) {
    setModalState({ isOpen: true, event, defaultDate: null, defaultTime: null });
  }

  function closeModal() {
    setModalState({ isOpen: false, event: null, defaultDate: null, defaultTime: null });
  }

  function handleSaveEvent(formValues) {
    if (modalState.event?.id) {
      updateEvent(modalState.event.id, formValues);
      notify("Event updated.", "success");
    } else {
      addEvent(formValues);
      notify("Event created.", "success");
    }
    closeModal();
  }

  function handleDeleteEvent(id) {
    deleteEvent(id);
    notify("Event deleted.", "info");
    closeModal();
  }

  function handleDayClick(day) {
    setCurrentDate(day);
    setView("day");
  }

  function handleEventDrop(eventId, newDate) {
    updateEvent(eventId, { date: newDate });
    notify("Event rescheduled.", "success");
  }

  function handleAcceptSuggestion(id) {
    acceptSuggestion(id, (proposedEvent) => {
      addEvent(proposedEvent);
      notify("Suggestion added to calendar.", "success");
    });
  }

  return (
    <div className="app">
      <aside className="app__sidebar">
        <SyncPanel onNotify={notify} />
        <div className="app__sidebar-divider" />
        <SuggestionsPanel
          suggestions={suggestions}
          onAccept={handleAcceptSuggestion}
          onDismiss={dismissSuggestion}
        />
      </aside>

      <main className="app__main">
        <CalendarHeader
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onPrev={navigatePrev}
          onNext={navigateNext}
          onToday={goToToday}
          onNewEvent={() => openCreateModal(currentDate)}
          onImport={() => setIsImportOpen(true)}
          onSync={() => notify("Use the Sync panel on the left to connect a calendar provider.", "info")}
        />

        <div className="app__view">
          {view === "month" && (
            <MonthView
              currentDate={currentDate}
              events={events}
              onDayClick={handleDayClick}
              onEventClick={openEditModal}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === "week" && (
            <WeekView
              currentDate={currentDate}
              events={events}
              onSlotClick={(day, time) => openCreateModal(day, time)}
              onEventClick={openEditModal}
              onEventDrop={handleEventDrop}
            />
          )}
          {view === "day" && (
            <DayView
              currentDate={currentDate}
              events={events}
              onSlotClick={(day, time) => openCreateModal(day, time)}
              onEventClick={openEditModal}
            />
          )}
        </div>
      </main>

      <EventModal
        isOpen={modalState.isOpen}
        event={modalState.event}
        defaultDate={modalState.defaultDate}
        defaultTime={modalState.defaultTime}
        onClose={closeModal}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />

      <FileImport
        isOpen={isImportOpen}
        importState={importState}
        onFile={handleFile}
        onConfirm={confirmImport}
        onCancel={cancelImport}
        onClose={() => {
          cancelImport();
          setIsImportOpen(false);
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
