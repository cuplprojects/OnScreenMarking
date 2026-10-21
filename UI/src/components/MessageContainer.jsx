import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import message from '../services/messageService';

function ToastItem({ toast, onRemove }) {
  const [isPaused, setIsPaused] = useState(false);
  const remainingTimeRef = useRef(toast.duration || 6000);
  const timerStartRef = useRef(Date.now());
  const timerIdRef = useRef(null);

  const startTimer = useCallback(() => {
    timerStartRef.current = Date.now();
    timerIdRef.current = setTimeout(() => {
      onRemove(toast.id);
    }, remainingTimeRef.current);
  }, [toast.id, onRemove]);

  const pauseTimer = useCallback(() => {
    if (timerIdRef.current) {
      clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
    const elapsed = Date.now() - timerStartRef.current;
    remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerIdRef.current) clearTimeout(timerIdRef.current);
    };
  }, [startTimer]);

  const handleMouseEnter = () => {
    pauseTimer();
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
    startTimer();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />;
      default:
        return <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />;
    }
  };

  const getColorClass = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-500/10';
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-950 shadow-rose-500/10';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-950 shadow-amber-500/10';
      default:
        return 'border-teal-200 bg-teal-50 text-teal-950 shadow-teal-500/10';
    }
  };

  const getProgressColor = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500';
      case 'error':
        return 'bg-rose-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-teal-500';
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-xs pointer-events-auto transition-all duration-200 hover:shadow-2xl overflow-hidden ${getColorClass(
        toast.type
      )}`}
    >
      <div className="flex items-start gap-2.5 flex-1 min-w-0 pr-1">
        {getIcon(toast.type)}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <p className="text-xs font-bold leading-relaxed break-words">{toast.text}</p>
         
        </div>
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-black/5 shrink-0 -mr-1 -mt-1 cursor-pointer"
        title="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar indicating auto-close countdown (freezes when hovered) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/5 overflow-hidden">
        <div
          className={`h-full ${getProgressColor(toast.type)}`}
          style={{
            animation: `toast-progress ${toast.duration || 6000}ms linear forwards`,
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        />
      </div>
    </div>
  );
}

export default function MessageContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = message.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
    });

    return unsubscribe;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-md w-[calc(100vw-3rem)] sm:w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

