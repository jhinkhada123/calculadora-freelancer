const TELEMETRY_KEY = "freela_telemetry_events_v1";
const MAX_EVENTS = 300;

function loadEvents() {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveEvents(events) {
  try {
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // ignore local telemetry failures
  }
}

export function trackEvent(name, payload = {}, adapter = null) {
  const event = {
    name: String(name || "unknown"),
    payload: payload && typeof payload === "object" ? payload : {},
    timestamp: new Date().toISOString(),
  };
  const next = loadEvents();
  next.push(event);
  saveEvents(next);
  if (typeof adapter === "function") {
    try {
      adapter(event);
    } catch {
      // ignore adapter failure
    }
  }
  return event;
}
