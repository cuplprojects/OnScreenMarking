import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Eye, Download, CheckCircle, Clock, AlertCircle, Loader, BookOpen } from 'lucide-react';
import allocationService from '../services/allocationService';
import { useAuth } from '../context/AuthContext';

const Scripts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [scripts, setScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllocatedScripts();
  }, [user?.id]);

  const fetchAllocatedScripts = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        setError('User not authenticated');
        return;
      }

      // Fetch allocations for current examiner
      const allocations = await allocationService.getExaminerAllocations(user.id);

      // Transform allocations to script format
      const transformedScripts = allocations.map(allocation => ({
        id: allocation.script?.id || allocation.script?.scriptId || allocation.scriptId,
        barCode: allocation.script?.generatedBarcode,
        paper: allocation.script?.paper,
        paperId: allocation.script?.paperId, // Direct fallback to paperId to avoid undefined when paper object is null
        status: allocation.script?.status || 'Pending',
        score: allocation.script?.totalMarks,
        examiner: user.name,
        date: new Date(allocation.assignedAt).toLocaleDateString(),
        allocationId: allocation.allocationId,
        marking: allocation.script?.marking,
        cleanPdfUrl: allocation.script?.cleanPdfUrl || null
      }));

      setScripts(transformedScripts);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch allocated scripts:', err);
      setError('Failed to load your allocated scripts');
    } finally {
      setLoading(false);
    }
  };

  const filteredScripts = scripts.filter(script => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (script.barCode && script.barCode.toLowerCase().includes(searchLower)) ||
      (script.paper?.paperName && script.paper?.paperName.toLowerCase().includes(searchLower)) ||
      (script.id && script.id.toString().includes(searchLower));
    const matchesFilter = filterStatus === 'all' || script.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleStartMarking = (script) => {
    // Navigate to marking page with script details in both state and query params
    const queryParams = new URLSearchParams({
      scriptId: script.id,
      paperId: script.paperId || '',
      barCode: script.barCode || '',
      allocationId: script.allocationId,
      examinerId: user?.id || '',
      cleanPdfUrl: script.cleanPdfUrl || ''
    }).toString();

    navigate(`/marking?${queryParams}`, {
      state: {
        scriptId: script.id,
        paperId: script.paperId,
        allocationId: script.allocationId,
        examinerId: user?.id,
        barCode: script.barCode,
        cleanPdfUrl: script.cleanPdfUrl
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Allocated Scripts</h1>
        <p className="text-gray-600 mt-1">View and mark your assigned answer sheets</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by name, roll number, or script ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scripts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-teal-700 mr-3" size={24} />
            <p className="text-gray-600 font-medium">Loading your allocated scripts...</p>
          </div>
        ) : scripts.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-600 font-medium">No scripts allocated yet</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for new allocations</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">BarCode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Paper</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredScripts.map((script) => (
                  <tr key={script.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-2.5 text-sm font-medium text-gray-900">{script.barCode || 'N/A'}</td>
                    <td className="px-6 py-2.5 text-sm text-gray-600">{script.paper?.paperName || 'N/A'}</td>
                    <td className="px-6 py-2.5 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit ${script.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : script.status === 'In Progress'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {script.status === 'completed' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {script.status}
                      </span>
                    </td>
                    <td className="px-6 py-2.5 text-sm font-medium text-gray-900">{script.score || '-'}</td>
                    <td className="px-6 py-2.5 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStartMarking(script)}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors text-xs font-medium flex items-center gap-2"
                          title="Start Marking"
                        >
                          <Eye size={16} />
                          Mark
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
    </div>
  );
};

export default Scripts;

