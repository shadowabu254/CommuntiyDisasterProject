import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import api from "../api/axios";
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line
} from "recharts";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#8b5cf6"];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    reports: 0,
    openReports: 0,
    recentReports: 0,
    avgResponseTime: 0
  });

  const [reportStats, setReportStats] = useState([]);
  const [reportsByType, setReportsByType] = useState([]);
  const [reportsBySeverity, setReportsBySeverity] = useState([]);
  const [usersByRole, setUsersByRole] = useState([]);
  const [liveReports, setLiveReports] = useState([]);
  const [users, setUsers] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [settings, setSettings] = useState({});

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedUser, setSelectedUser] = useState(null);
  const [newRole, setNewRole] = useState('');
useEffect(() => {
  fetchAnalytics();
  fetchLiveReports();
  
  // Fetch data based on active tab
  if (activeTab === 'users') {
    fetchUsers();
  } else if (activeTab === 'reports') {
    fetchAllReports();
  } else if (activeTab === 'settings') {
    fetchSettings();
  }

  // Poll for updates every 10 seconds (only for dashboard)
  if (activeTab === 'dashboard') {
    const interval = setInterval(() => {
      fetchAnalytics();
      fetchLiveReports();
    }, 10000);
    return () => clearInterval(interval);
  }
}, [activeTab]); // Re-run when activeTab changes

  const fetchAnalytics = async () => {
    try {
      const res = await api.get("/admin/analytics");
      setStats(res.data.summary);
      setReportStats(res.data.byStatus);
      setReportsByType(res.data.byType);
      setReportsBySeverity(res.data.bySeverity);
      setUsersByRole(res.data.byRole);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchLiveReports = async () => {
    try {
      const res = await api.get("/admin/reports/live");
      setLiveReports(res.data);
    } catch (error) {
      console.error("Error fetching live reports:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users");
      setUsers(res.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchAllReports = async () => {
    try {
      const res = await api.get("/admin/reports");
      setAllReports(res.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get("/admin/settings");
      setSettings(res.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      alert("Role updated successfully!");
      fetchUsers();
      
    } catch (error) {
      alert("Error updating role: " + error.message);
    }
  };

  const handleToggleUserStatus = async (userId, isactive) => {
    try {
      const endpoint = isactive ? 'deactivate' : 'activate';
      await api.put(`/admin/users/${userId}/${endpoint}`);
      alert(`User ${isactive ? 'deactivated' : 'activated'} successfully!`);
      fetchUsers();
    } catch (error) {
      alert("Error updating user status: " + error.message);
    }
  };

  const handleUpdateSettings = async () => {
    try {
      await api.put("/admin/settings", settings);
      alert("Settings updated successfully!");
    } catch (error) {
      alert("Error updating settings: " + error.message);
    }
  };

  const getRoleName = (roleId) => {
    const roles = { 1: 'Administrator', 2: 'Coordinator', 3: 'Volunteer', 4: 'Citizen' };
    return roles[roleId] || 'Unknown';
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        {/* Tab Navigation */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex space-x-8 overflow-x-auto whitespace-nowrap scrollbar-hide pb-px">
              {['dashboard', 'users', 'reports', 'settings'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-2 border-b-2 font-medium capitalize ${
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

        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900">Administrator Dashboard</h1>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-6 rounded-xl shadow">
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <h2 className="text-3xl font-bold text-gray-900">{stats.users}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                  <Link to= "/reports" className="text-gray-500 text-sm">Total Reports</Link>
                  <h2 className="text-3xl font-bold text-gray-900">{stats.reports}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                  <p className="text-gray-500 text-sm">Open Alerts</p>
                  <h2 className="text-3xl font-bold text-red-600">{stats.openReports}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                  <p className="text-gray-500 text-sm">Last 7 Days</p>
                  <h2 className="text-3xl font-bold text-blue-600">{stats.recentReports}</h2>
                </div>
                <div className="bg-white p-6 rounded-xl shadow">
                  <p className="text-gray-500 text-sm">Avg Response</p>
                  <h2 className="text-3xl font-bold text-green-600">{stats.avgResponseTime}m</h2>
                </div>
              </div>

              {/* Charts Row 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow">
                  <h3 className="font-semibold text-lg mb-4">Reports by Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportStats}>
                      <XAxis dataKey="status" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow">
                  <h3 className="font-semibold text-lg mb-4">Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportStats}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {reportStats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Charts Row 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow">
                  <h3 className="font-semibold text-lg mb-4">Reports by Disaster Type</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={reportsByType}>
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#16a34a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-6 rounded-xl shadow">
                  <h3 className="font-semibold text-lg mb-4">Reports by Severity</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportsBySeverity}
                        dataKey="count"
                        nameKey="severity"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {reportsBySeverity.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Live Monitoring */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">🔴 Live Incoming Reports</h3>
                  <span className="text-sm text-gray-500">Auto-refreshing every 10s</span>
                </div>
                <div className="space-y-3 max-h-96 overflow-auto">
                  {liveReports.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border-l-4 border-blue-500 bg-gray-50 p-4 rounded"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{r.title}</h4>
                        <p className="text-sm text-gray-600">{r.disasterType} - {r.location}</p>
                        <p className="text-xs text-gray-500">
                          Reported by: {r.reporter?.name} • {new Date(r.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              
              <div className="w-full overflow-x-auto rounded-xl shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="font-medium text-gray-900">{user.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, parseInt(e.target.value))}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="1">Administrator</option>
                            <option value="2">Coordinator</option>
                            <option value="3">Volunteer</option>
                            <option value="4">Citizen</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isactive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isactive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleToggleUserStatus(user.id, user.isactive)}
                            className={`px-3 py-1 rounded ${
                              user.isactive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
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

          {/* REPORTS TAB */}
          {activeTab === 'reports' && (
  <>
    <h1 className="text-3xl font-bold text-gray-900">All Reports</h1>
    
    <div className="flex justify-between items-center mb-6">
      <p className="text-gray-600">
        Total: {allReports.length} {allReports.length === 1 ? 'report' : 'reports'}
      </p>
      <Link
        to="/reports/new"
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        + Create Report
      </Link>
    </div>

    {allReports.length === 0 ? (
      <div className="bg-white rounded-xl shadow p-12 text-center">
        <div className="text-6xl mb-4">📋</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
        <p className="text-gray-600 mb-6">
          There are no reports in the system. Create the first one!
        </p>
        <Link
          to="/reports/new"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Create First Report
        </Link>
      </div>
    ) : (
      <div className="w-full overflow-x-auto rounded-xl shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reporter</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {allReports.map((report) => (
              <tr key={report.id} className="hover:bg-gray-50 cursor-pointer">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                  #{report.id}
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{report.title}</div>
                  <div className="text-sm text-gray-500">{report.location || 'No location'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                    {report.disasterType}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    report.severity === 'critical' ? 'bg-red-100 text-red-800' :
                    report.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                    report.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {report.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {report.reporter?.name || 'Anonymous'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(report.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </>
)}
          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <>
              <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
              
              <div className="bg-white rounded-xl shadow p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Name
                  </label>
                  <input
                    type="text"
                    value={settings.systemName || ''}
                    onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                    className="w-full border rounded-lg px-4 py-2"
                  />
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">System Status</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Maintenance Mode</p>
                        <p className="text-sm text-gray-500">Disable user access for maintenance</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.maintenanceMode ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Allow Registration</p>
                        <p className="text-sm text-gray-500">Allow new users to register</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, allowRegistration: !settings.allowRegistration})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.allowRegistration ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.allowRegistration ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Auto-Assign Coordinators</p>
                        <p className="text-sm text-gray-500">Automatically assign available coordinators to new reports</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, autoAssignCoordinators: !settings.autoAssignCoordinators})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.autoAssignCoordinators ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.autoAssignCoordinators ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Notifications</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Notifications Enabled</p>
                        <p className="text-sm text-gray-500">Enable in-app notifications</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, notificationsEnabled: !settings.notificationsEnabled})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-500">Send email notifications to users</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-500">Send SMS notifications to users</p>
                      </div>
                      <button
                        onClick={() => setSettings({...settings, smsNotifications: !settings.smsNotifications})}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          settings.smsNotifications ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          settings.smsNotifications ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Limits</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Reports Per User
                    </label>
                    <input
                      type="number"
                      value={settings.maxReportsPerUser || 50}
                      onChange={(e) => setSettings({...settings, maxReportsPerUser: parseInt(e.target.value)})}
                      className="w-full md:w-64 border rounded-lg px-4 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-6 border-t">
                  <button
                    onClick={handleUpdateSettings}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
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