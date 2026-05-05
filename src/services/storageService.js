// Простая обёртка для безопасной работы с localStorage
export function getJSON(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (e) {
    console.error("getJSON parse error:", e);
    return defaultValue;
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error("setJSON error:", e);
    return false;
  }
}

export function remove(key) {
  localStorage.removeItem(key);
}
