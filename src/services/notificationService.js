import { reactive } from "vue";

// reactive array of toasts consumed by a Vue component
export const toasts = reactive([]);

export function showToast(message, timeout = 3000) {
  const id = Date.now() + Math.random();
  toasts.push({ id, message });
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx !== -1) toasts.splice(idx, 1);
  }, timeout);
}

export function removeToast(id) {
  const idx = toasts.findIndex((t) => t.id === id);
  if (idx !== -1) toasts.splice(idx, 1);
}
