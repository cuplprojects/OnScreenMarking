import { useState } from 'react';
import { X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import apiCall from '../services/api';

const RequestScriptsModal = ({ isOpen, onClose, paper, examinerId, onRequested }) => {
  const [requestCount, setRequestCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (requestCount <= 0 || requestCount > 50) {
        throw new Error("You can only request between 1 and 50 scripts at a time.");
      }

      const res = await apiCall('/allocation/request-scripts', {
        method: 'POST',
        body: JSON.stringify({
          paperId: paper.paperId,
          requestCount: parseInt(requestCount)
        })
      });

      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          onRequested();
          onClose();
          setSuccess(false);
          setRequestCount(10);
        }, 2000);
      } else {
        setError(res.message || "Failed to request scripts.");
      }
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Request Scripts</h2>
            <p className="text-xs text-slate-500 mt-1">
              {paper?.paperName} ({paper?.paperCode})
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Successfully Allocated!</h3>
                <p className="text-sm text-slate-500 mt-1">
                  You have been allocated the scripts. Remember, you must evaluate them by the end of today.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 flex gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Number of scripts to request
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={requestCount}
                    onChange={(e) => setRequestCount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all text-slate-700 outline-none"
                    placeholder="Enter amount (max 50)"
                    disabled={loading}
                    required
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    MAX 50
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Allocations expire daily. Do not request more than you can mark today.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30"
                >
                  {loading ? (
                    <>
                      <Loader size={18} className="animate-spin" />
                      Requesting...
                    </>
                  ) : (
                    'Request Scripts'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestScriptsModal;
