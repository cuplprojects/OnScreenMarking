import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft, 
  ExternalLink, 
  Layers, 
  Award,
  RefreshCw
} from "lucide-react";
import apiCall from "../services/api";
import message from "../services/messageService";

export default function StudentPortal() {
  const [rollNumber, setRollNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState([]);
  const [searched, setSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!rollNumber.trim()) {
      message.warning("Please enter your roll number");
      return;
    }

    setLoading(true);
    try {
      // Direct fetch call using apiCall (configured for api requests)
      // Since it's anonymous, it doesn't require auth token.
      const data = await apiCall(`/studentportal/scripts?rollNumber=${encodeURIComponent(rollNumber.trim())}`);
      setScripts(data || []);
      setSearched(true);
      if (data && data.length === 0) {
        message.info("No evaluated scripts found for this roll number.");
      } else {
        message.success(`Found ${data.length} evaluated sheet(s).`);
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || "Failed to fetch student scripts");
    } finally {
      setLoading(false);
    }
  };

  const handleReEvaluation = async (scriptId) => {
    if (!window.confirm("Are you sure you want to request re-evaluation for this paper?")) {
      return;
    }

    setActionLoading(prev => ({ ...prev, [scriptId]: true }));
    try {
      await apiCall(`/studentportal/reevaluation/${scriptId}`, {
        method: "POST"
      });
      message.success("Re-evaluation request submitted successfully!");
      // Update local state
      setScripts(prev => prev.map(s => 
        s.scriptId === scriptId ? { ...s, isReEvaluationRequested: true } : s
      ));
    } catch (err) {
      console.error(err);
      message.error(err.message || "Failed to submit re-evaluation request");
    } finally {
      setActionLoading(prev => ({ ...prev, [scriptId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/login" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Layers className="text-blue-600 w-5 h-5" />
                Student Evaluation Portal
              </h1>
              <p className="text-xs text-gray-500">View evaluated answer keys & request re-evaluation</p>
            </div>
          </div>
          <Link 
            to="/login" 
            className="text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            Staff Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col items-center">
        {/* Search Container */}
        <div className="w-full max-w-xl bg-white rounded-3xl p-6 md:p-8 shadow-md border border-gray-150 mb-8 transition-all hover:shadow-lg">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Check Exam Evaluation Status</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your unique examination roll number to fetch your verified copy records.</p>
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter Roll Number (e.g. ROLL1001)"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 px-4 py-3 pl-12 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm font-semibold"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-md active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {loading ? "Searching..." : "Fetch Records"}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {searched && (
          <div className="w-full bg-white rounded-3xl shadow-md border border-gray-150 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="px-6 py-5 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Evaluated Sheet Records</h3>
                <p className="text-xs text-gray-500 mt-0.5">Showing completed papers for Roll Number: <span className="font-bold text-blue-600">{rollNumber}</span></p>
              </div>
              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-100">
                {scripts.length} Result{scripts.length !== 1 && "s"}
              </span>
            </div>

            {scripts.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText size={32} />
                </div>
                <h4 className="text-lg font-bold text-gray-900">No Evaluated Copies Found</h4>
                <p className="text-gray-500 max-w-xs mx-auto mt-2 text-sm">Either the roll number is incorrect or your scripts are still under evaluation.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/30 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Paper / Course</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Total Marks</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Percentage</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {scripts.map((script) => (
                      <tr key={script.scriptId} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                              {script.paperCode.substring(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 leading-tight">{script.paperName}</p>
                              <p className="text-xs text-gray-500 mt-1">Code: {script.paperCode} | Subject: {script.subjectName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="font-bold text-gray-800 text-sm">{script.totalMarks}</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="font-semibold text-gray-700 text-sm">{script.percentage.toFixed(1)}%</span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {script.isReEvaluationRequested ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Re-evaluation Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {script.evaluatedPdfUrl ? (
                              <a
                                href={`${import.meta.env.VITE_API_URL.replace("/api", "")}${script.evaluatedPdfUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs transition-all shadow-sm border border-blue-100 active:scale-95"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                View Evaluated PDF
                              </a>
                            ) : (
                              <span className="text-xs text-gray-400 italic font-medium px-2">PDF compiling...</span>
                            )}
                            
                            <button
                              onClick={() => handleReEvaluation(script.scriptId)}
                              disabled={script.isReEvaluationRequested || actionLoading[script.scriptId]}
                              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border ${
                                script.isReEvaluationRequested 
                                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                                  : "bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300"
                              }`}
                            >
                              {actionLoading[script.scriptId] ? "Submitting..." : "Apply Re-evaluation"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
