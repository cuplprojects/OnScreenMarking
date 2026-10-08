const listeners = new Set();
const recentMessages = new Map();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notify = (text, type = 'info', duration = 3000) => {
  if (!text) return;
  const strText = String(text).trim();
  const key = `${type}:${strText.toLowerCase()}`;
  const now = Date.now();

  // Deduplicate identical messages sent within 1500ms
  if (recentMessages.has(key) && (now - recentMessages.get(key) < 1500)) {
    return;
  }
  recentMessages.set(key, now);

  // Periodic cleanup
  if (recentMessages.size > 50) {
    for (const [k, time] of recentMessages.entries()) {
      if (now - time > 5000) recentMessages.delete(k);
    }
  }

  const id = Date.now() + Math.random().toString(36).substring(2, 9);
  listeners.forEach((listener) => listener({ id, text: strText, type, duration }));
};

const message = {
  success: (text, duration) => notify(text, 'success', duration),
  error: (text, duration) => notify(text, 'error', duration),
  info: (text, duration) => notify(text, 'info', duration),
  warning: (text, duration) => notify(text, 'warning', duration),
  subscribe,
};

export default message;
