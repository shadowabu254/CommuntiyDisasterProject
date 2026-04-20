import React, { useEffect, useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function CoordinatorDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for data
  const [stats, setStats] = useState({
    totalReports: 0,
    pendingReports: 0,
    inProgressReports: 0,
    resolvedReports: 0,
    criticalReports: 0
  });
  const [reports, setReports] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState('');

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all reports
      const reportsRes = await api.get('/reports');
      const allReports = reportsRes.data;
      setReports(allReports);

      // Calculate statistics
      setStats({
        totalReports: allReports.length,
        pendingReports: allReports.filter(r => r.status === 'Pending').length,
        inProgressReports: allReports.filter(r => r.status === 'in-progress').length,
        resolvedReports: allReports.filter(r => r.status === 'resolved').length,
        criticalReports: allReports.filter(r => r.severity === 'critical').length
      });

      // Fetch volunteers (users with role 3)
      const usersRes = await api.get('/admin/users');
      const volunteersList = usersRes.data.filter(u => u.role === 3 && u.isactive);
      setVolunteers(volunteersList);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      await api.put(`/reports/${reportId}`, { status: newStatus });
      alert('Status updated successfully!');
      fetchDashboardData();
    } catch (error) {
      alert('Failed to update status: ' + (error.response?.data?.error || error.message));
    }
  };

  const openAssignModal = (report) => {
    setSelectedReport(report);
    setAssignModalOpen(true);
  };

  const handleAssignVolunteer = async () => {
    if (!selectedVolunteer) {
      alert('Please select a volunteer');
      return;
    }

    try {
      await api.put(`/reports/${selectedReport.id}/assign`, {
        volunteerId: parseInt(selectedVolunteer)
      });
      alert('Volunteer assigned successfully!');
      setAssignModalOpen(false);
      setSelectedVolunteer('');
      setSelectedReport(null);
      fetchDashboardData();
    } catch (error) {
      alert('Failed to assign volunteer: ' + (error.response?.data?.error || error.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'assigned': 'bg-blue-100 text-blue-800 border-blue-300',
      'in-progress': 'bg-purple-100 text-purple-800 border-purple-300',
      'resolved': 'bg-green-100 text-green-800 border-green-300',
      'closed': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'low': 'bg-green-100 text-green-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-orange-100 text-orange-800',
      'critical': 'bg-red-100 text-red-800'
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getDisasterIcon = (type) => {
    const icons = {
      'fire': '🔥',
      'flood': '🌊',
      'earthquake': '🏚️',
      'accident': '🚗',
      'medical': '🏥',
      'storm': '⛈️',
      'other': '⚠️'
    };
    return icons[type] || '📋';
  };

  // Filter reports based on active tab
  const getFilteredReports = () => {
    switch(activeTab) {
      case 'pending':
        return reports.filter(r => r.status === 'Pending');
      case 'active':
        return reports.filter(r => r.status === 'assigned' || r.status === 'in-progress');
      case 'critical':
        return reports.filter(r => r.severity === 'critical');
      case 'resolved':
        return reports.filter(r => r.status === 'resolved' || r.status === 'closed');
      default:
        return reports.filter(r => r.status !== 'closed');
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Coordinator Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
              <p className="text-gray-500 text-sm font-medium">Total Reports</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">{stats.totalReports}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
              <p className="text-gray-500 text-sm font-medium">Pending</p>
              <h2 className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingReports}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-medium">In Progress</p>
              <h2 className="text-3xl font-bold text-purple-600 mt-2">{stats.inProgressReports}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-red-500">
              <p className="text-gray-500 text-sm font-medium">Critical</p>
              <h2 className="text-3xl font-bold text-red-600 mt-2">{stats.criticalReports}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-medium">Resolved</p>
              <h2 className="text-3xl font-bold text-green-600 mt-2">{stats.resolvedReports}</h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-t-lg shadow-md">
            <div className="flex border-b overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'pending', label: 'Pending', icon: '⏳', count: stats.pendingReports },
                { id: 'active', label: 'Active', icon: '⚡', count: stats.inProgressReports },
                { id: 'critical', label: 'Critical', icon: '🚨', count: stats.criticalReports },
                { id: 'volunteers', label: 'Volunteers', icon: '👥', count: volunteers.length },
                { id: 'resolved', label: 'Resolved', icon: '✅', count: stats.resolvedReports }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-4 font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon} {tab.label}
                  {tab.count !== undefined && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-b-lg shadow-md p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Recent Reports</h2>
                
                {getFilteredReports().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📭</div>
                    <p className="text-gray-600">No active reports at the moment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredReports().slice(0, 10).map(report => (
                      <div
                        key={report.id}
                        className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{getDisasterIcon(report.disasterType)}</div>
                            <div className="flex-1">
                              <Link
                                to={`/reports/${report.id}`}
                                className="font-semibold text-lg text-gray-900 hover:text-blue-600"
                              >
                                {report.title}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {report.description}
                              </p>
                              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  📍 {report.location || 'No location'}
                                </span>
                                <span className="flex items-center gap-1">
                                  👤 {report.reporter?.name || 'Anonymous'}
                                </span>
                                <span className="flex items-center gap-1">
                                  🕐 {new Date(report.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end min-w-[200px]">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(report.severity)}`}>
                              {report.severity}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                            <div className="flex gap-2 mt-2">
                              {report.status === 'Pending' && (
                                <button
                                  onClick={() => openAssignModal(report)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                                >
                                  Assign
                                </button>
                              )}
                              {report.status !== 'resolved' && report.status !== 'closed' && (
                                <select
                                  value={report.status}
                                  onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="assigned">Assigned</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending/Active/Critical/Resolved Tabs */}
            {(activeTab === 'pending' || activeTab === 'active' || activeTab === 'critical' || activeTab === 'resolved') && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab} Reports</h2>
                  <span className="text-sm text-gray-500">
                    {getFilteredReports().length} {getFilteredReports().length === 1 ? 'report' : 'reports'}
                  </span>
                </div>
                
                {getFilteredReports().length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">
                      {activeTab === 'pending' && '⏳'}
                      {activeTab === 'active' && '⚡'}
                      {activeTab === 'critical' && '🚨'}
                      {activeTab === 'resolved' && '✅'}
                    </div>
                    <p className="text-gray-600">No {activeTab} reports</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredReports().map(report => (
                      <div
                        key={report.id}
                        className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{getDisasterIcon(report.disasterType)}</div>
                            <div className="flex-1">
                              <Link
                                to={`/reports/${report.id}`}
                                className="font-semibold text-lg text-gray-900 hover:text-blue-600"
                              >
                                {report.title}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">{report.description}</p>
                              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                                <span>📍 {report.location || 'No location'}</span>
                                <span>👤 {report.reporter?.name || 'Anonymous'}</span>
                                <span>🕐 {new Date(report.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(report.severity)}`}>
                              {report.severity}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                            <div className="flex gap-2 mt-2">
                              {report.status === 'Pending' && (
                                <button
                                  onClick={() => openAssignModal(report)}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                                >
                                  Assign
                                </button>
                              )}
                              {activeTab !== 'resolved' && (
                                <select
                                  value={report.status}
                                  onChange={(e) => handleStatusUpdate(report.id, e.target.value)}
                                  className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                                >
                                  <option value="Pending">Pending</option>
                                  <option value="assigned">Assigned</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Volunteers Tab */}
            {activeTab === 'volunteers' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Available Volunteers</h2>
                  <span className="text-sm text-gray-500">{volunteers.length} volunteers</span>
                </div>
                
                {volunteers.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">👥</div>
                    <p className="text-gray-600">No volunteers available</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {volunteers.map(volunteer => (
                      <div
                        key={volunteer.id}
                        className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                            👤
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{volunteer.name}</h3>
                            <p className="text-sm text-gray-600">{volunteer.email}</p>
                            {volunteer.phone && (
                              <p className="text-sm text-gray-600">📞 {volunteer.phone}</p>
                            )}
                            <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Active
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Volunteer Modal */}
      {assignModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Assign Volunteer</h3>
            
            {selectedReport && (
              <div className="mb-4 p-3 bg-gray-50 rounded">
                <p className="font-medium text-gray-900">{selectedReport.title}</p>
                <p className="text-sm text-gray-600">{selectedReport.location}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Volunteer
              </label>
              <select
                value={selectedVolunteer}
                onChange={(e) => setSelectedVolunteer(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choose a volunteer --</option>
                {volunteers.map(volunteer => (
                  <option key={volunteer.id} value={volunteer.id}>
                    {volunteer.name} ({volunteer.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedVolunteer('');
                  setSelectedReport(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignVolunteer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}