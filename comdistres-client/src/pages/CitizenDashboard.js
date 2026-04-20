import React, { useEffect, useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function CitizenDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('overview');
  
  // State for data
  const [myReports, setMyReports] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0
  });
  const [loading, setLoading] = useState(true);
  const [reportForm, setReportForm] = useState({
    title: '',
    description: '',
    disasterType: 'flood',
    severity: 'medium',
    location: '',
    latitude: null,
    longitude: null
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all reports
      const reportsRes = await api.get('/reports');
      const allReports = reportsRes.data;
      
      // Filter reports created by this citizen
      const userReports = allReports.filter(r => r.reporterId === user.id);
      setMyReports(userReports);

      // Calculate statistics
      setStats({
        total: userReports.length,
        pending: userReports.filter(r => r.status === 'Pending').length,
        inProgress: userReports.filter(r => r.status === 'in-progress' || r.status === 'assigned').length,
        resolved: userReports.filter(r => r.status === 'resolved' || r.status === 'closed').length
      });

      // Generate notifications based on report status changes
      const recentNotifications = userReports
        .filter(r => {
          const updatedRecently = new Date() - new Date(r.updatedAt) < 86400000; // 24 hours
          return updatedRecently && r.status !== 'Pending';
        })
        .map(r => ({
          id: r.id,
          reportId: r.id,
          title: `Report "${r.title}" status updated`,
          message: `Your report status changed to: ${r.status}`,
          status: r.status,
          timestamp: r.updatedAt,
          read: false
        }));

      setNotifications(recentNotifications);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setReportForm({
            ...reportForm,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          alert('Location captured successfully!');
        },
        (error) => {
          console.error('Location error:', error);
          alert('Could not get your location. Please enter manually.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    
    if (!reportForm.title.trim() || !reportForm.description.trim() || !reportForm.location.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmittingReport(true);
    
    try {
      const response = await api.post('/reports', reportForm);
      alert('Report submitted successfully! Your report ID is: ' + response.data.id);
      
      // Reset form
      setReportForm({
        title: '',
        description: '',
        disasterType: 'flood',
        severity: 'medium',
        location: '',
        latitude: null,
        longitude: null
      });
      
      // Switch to My Reports tab
      setActiveTab('myreports');
      fetchDashboardData();
    } catch (error) {
      alert('Failed to submit report: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await api.delete(`/reports/${reportId}`);
      alert('Report deleted successfully');
      fetchDashboardData();
    } catch (error) {
      alert('Failed to delete report: ' + (error.response?.data?.error || error.message));
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

  const getProgressPercentage = (status) => {
    const progress = {
      'Pending': 25,
      'assigned': 50,
      'in-progress': 75,
      'resolved': 100,
      'closed': 100
    };
    return progress[status] || 0;
  };

  const getProgressLabel = (status) => {
    const labels = {
      'Pending': 'Waiting for assignment',
      'assigned': 'Volunteer assigned',
      'in-progress': 'Being worked on',
      'resolved': 'Issue resolved',
      'closed': 'Case closed'
    };
    return labels[status] || status;
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
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold">Welcome, {user?.name}!</h1>
                <p className="text-blue-100 mt-2">Track your emergency reports and stay updated</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-blue-100">
                  Last updated: {new Date().toLocaleTimeString()}
                </span>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition font-medium"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
              <p className="text-gray-500 text-sm font-medium">Total Reports</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
              <p className="text-gray-500 text-sm font-medium">Pending</p>
              <h2 className="text-3xl font-bold text-yellow-600 mt-2">{stats.pending}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-medium">In Progress</p>
              <h2 className="text-3xl font-bold text-purple-600 mt-2">{stats.inProgress}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-medium">Resolved</p>
              <h2 className="text-3xl font-bold text-green-600 mt-2">{stats.resolved}</h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-t-lg shadow-md">
            <div className="flex border-b overflow-x-auto">
              {[
                { id: 'overview', label: 'Overview', icon: '📊' },
                { id: 'create', label: 'Create Report', icon: '➕' },
                { id: 'myreports', label: 'My Reports', icon: '📋', count: myReports.length },
                { id: 'progress', label: 'Progress Tracker', icon: '📈' },
                { id: 'notifications', label: 'Notifications', icon: '🔔', count: notifications.length }
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
                  {tab.count !== undefined && tab.count > 0 && (
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
                <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Actions */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4">🚨 Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('create')}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-left px-4"
                      >
                        ➕ Report New Emergency
                      </button>
                      <button
                        onClick={() => setActiveTab('myreports')}
                        className="w-full py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-medium text-left px-4"
                      >
                        📋 View My Reports ({myReports.length})
                      </button>
                      <Link
                        to="/reports"
                        className="block w-full py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition font-medium text-left px-4"
                      >
                        🗺️ View All Community Reports
                      </Link>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Recent Activity</h3>
                    {myReports.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-600">No reports yet</p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Create your first report →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {myReports.slice(0, 3).map(report => (
                          <div key={report.id} className="bg-white p-3 rounded border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{getDisasterIcon(report.disasterType)}</span>
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{report.title}</p>
                                  <p className="text-xs text-gray-500">{new Date(report.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                                {report.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Safety Tips */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-yellow-900 mb-3">💡 Emergency Tips</h3>
                  <ul className="space-y-2 text-sm text-yellow-800">
                    <li>• Always report emergencies immediately - time is critical</li>
                    <li>• Include accurate location details for faster response</li>
                    <li>• Upload photos if safe to do so - they help responders</li>
                    <li>• Check your report progress regularly for updates</li>
                    <li>• For life-threatening emergencies, call 911 first</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Create Report Tab */}
            {activeTab === 'create' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Report an Emergency</h2>
                  <p className="text-gray-600 mt-1">Submit a new emergency report to get help quickly</p>
                </div>
                
                <form onSubmit={handleReportSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={reportForm.title}
                      onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Brief title of the emergency"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      value={reportForm.description}
                      onChange={(e) => setReportForm({...reportForm, description: e.target.value})}
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Detailed description of the emergency situation"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Disaster Type *
                      </label>
                      <select
                        value={reportForm.disasterType}
                        onChange={(e) => setReportForm({...reportForm, disasterType: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="flood">🌊 Flood</option>
                        <option value="fire">🔥 Fire</option>
                        <option value="earthquake">🏚️ Earthquake</option>
                        <option value="accident">🚗 Accident</option>
                        <option value="medical">🏥 Medical Emergency</option>
                        <option value="storm">⛈️ Storm</option>
                        <option value="other">⚠️ Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Severity *
                      </label>
                      <select
                        value={reportForm.severity}
                        onChange={(e) => setReportForm({...reportForm, severity: e.target.value})}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🟠 High</option>
                        <option value="critical">🔴 Critical</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location *
                    </label>
                    <input
                      type="text"
                      value={reportForm.location}
                      onChange={(e) => setReportForm({...reportForm, location: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Street address, landmark, or area name"
                      required
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      📍 Capture My Current GPS Location
                    </button>
                    {reportForm.latitude && reportForm.longitude && (
                      <p className="text-sm text-green-600 mt-2 text-center font-medium">
                        ✓ GPS Location captured: {reportForm.latitude.toFixed(6)}, {reportForm.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setReportForm({
                        title: '',
                        description: '',
                        disasterType: 'flood',
                        severity: 'medium',
                        location: '',
                        latitude: null,
                        longitude: null
                      })}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReport}
                      className={`flex-1 py-3 px-4 rounded-lg text-white font-medium transition ${
                        submittingReport
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {submittingReport ? 'Submitting...' : '🚨 Submit Emergency Report'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* My Reports Tab */}
            {activeTab === 'myreports' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">My Reports</h2>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    ➕ New Report
                  </button>
                </div>
                
                {myReports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Yet</h3>
                    <p className="text-gray-600 mb-6">You haven't submitted any emergency reports.</p>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                    >
                      Create Your First Report
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReports.map(report => (
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
                                <span className="flex items-center gap-1">
                                  📍 {report.location || 'No location'}
                                </span>
                                <span className="flex items-center gap-1">
                                  🕐 {new Date(report.createdAt).toLocaleString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  📝 Report #{report.id}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end min-w-[150px]">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(report.severity)}`}>
                              {report.severity}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                              {report.status}
                            </span>
                            <div className="flex gap-2 mt-2">
                              <Link
                                to={`/reports/${report.id}`}
                                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition"
                              >
                                View
                              </Link>
                              {report.status === 'Pending' && (
                                <button
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200 transition"
                                >
                                  Delete
                                </button>
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

            {/* Progress Tracker Tab */}
            {activeTab === 'progress' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Report Progress Tracker</h2>
                
                {myReports.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">📈</div>
                    <p className="text-gray-600">No reports to track yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {myReports.map(report => (
                      <div key={report.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <span className="text-2xl">{getDisasterIcon(report.disasterType)}</span>
                            <div>
                              <h3 className="font-semibold text-gray-900">{report.title}</h3>
                              <p className="text-sm text-gray-600">Report #{report.id} • {report.location}</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-600 mb-2">
                            <span>{getProgressLabel(report.status)}</span>
                            <span>{getProgressPercentage(report.status)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all duration-500 ${
                                report.status === 'resolved' || report.status === 'closed'
                                  ? 'bg-green-500'
                                  : report.status === 'in-progress'
                                  ? 'bg-purple-500'
                                  : report.status === 'assigned'
                                  ? 'bg-blue-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${getProgressPercentage(report.status)}%` }}
                            ></div>
                          </div>
                        </div>

                        {/* Timeline */}
                       {/* Timeline */}
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <span className="text-gray-600">Reported on {new Date(report.createdAt).toLocaleDateString()}</span>
                          </div>
                          {report.status !== 'Pending' && (
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              <span className="text-gray-600">Status updated to {report.status}</span>
                            </div>
                          )}
                          {(report.status === 'resolved' || report.status === 'closed') && (
                            <div className="flex items-center gap-2">
                              <span className="text-green-500">✓</span>
                              <span className="text-gray-600">Resolved on {new Date(report.updatedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <Link
                          to={`/reports/${report.id}`}
                          className="mt-4 inline-block text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View full details →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                
                {notifications.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-6xl mb-4">🔔</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No New Notifications</h3>
                    <p className="text-gray-600">You'll be notified when there are updates to your reports</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 hover:bg-blue-100 transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">🔔</span>
                              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                            </div>
                            <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(notification.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Link
                            to={`/reports/${notification.reportId}`}
                            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition whitespace-nowrap"
                          >
                            View Report
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notification Settings */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-8">
                  <h3 className="font-semibold text-gray-900 mb-3">📱 Notification Preferences</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    You'll receive notifications when:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Your report status changes
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      A volunteer is assigned to your report
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      Your issue is resolved
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      New messages are posted on your reports
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}