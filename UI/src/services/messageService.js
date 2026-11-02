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
  const now = Date.now();
  const lower = strText.toLowerCase();

  // Deduplicate identical or substring messages of the same type sent within 2500ms
  for (const [k, time] of recentMessages.entries()) {
    if (now - time < 2500) {
      const colonIdx = k.indexOf(':');
      const prevType = k.substring(0, colonIdx);
      const prevMsg = k.substring(colonIdx + 1);
      if (prevType === type) {
        if (
          lower === prevMsg ||
          (lower.length > 5 && prevMsg.length > 5 && (lower.includes(prevMsg) || prevMsg.includes(lower)))
        ) {
          return;
        }
      }
    }
  }

  const key = `${type}:${lower}`;
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

