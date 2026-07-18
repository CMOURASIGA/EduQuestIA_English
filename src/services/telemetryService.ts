export type LocalEventName =
  | "support_opened"
  | "support_amount_selected"
  | "pix_code_copied"
  | "receipt_code_submitted"
  | "receipt_code_rejected"
  | "receipt_code_reused"
  | "support_badge_activated"
  | "support_badge_shared"
  | "app_invite_clicked"
  | "app_invite_shared"
  | "progress_exported"
  | "progress_imported";

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
