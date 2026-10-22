const listeners = new Set();
const recentMessages = new Map();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getDefaultDuration = (type, text) => {
  const len = text ? text.length : 0;
  switch (type) {
    case 'error':
      return Math.max(6500, Math.min(15000, len * 60));
    case 'warning':
      return Math.max(6000, Math.min(15000, len * 60));
    case 'info':
      return Math.max(5000, Math.min(10000, len * 50));
    case 'success':
    default:
      return Math.max(4000, Math.min(8000, len * 40));
  }
};

const notify = (text, type = 'info', duration = null) => {
  if (!text) return;
  const strText = String(text).trim();
  const effectiveDuration = duration && duration > 0 ? duration : getDefaultDuration(type, strText);
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
  listeners.forEach((listener) => listener({ id, text: strText, type, duration: effectiveDuration }));
};

const message = {
  success: (text, duration) => notify(text, 'success', duration),
  error: (text, duration) => notify(text, 'error', duration),
  info: (text, duration) => notify(text, 'info', duration),
  warning: (text, duration) => notify(text, 'warning', duration),
  subscribe,
};

export default message;

