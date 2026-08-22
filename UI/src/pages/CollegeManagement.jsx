import { useState, useEffect, useRef } from 'react';
import collegeService from '../services/collegeService';
import { 
  Building2, 
  Upload, 
  Download, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  X,
  FileText,
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';
import message from '../services/messageService';

export default function CollegeManagement() {
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(false);
  
  

  // Form Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    collegeName: '',
    collegeCode: '',
    collegeType: 'Engineering',
    address: '',
    district: '',
    isActive: true
  });

  // Bulk Import Panel
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      setLoading(true);
      
      const data = await collegeService.getAllColleges();
      setColleges(data);
    } catch (err) {
      console.error(err);
      message.error('Failed to fetch colleges.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      collegeName: '',
      collegeCode: '',
      collegeType: 'Engineering',
      address: '',
      district: '',
      isActive: true
    });
    setShowFormModal(true);
  };

  const handleEdit = (college) => {
    setFormData({
      collegeName: college.collegeName,
      collegeCode: college.collegeCode,
      collegeType: college.collegeType || 'Engineering',
      address: college.address || '',
      district: college.district || '',
      isActive: college.isActive
    });
    setEditingId(college.id);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.collegeName.trim()) {
      message.error('College name is required.');
      return;
    }
    if (!formData.collegeCode.trim()) {
      message.error('College code is required.');
      return;
    }

    try {
      setLoading(true);
      
      if (editingId) {
        await collegeService.updateCollege(editingId, formData);
        message.success('College updated successfully!');
      } else {
        await collegeService.createCollege(formData);
        message.success('College created successfully!');
      }
      setShowFormModal(false);
      fetchColleges();
      
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to save college.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this college?')) {
      return;
    }

    try {
      setLoading(true);
      
      await collegeService.deleteCollege(id);
      message.success('College deleted successfully!');
      fetchColleges();
      
    } catch (err) {
      console.error(err);
      message.error('Failed to delete college.');
    } finally {
      setLoading(false);
    }
  };

  // Import operations
  const handleDownloadTemplate = () => {
    const url = collegeService.getTemplateUrl();
    window.open(url, '_blank');
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImportFile(e.target.files[0]);
      setImportResults(null);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      message.error('Please select a CSV file to upload.');
      return;
    }

    try {
      setImportLoading(true);
      
      setImportResults(null);
      
      const result = await collegeService.importColleges(importFile);
      setImportResults(result);
      if (result.success) {
        message.success(`Successfully imported ${result.importedCount} colleges!`);
        fetchColleges();
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to import colleges.');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs uppercase tracking-widest mb-1.5">
              <Building2 size={14} />
              <span>Affiliated Curriculum Centers</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Colleges Registry</h1>
            <p className="text-slate-500 text-xs mt-1">Manage exam centers, affiliated academies, and handle bulk imports</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              onClick={() => {
                setShowImportPanel(!showImportPanel);
                setImportResults(null);
                setImportFile(null);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
            >
              <Upload size={14} />
              <span>{showImportPanel ? 'Hide Import Panel' : 'Bulk Import Excel/CSV'}</span>
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-md hover:shadow-lg cursor-pointer"
            >
              <Plus size={16} />
              <span>Add College</span>
            </button>
          </div>
        </div>

        {/* Bulk Import Panel */}
        {showImportPanel && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-6 animate-slide-down">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-xs uppercase tracking-widest">
                <Upload size={14} />
                <span>Bulk College Upload Center</span>
              </div>
              <button 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-wider transition cursor-pointer shadow-sm"
              >
                <Download size={12} />
                <span>Download CSV Template</span>
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Upload Form */}
              <form onSubmit={handleImportSubmit} className="space-y-4">
                <div className="p-6 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
                    <FileText size={22} />
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-800 block">Select College Import File</span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">Please upload CSV template format</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                    id="csv-file-upload"
                  />
                  <label
                    htmlFor="csv-file-upload"
                    className="px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    Browse Files
                  </label>
                  {importFile && (
                    <div className="px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-blue-700 font-bold text-[10px] uppercase mt-2">
                      Selected: {importFile.name}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={importLoading || !importFile}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {importLoading ? 'Uploading and Processing...' : 'Upload & Import Data'}
                </button>
              </form>

              {/* Guide / Logs Panel */}
              <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 space-y-3">
                <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <HelpCircle size={14} className="text-slate-400" />
                  <span>Import Instructions & Rules</span>
                </h3>
                <ul className="space-y-2 text-[11px] text-slate-500 font-medium list-disc pl-4 leading-relaxed">
                  <li>Download the CSV template and open it in <strong>Microsoft Excel</strong>.</li>
                  <li>Fill in college details. <strong>CollegeName</strong> and <strong>CollegeCode</strong> are mandatory fields.</li>
                  <li>Ensure each <strong>CollegeCode</strong> is unique; duplicate codes will trigger a skip.</li>
                  <li>When saving in Excel, choose <strong>Save As &rarr; CSV (Comma Delimited) (*.csv)</strong> format.</li>
                  <li>Upload the resulting CSV file to complete bulk registration.</li>
                </ul>

                {/* Import Results Box */}
                {importResults && (
                  <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200 space-y-3 animate-fade-in">
                    <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">Import Finished Summary</h4>
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-center">
                      <div className="p-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl">
                        <span className="block text-lg">{importResults.importedCount}</span>
                        <span>Successfully Imported</span>
                      </div>
                      <div className="p-2.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
                        <span className="block text-lg">{importResults.failedCount}</span>
                        <span>Failed / Skipped Rows</span>
                      </div>
                    </div>

                    {importResults.errors && importResults.errors.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle size={10} className="text-rose-500" />
                          <span>Detailed Validation Log</span>
                        </span>
                        <div className="max-h-[100px] overflow-y-auto border border-rose-100 rounded-xl bg-rose-50/20 p-2 text-[10px] font-bold text-rose-700 divide-y divide-rose-100/50 space-y-1">
                          {importResults.errors.map((err, i) => (
                            <div key={i} className="pt-1 first:pt-0 leading-normal">{err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Messages */}
        
        

        {/* Colleges Registry Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          {loading && colleges.length === 0 ? (
            <div className="p-12 text-center text-slate-450 font-bold text-xs flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span>Fetching colleges...</span>
            </div>
          ) : colleges.length === 0 ? (
            <div className="p-16 text-center text-slate-550 max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto">
                <Building2 size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">Registry is Empty</h3>
                <p className="text-xs text-slate-400">Add colleges manually or upload the excel import sheet to fill the registry.</p>
              </div>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
              >
                Register Your First College
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-450 uppercase tracking-widest select-none">
                    <th className="px-6 py-4">College Info</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">District / Region</th>
                    <th className="px-6 py-4">Postal Address</th>
                    <th className="px-6 py-4 text-center">Registry Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {colleges.map((college) => (
                    <tr key={college.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-extrabold shadow-sm border border-blue-100">
                            <Building2 size={16} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 tracking-tight block">{college.collegeName}</span>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Code: {college.collegeCode}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-650 rounded-lg font-bold text-[9px] uppercase tracking-wide">
                          {college.collegeType || 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="font-bold text-slate-700">{college.district || 'Unassigned'}</span>
                      </td>
                      <td className="px-6 py-4.5 max-w-xs truncate">
                        <span className="text-slate-400 font-semibold">{college.address || 'No address registered'}</span>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[9px] uppercase tracking-wider border ${
                          college.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${college.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {college.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(college)}
                            className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(college.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-100 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 size={13} />
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

      {/* College Modal Form */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xl max-w-md w-full overflow-hidden animate-zoom-in">
            <div className="flex items-center justify-between px-6 py-5 bg-slate-50 border-b border-slate-100">
              <h2 className="text-base font-black text-slate-950 uppercase tracking-wider leading-none">
                {editingId ? 'Edit College Details' : 'Register New College'}
              </h2>
              <button 
                onClick={() => setShowFormModal(false)}
                className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-950 hover:border-slate-300 transition flex items-center justify-center cursor-pointer shadow-sm"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">College Name</label>
                <input
                  type="text"
                  placeholder="e.g. Albert Einstein College of Engineering"
                  value={formData.collegeName}
                  onChange={(e) => setFormData(prev => ({ ...prev, collegeName: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unique College Code</label>
                  <input
                    type="text"
                    placeholder="e.g. AECE001"
                    value={formData.collegeCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, collegeCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Institution Category</label>
                  <select
                    value={formData.collegeType}
                    onChange={(e) => setFormData(prev => ({ ...prev, collegeType: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition cursor-pointer"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Medical">Medical / Healthcare</option>
                    <option value="Arts & Science">Arts & Science</option>
                    <option value="Commerce">Commerce & Business</option>
                    <option value="Law">Law Academy</option>
                    <option value="Polytechnic">Polytechnic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">District / Region</label>
                <input
                  type="text"
                  placeholder="e.g. Metropolis"
                  value={formData.district}
                  onChange={(e) => setFormData(prev => ({ ...prev, district: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Physical Address</label>
                <textarea
                  placeholder="Street address, city, state"
                  rows={2}
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-150 select-none">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded focus:ring-blue-500 focus:outline-none cursor-pointer"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Mark this college as Active exam center
                </label>
              </div>

              <div className="flex items-center gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save College'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
