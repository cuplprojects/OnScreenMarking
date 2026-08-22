import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import message from '../services/messageService';

export default function MessageContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const unsubscribe = message.subscribe((toast) => {
      setToasts((prev) => [...prev, toast]);
      
      // Auto remove toast after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, toast.duration || 3000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0" />;
    }
  };

  const getColorClass = (type) => {
    switch (type) {
      case 'success':
        return 'border-emerald-100 bg-emerald-50 text-emerald-950';
      case 'error':
        return 'border-rose-100 bg-rose-50 text-rose-950';
      case 'warning':
        return 'border-amber-100 bg-amber-50 text-amber-955';
      default:
        return 'border-blue-100 bg-blue-50 text-blue-950';
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border shadow-lg  pointer-events-auto transition-all duration-300 ${getColorClass(
            toast.type
          )}`}
        >
          <div className="flex items-start gap-2.5">
            {getIcon(toast.type)}
            <p className="text-xs font-bold leading-tight">{toast.text}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-0.5 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
