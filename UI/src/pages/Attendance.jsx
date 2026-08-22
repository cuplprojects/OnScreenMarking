import React, { useState, useEffect, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Search, 
  Download, 
  Filter, 
  RefreshCw, 
  Calendar, 
  AlertCircle,
  Clock,
  UserCheck,
  UserX,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import attendanceService from '../services/attendanceService';
import userService from '../services/userService';
import message from '../services/messageService';
import ProjectConfigHeader from '../components/ProjectConfigHeader';

export default function Attendance() {
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  

  // File parsing states
  const [parsedData, setParsedData] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [onlyShowErrors, setOnlyShowErrors] = useState(false);
  const fileInputRef = useRef(null);

  // Filters and logs pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    calculateStats();
  }, [attendanceLogs]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      message.error(null);
      
      // Fetch users (examiners) for client-side validation
      const usersData = await userService.getAllUsers();
      setUsers(usersData.data || []);
      
      // Fetch historical attendance records
      await fetchAttendanceLogs();
    } catch (err) {
      message.error(err.message || 'Failed to load initial data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceLogs = async (filters = {}) => {
    try {
      const data = await attendanceService.getAllAttendance(filters);
      setAttendanceLogs(data.data || []);
    } catch (err) {
      message.error(err.message || 'Failed to load attendance logs');
    }
  };

  const calculateStats = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = attendanceLogs.filter(log => log.date.split('T')[0] === todayStr);

    setStats({
      total: attendanceLogs.length,
      present: todayLogs.filter(log => log.status.toLowerCase() === 'present').length,
      absent: todayLogs.filter(log => log.status.toLowerCase() === 'absent').length,
      halfDay: todayLogs.filter(log => ['half-day', 'half day'].includes(log.status.toLowerCase())).length
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file) => {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls' && fileExtension !== 'csv') {
      message.error('Please upload a valid Excel file (.xlsx, .xls) or CSV template.');
      return;
    }

    setLoading(true);
    message.error(null);
    message.success(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Convert to array of arrays
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length === 0) {
          throw new Error("The uploaded Excel sheet is empty.");
        }

        const headers = data[0].map(h => h ? h.toString().trim() : '');
        const rows = data.slice(1);

        // Column Index Mapping
        const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
        const dateIdx = headers.findIndex(h => h.toLowerCase() === 'date');
        const statusIdx = headers.findIndex(h => h.toLowerCase() === 'status');
        const remarksIdx = headers.findIndex(h => h.toLowerCase() === 'remarks');

        if (emailIdx === -1 || dateIdx === -1 || statusIdx === -1) {
          throw new Error("Missing required columns! Excel sheet must contain 'Email', 'Date', and 'Status' columns.");
        }

        const formattedRows = rows
          .map((row, index) => {
            const email = row[emailIdx] ? row[emailIdx].toString().trim() : '';
            let rawDate = row[dateIdx] ? row[dateIdx] : '';
            const status = row[statusIdx] ? row[statusIdx].toString().trim() : '';
            const remarks = remarksIdx !== -1 && row[remarksIdx] ? row[remarksIdx].toString().trim() : '';

            // Handle Excel Numeric Serial Dates
            let dateStr = '';
            if (typeof rawDate === 'number') {
              const utc_days = Math.floor(rawDate - 25569);
              const utc_value = utc_days * 86400;
              const date_info = new Date(utc_value * 1000);
              dateStr = date_info.toISOString().split('T')[0];
            } else if (rawDate) {
              const d = new Date(rawDate);
              if (!isNaN(d.getTime())) {
                dateStr = d.toISOString().split('T')[0];
              } else {
                dateStr = rawDate.toString();
              }
            }

            return {
              rowNum: index + 2,
              email,
              date: dateStr,
              status,
              remarks
            };
          })
          .filter(r => r.email || r.date || r.status); // Filter completely blank rows

        validateParsedRows(formattedRows);
      } catch (err) {
        message.error(err.message || 'Failed to parse Excel file. Ensure it matches the template.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const validateParsedRows = (rows) => {
    const validated = rows.map(row => {
      let isValid = true;
      let errorMsg = '';

      const matchedUser = users.find(u => u.email.toLowerCase() === row.email.toLowerCase());

      if (!row.email) {
        isValid = false;
        errorMsg = 'Email is missing';
      } else if (!matchedUser) {
        isValid = false;
        errorMsg = 'Examiner email not found in database';
      } else if (matchedUser.userType?.toLowerCase() !== 'examiner' && matchedUser.userType?.toLowerCase() !== 'admin') {
        isValid = false;
        errorMsg = `User is registered as a ${matchedUser.userType}, not an examiner`;
      } else if (!row.date) {
        isValid = false;
        errorMsg = 'Date is missing';
      } else if (isNaN(new Date(row.date).getTime())) {
        isValid = false;
        errorMsg = 'Invalid date format';
      } else if (!row.status) {
        isValid = false;
        errorMsg = 'Status is missing';
      } else if (!['present', 'absent', 'half-day', 'half day'].includes(row.status.toLowerCase())) {
        isValid = false;
        errorMsg = 'Invalid status (Must be Present, Absent, or Half-Day)';
      }

      return {
        ...row,
        isValid,
        errorMsg,
        name: matchedUser ? matchedUser.name : 'Unknown User'
      };
    });

    setParsedData(validated);
    setShowPreview(true);
  };

  const handleImport = async () => {
    const validRows = parsedData.filter(row => row.isValid);
    const invalidCount = parsedData.length - validRows.length;

    if (validRows.length === 0) {
      message.error("No valid rows found to import. Please correct the Excel sheet and try again.");
      return;
    }

    if (invalidCount > 0) {
      const confirmProceed = window.confirm(
        `There are ${invalidCount} invalid rows in your sheet. Only the ${validRows.length} valid rows will be imported. Do you want to proceed?`
      );
      if (!confirmProceed) return;
    }

    try {
      setImporting(true);
      message.error(null);
      message.success(null);

      // Send valid rows to server
      const payload = validRows.map(row => ({
        email: row.email,
        date: row.date,
        status: normalizeStatus(row.status),
        remarks: row.remarks
      }));

      const res = await attendanceService.bulkImportAttendance(payload);
      
      if (res.data?.success) {
        message.success(`Successfully imported ${res.data.totalImported} attendance records!`);
        setShowPreview(false);
        setParsedData([]);
        await fetchInitialData();
      } else {
        throw new Error(res.message || "Failed to complete bulk import.");
      }
    } catch (err) {
      message.error(err.message || "An error occurred during import.");
    } finally {
      setImporting(false);
    }
  };

  const normalizeStatus = (status) => {
    const lower = status.toLowerCase().trim();
    if (lower === 'present') return 'Present';
    if (lower === 'absent') return 'Absent';
    if (lower === 'half-day' || lower === 'half day') return 'Half-Day';
    return 'Present';
  };

  const handleDelete = async (attendanceId) => {
    if (!window.confirm("Are you sure you want to delete this attendance record?")) return;

    try {
      message.error(null);
      message.success(null);
      await attendanceService.deleteAttendance(attendanceId);
      message.success("Attendance record deleted successfully.");
      await fetchAttendanceLogs({ status: statusFilter, date: dateFilter });
    } catch (err) {
      message.error(err.message || "Failed to delete record.");
    }
  };

  const handleApplyFilter = async () => {
    setLoading(true);
    await fetchAttendanceLogs({
      status: statusFilter,
      date: dateFilter
    });
    setLoading(false);
  };

  const handleResetFilter = async () => {
    setStatusFilter('');
    setDateFilter('');
    setLoading(true);
    await fetchAttendanceLogs({});
    setLoading(false);
  };

  const downloadTemplate = () => {
    const headers = ['Email', 'Date', 'Status', 'Remarks'];
    const sampleRows = [
      ['examiner1@example.com', '2026-05-21', 'Present', 'Completed paper marking session'],
      ['examiner2@example.com', '2026-05-21', 'Absent', 'Sick leave request'],
      ['examiner3@example.com', '2026-05-21', 'Half-Day', 'Arrived late']
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...sampleRows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "attendance_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = attendanceLogs.filter(log =>
    log.examinerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.examinerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const previewRowsToDisplay = onlyShowErrors 
    ? parsedData.filter(row => !row.isValid) 
    : parsedData;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <ProjectConfigHeader />

        {/* Header Title */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-700 mb-2">
              Examiner Attendance
            </h1>
            <p className="text-gray-600 font-medium">
              Upload attendance sheets, perform live schema mapping, and log active sessions.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-300 shadow-sm text-gray-700 px-4 py-2.5 rounded-lg font-semibold transition"
          >
            <Download size={18} />
            Download Excel Template
          </button>
        </div>

        {/* Alerts */}
        
        

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
              <Calendar size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Total Logs</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-700 rounded-xl">
              <UserCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Present Today</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.present}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-100 text-red-700 rounded-xl">
              <UserX size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Absent Today</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.absent}</h3>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-semibold">Half-Day Today</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.halfDay}</h3>
            </div>
          </div>
        </div>

        {/* Upload Zone & Interactive Parsing */}
        {!showPreview && (
          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="bg-white rounded-3xl border-2 border-dashed border-gray-300 hover:border-blue-500 p-8 lg:p-12 text-center transition-all shadow-sm cursor-pointer relative overflow-hidden group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
            />
            <div className="flex flex-col items-center gap-4 relative z-10">
              <div className="w-16 h-16 bg-blue-50 group-hover:bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center transition-all transform group-hover:scale-110 shadow-inner">
                <Upload size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                  Upload Excel Attendance File
                </h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  Drag and drop your spreadsheet here, or <span className="text-blue-600 font-semibold underline">browse local files</span>. 
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-2 text-xs text-gray-500 border border-gray-100 font-medium">
                Required headers: <span className="font-bold text-gray-700">Email</span>, <span className="font-bold text-gray-700">Date</span>, <span className="font-bold text-gray-700">Status</span> (Present/Absent/Half-Day)
              </div>
            </div>
          </div>
        )}

        {/* Live Validation & Import Preview */}
        {showPreview && (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden animate-fadeIn">
            
            {/* Preview Banner */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet className="text-blue-600" />
                  Excel Import Preview
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  We parsed {parsedData.length} records. Please review validations before importing.
                </p>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={handleImport}
                  disabled={importing || parsedData.filter(row => row.isValid).length === 0}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
                >
                  {importing ? (
                    <RefreshCw className="animate-spin" size={18} />
                  ) : (
                    <CheckCircle2 size={18} />
                  )}
                  Import Valid ({parsedData.filter(row => row.isValid).length})
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setParsedData([]);
                  }}
                  className="flex-1 md:flex-none border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-5 py-2.5 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Parsing Statistics & Filters */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4 bg-gray-50/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 text-sm text-green-700 font-bold bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  {parsedData.filter(row => row.isValid).length} Ready
                </div>
                {parsedData.filter(row => !row.isValid).length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-red-700 font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                    {parsedData.filter(row => !row.isValid).length} Error(s)
                  </div>
                )}
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm font-semibold text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={onlyShowErrors}
                  onChange={(e) => setOnlyShowErrors(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                Show errors only
              </label>
            </div>

            {/* Preview Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                    <th className="py-4 px-6 text-center">Row</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Examiner Name</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Remarks</th>
                    <th className="py-4 px-6 text-right">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {previewRowsToDisplay.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-gray-500 font-medium">
                        No rows to display.
                      </td>
                    </tr>
                  ) : (
                    previewRowsToDisplay.map((row, index) => (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 transition-colors ${
                          !row.isValid ? 'bg-red-50/10' : ''
                        }`}
                      >
                        <td className="py-4 px-6 text-center text-gray-400 font-semibold">
                          {row.rowNum}
                        </td>
                        <td className="py-4 px-6 font-semibold text-gray-900">
                          {row.email}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {row.name}
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          {row.date}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            row.status.toLowerCase() === 'present'
                              ? 'bg-green-100 text-green-700'
                              : row.status.toLowerCase() === 'absent'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 max-w-xs truncate">
                          {row.remarks || '-'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100/50 border border-green-200 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 size={14} />
                              Ready to Import
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100/50 border border-red-200 px-2.5 py-1 rounded-lg">
                              <AlertTriangle size={14} />
                              {row.errorMsg}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter Toolbar for History Logs */}
        <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Filter className="text-gray-500" size={18} />
            Search & Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search examiner email or name..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-900"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2.5 px-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-800 font-semibold"
            >
              <option value="">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Half-Day">Half-Day</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="py-2.5 px-4 bg-gray-50 hover:bg-gray-100/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm text-gray-800"
            />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilter}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shadow-sm flex items-center justify-center gap-2"
              >
                Apply Filters
              </button>
              <button
                onClick={handleResetFilter}
                className="border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-semibold px-4 py-2.5 rounded-xl transition text-sm shadow-sm flex items-center justify-center"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* History logs Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Attendance Log Registry</h3>
              <p className="text-xs text-gray-500 mt-0.5">Showing compiled system attendance records.</p>
            </div>
            <button 
              onClick={fetchInitialData}
              className="p-2 text-gray-500 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition"
              title="Reload attendance data"
            >
              <RefreshCw size={18} className={loading && attendanceLogs.length > 0 ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading && attendanceLogs.length === 0 ? (
              <div className="py-20 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-500 font-semibold">Loading attendance logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center">
                <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-bold">No attendance records found</p>
                <p className="text-sm text-gray-400 mt-1">Try broadening your search term or upload a new spreadsheet.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/30 text-gray-500 font-bold text-xs uppercase border-b border-gray-100">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Examiner</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Remarks</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredLogs.map((log) => (
                    <tr key={log.attendanceId} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-gray-900">
                        {new Date(log.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-6 font-medium text-gray-800">
                        {log.examinerName}
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {log.examinerEmail}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          log.status.toLowerCase() === 'present'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : log.status.toLowerCase() === 'absent'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 max-w-xs truncate">
                        {log.remarks || '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(log.attendanceId)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                          title="Delete record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
