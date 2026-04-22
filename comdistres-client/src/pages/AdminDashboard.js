import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#8b5cf6"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0, reports: 0, openReports: 0, recentReports: 0, avgResponseTime: 0
  });
  const [reportStats, setReportStats] = useState([]);
  const [reportsByType, setReportsByType] = useState([]);
  const [reportsBySeverity, setReportsBySeverity] = useState([]);
  const [liveReports, setLiveReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [settings, setSettings] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    fetchAnalytics();
    fetchLiveReports();
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'reports') fetchAllReports();
    else if (activeTab === 'settings') fetchSettings();

    if (activeTab === 'dashboard') {
      const interval = setInterval(() => {
        fetchAnalytics();
        fetchLiveReports();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/admin/analytics");
      setStats(res.data.summary);
      setReportStats(res.data.byStatus);
      setReportsByType(res.data.byType);
      setReportsBySeverity(res.data.bySeverity);
    } catch (error) { console.error("Error fetching analytics:", error); }
  };

  const fetchLiveReports = async () => {
    try {
      const res = await api.get("/admin/reports/live");
      setLiveReports(res.data);
    } catch (error) { console.error("Error fetching live reports:", error); }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) { console.error("Error fetching users:", error); }
  };

  const fetchAllReports = async () => {
    try {
      const res = await api.get("/admin/reports"); // ✅ fixed from "/reports"
      setAllReports(res.data);
    } catch (error) { console.error("Error fetching reports:", error); }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/admin/settings");
      setSettings(res.data);
    } catch (error) { console.error("Error fetching settings:", error); }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      alert("Role updated successfully!");
      fetchUsers();
    } catch (error) { alert("Error updating role: " + error.message); }
  };

  const handleToggleUserStatus = async (userId, isactive) => {
    try {
      const endpoint = isactive ? 'deactivate' : 'activate';
      await api.put(`/admin/users/${userId}/${endpoint}`);
      alert(`User ${isactive ? 'deactivated' : 'activated'} successfully!`);
      fetchUsers();
    } catch (error) { alert("Error updating user status: " + error.message); }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.put("/admin/settings", settings);
      alert("Settings updated successfully!");
    } catch (error) { alert("Error updating settings: " + error.message); }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      assigned: 'text-blue-600 bg-blue-100',
      'in-progress': 'text-purple-600 bg-purple-100',
      resolved: 'text-green-600 bg-green-100',
      closed: 'text-gray-600 bg-gray-100'
    };
    return colors[status] || 'text-gray-600 bg-gray-100';
  };

  // ── Toggle component reused for settings ──────────────────────────────────
  const Toggle = ({ value, onChange }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">

        {/* ── Tab Navigation — scrollable on mobile ── */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-3 sm:px-4">
            {/* ✅ overflow-x-auto so tabs scroll instead of wrapping/clipping */}
            <div className="flex overflow-x-auto scrollbar-hide whitespace-nowrap gap-1 sm:gap-0 sm:space-x-6">
              {['dashboard', 'users', 'reports', 'settings'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 py-4 px-3 sm:px-2 border-b-2 font-medium capitalize text-sm sm:text-base ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Page content ── */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

          {/* ════════════════════════════════════════
              DASHBOARD TAB
          ════════════════════════════════════════ */}
          {activeTab === 'dashboard' && (
            <>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Administrator Dashboard</h1>

              {/* Summary Cards — 2 cols on mobile, 5 on desktop */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {[
                  { label: 'Total Users',   value: stats.users,           color: 'text-gray-900' },
                  { label: 'Total Reports', value: stats.reports,         color: 'text-gray-900', link: '/reports' },
                  { label: 'Open Alerts',   value: stats.openReports,     color: 'text-red-600' },
                  { label: 'Last 7 Days',   value: stats.recentReports,   color: 'text-blue-600' },
                  { label: 'Avg Response',  value: `${stats.avgResponseTime}m`, color: 'text-green-600' },
                ].map(({ label, value, color, link }) => (
                  <div key={label} className="bg-white p-4 sm:p-6 rounded-xl shadow">
                    {link
                      ? <Link to={link} className="text-gray-500 text-xs sm:text-sm">{label}</Link>
                      : <p className="text-gray-500 text-xs sm:text-sm">{label}</p>
                    }
                    <h2 className={`text-2xl sm:text-3xl font-bold mt-1 ${color}`}>{value}</h2>
                  </div>
                ))}
              </div>

              {/* Charts Row 1 — stacked on mobile */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Reports by Status</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reportStats}>
                      <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={reportStats} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                        {reportStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="bg-white p-4 sm:p-6 rounded-xl shadow min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Reports by Disaster Type</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={reportsByType}>
                      <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 sm:p-6 rounded-xl shadow min-w-0">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Reports by Severity</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={reportsBySeverity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={90} label>
                        {reportsBySeverity.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Reports */}
              <div className="bg-white p-4 sm:p-6 rounded-xl shadow">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-semibold text-base sm:text-lg">🔴 Live Incoming Reports</h3>
                  <span className="text-xs sm:text-sm text-gray-500">Auto-refreshing every 10s</span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {liveReports.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-6">No live reports yet.</p>
                  )}
                  {liveReports.map((r) => (
                    <div key={r.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-l-4 border-blue-500 bg-gray-50 p-3 sm:p-4 rounded gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{r.title}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">{r.disasterType} — {r.location}</p>
                        <p className="text-xs text-gray-500">
                          By: {r.reporter?.name} • {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`self-start sm:self-auto px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════
              USERS TAB
          ════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">User Management</h1>

              {/* ✅ Table wrapped in scroll container */}
              <div className="w-full overflow-x-auto rounded-xl shadow">
                <table className="min-w-full divide-y divide-gray-200 bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, parseInt(e.target.value))}
                            className="border rounded px-2 py-1 text-xs sm:text-sm"
                          >
                            <option value="1">Administrator</option>
                            <option value="2">Coordinator</option>
                            <option value="3">Volunteer</option>
                            <option value="4">Citizen</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {user.isactive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isactive)}
                            className={`px-3 py-1 rounded text-xs sm:text-sm ${user.isactive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                          >
                            {user.isactive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ════════════════════════════════════════
              REPORTS TAB
          ════════════════════════════════════════ */}
          {activeTab === 'reports' && (
            <>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">All Reports</h1>

              <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                <p className="text-gray-600 text-sm">
                  Total: {allReports.length} {allReports.length === 1 ? 'report' : 'reports'}
                </p>
                <Link to="/reports/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm">
                  + Create Report
                </Link>
              </div>

              {allReports.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-10 text-center">
                  <div className="text-5xl mb-4">📋</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                  <p className="text-gray-600 mb-6 text-sm">There are no reports in the system. Create the first one!</p>
                  <Link to="/reports/new" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 text-sm">
                    Create First Report
                  </Link>
                </div>
              ) : (
                /* ✅ Table wrapped in scroll container */
                <div className="w-full overflow-x-auto rounded-xl shadow">
                  <table className="min-w-full divide-y divide-gray-200 bg-white">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {allReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">#{report.id}</td>
                          <td className="px-4 py-3 min-w-[140px]">
                            <div className="text-sm font-medium text-gray-900">{report.title}</div>
                            <div className="text-xs text-gray-500">{report.location || 'No location'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">{report.disasterType}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                              report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                              report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>{report.severity}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>{report.status}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{report.reporter?.name || 'Anonymous'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════════
              SETTINGS TAB
          ════════════════════════════════════════ */}
          {activeTab === 'settings' && (
            <>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">System Settings</h1>

              <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
                  <input
                    type="text"
                    value={settings.systemName || ''}
                    onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
                    className="w-full border rounded-lg px-4 py-2 text-sm"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">System Status</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'maintenanceMode',       label: 'Maintenance Mode',        desc: 'Disable user access for maintenance' },
                      { key: 'allowRegistration',     label: 'Allow Registration',      desc: 'Allow new users to register' },
                      { key: 'autoAssignCoordinators',label: 'Auto-Assign Coordinators',desc: 'Automatically assign coordinators to new reports' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base">{label}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{desc}</p>
                        </div>
                        <Toggle value={settings[key]} onChange={() => setSettings({ ...settings, [key]: !settings[key] })} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Notifications</h3>
                  <div className="space-y-4">
                    {[
                      { key: 'notificationsEnabled', label: 'Notifications Enabled', desc: 'Enable in-app notifications' },
                      { key: 'emailNotifications',   label: 'Email Notifications',   desc: 'Send email notifications to users' },
                      { key: 'smsNotifications',     label: 'SMS Notifications',     desc: 'Send SMS notifications to users' },
                    ].map(({ key, label, desc }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium text-sm sm:text-base">{label}</p>
                          <p className="text-xs sm:text-sm text-gray-500">{desc}</p>
                        </div>
                        <Toggle value={settings[key]} onChange={() => setSettings({ ...settings, [key]: !settings[key] })} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-base sm:text-lg mb-4">Limits</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Reports Per User</label>
                    <input
                      type="number"
                      value={settings.maxReportsPerUser || 50}
                      onChange={(e) => setSettings({ ...settings, maxReportsPerUser: parseInt(e.target.value) })}
                      className="w-full sm:w-64 border rounded-lg px-4 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button onClick={handleUpdateSettings} className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm">
                    Save Settings
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </>
  );
}