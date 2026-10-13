// Per-viewer preferences only (theme, language, collapsed panels, saved views, drafts).
// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
const PREFIX = "mastery-admin:";

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore: preferences are a convenience */
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
