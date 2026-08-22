import { useState } from 'react';
import { BarChart3, TrendingUp, Users, FileText, Download, Calendar } from 'lucide-react';

const Reports = () => {
  const [reportType, setReportType] = useState('summary');
  const [dateRange, setDateRange] = useState('week');

  const summaryStats = [
    { label: 'Total Scripts Evaluated', value: '320', change: '+12%', icon: FileText, color: 'bg-blue-500' },
    { label: 'Average Score', value: '78.5%', change: '+2.3%', icon: TrendingUp, color: 'bg-green-500' },
    { label: 'Examiners Active', value: '24', change: '+3', icon: Users, color: 'bg-blue-500' },
    { label: 'Completion Rate', value: '71%', change: '+5%', icon: BarChart3, color: 'bg-orange-500' },
  ];

  const subjectStats = [
    { subject: 'Mathematics', total: 450, evaluated: 320, pending: 130, avgScore: 82 },
    { subject: 'Physics', total: 450, evaluated: 310, pending: 140, avgScore: 76 },
    { subject: 'Chemistry', total: 450, evaluated: 300, pending: 150, avgScore: 75 },
    { subject: 'English', total: 450, evaluated: 330, pending: 120, avgScore: 81 },
    { subject: 'Biology', total: 450, evaluated: 290, pending: 160, avgScore: 79 },
  ];

  const examinerPerformance = [
    { name: 'Dr. Sharma', evaluated: 85, avgTime: '12 min', accuracy: '98%' },
    { name: 'Dr. Patel', evaluated: 78, avgTime: '14 min', accuracy: '96%' },
    { name: 'Dr. Gupta', evaluated: 72, avgTime: '13 min', accuracy: '97%' },
    { name: 'Dr. Singh', evaluated: 65, avgTime: '15 min', accuracy: '95%' },
    { name: 'Dr. Nair', evaluated: 58, avgTime: '16 min', accuracy: '94%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Comprehensive evaluation statistics and insights</p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-3">
          {['summary', 'subject', 'examiner'].map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                reportType === type
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)} Report
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-4">
          <Calendar size={20} className="text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
          <button className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors">
            <Download size={18} />
            Export Report
          </button>
        </div>
      </div>

      {/* Summary Report */}
      {reportType === 'summary' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-600">{stat.label}</h3>
                    <div className={`${stat.color} p-3 rounded-lg`}>
                      <Icon className="text-white" size={20} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-green-600 font-medium mt-2">{stat.change} from last period</p>
                </div>
              );
            })}
          </div>

          {/* Score Distribution Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Score Distribution</h2>
            <div className="space-y-4">
              {[
                { range: '90-100', count: 45, percentage: 14 },
                { range: '80-89', count: 98, percentage: 31 },
                { range: '70-79', count: 112, percentage: 35 },
                { range: '60-69', count: 52, percentage: 16 },
                { range: 'Below 60', count: 13, percentage: 4 },
              ].map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">{item.range}</span>
                    <span className="text-sm font-bold text-gray-900">{item.count} ({item.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subject Report */}
      {reportType === 'subject' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Subject</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total Scripts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Evaluated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pending</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Avg Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subjectStats.map((subject, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{subject.subject}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{subject.total}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{subject.evaluated}</td>
                    <td className="px-6 py-4 text-sm font-medium text-red-600">{subject.pending}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{subject.avgScore}%</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(subject.evaluated / subject.total) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Examiner Performance Report */}
      {reportType === 'examiner' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Examiner Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Scripts Evaluated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Avg Time/Script</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Accuracy Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {examinerPerformance.map((examiner, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{examiner.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{examiner.evaluated}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{examiner.avgTime}</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{examiner.accuracy}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="text-yellow-500">★★★★★</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
