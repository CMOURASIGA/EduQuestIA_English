export type LocalEventName = string;

export interface TelemetryEvent {
  eventName: LocalEventName;
  timestamp: string;
}

const STORAGE_KEY = "eduquest_events_v1";

export function getTelemetryEvents(): TelemetryEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TelemetryEvent[];
  } catch {
    return [];
  }
}

export function logTelemetryEvent(eventName: LocalEventName): void {
  const events = getTelemetryEvents();
  const newEvent: TelemetryEvent = {
    eventName,
    timestamp: new Date().toISOString()
  };

  // Limit to 200 events
  const updatedEvents = [...events, newEvent].slice(-200);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEvents));
  } catch (err) {
    console.error("Failed to log telemetry locally:", err);
  }
}
