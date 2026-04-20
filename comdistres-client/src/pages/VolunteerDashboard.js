import React, { useEffect, useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function VolunteerDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('assigned');
  
  // State for data
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [stats, setStats] = useState({
    assigned: 0,
    inProgress: 0,
    completed: 0,
    total: 0
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
      const allReportsData = reportsRes.data;
      setAllReports(allReportsData);

      // Filter reports assigned to this volunteer
      // Note: We need coordinatorId to be the volunteer's ID for assigned tasks
      const myAssignedTasks = allReportsData.filter(
        r => r.reporterId === user.id && (r.status === 'assigned' || r.status === 'in-progress')
      );
      
      const myCompletedTasks = allReportsData.filter(
        r => r.reporterId === user.id && (r.status === 'resolved' || r.status === 'closed')
      );

      setAssignedTasks(myAssignedTasks);
      setCompletedTasks(myCompletedTasks);

      // Calculate statistics
      setStats({
        assigned: myAssignedTasks.filter(r => r.status === 'assigned').length,
        inProgress: myAssignedTasks.filter(r => r.status === 'in-progress').length,
        completed: myCompletedTasks.length,
        total: myAssignedTasks.length + myCompletedTasks.length
      });

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

  const handleStartTask = async (reportId) => {
    await handleStatusUpdate(reportId, 'in-progress');
  };

  const handleCompleteTask = async (reportId) => {
    await handleStatusUpdate(reportId, 'resolved');
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
      await api.post('/reports', reportForm);
      alert('Report submitted successfully!');
      
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
      
      fetchDashboardData();
    } catch (error) {
      alert('Failed to submit report: ' + (error.response?.data?.error || error.message));
    } finally {
      setSubmittingReport(false);
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
                <h1 className="text-3xl font-bold text-gray-900">Volunteer Dashboard</h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
              <p className="text-gray-500 text-sm font-medium">Total Tasks</p>
              <h2 className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-yellow-500">
              <p className="text-gray-500 text-sm font-medium">Assigned</p>
              <h2 className="text-3xl font-bold text-yellow-600 mt-2">{stats.assigned}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-purple-500">
              <p className="text-gray-500 text-sm font-medium">In Progress</p>
              <h2 className="text-3xl font-bold text-purple-600 mt-2">{stats.inProgress}</h2>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
              <p className="text-gray-500 text-sm font-medium">Completed</p>
              <h2 className="text-3xl font-bold text-green-600 mt-2">{stats.completed}</h2>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-t-lg shadow-md">
            <div className="flex border-b overflow-x-auto">
              {[
                { id: 'assigned', label: 'Assigned Tasks', icon: '📋', count: assignedTasks.length },
                { id: 'completed', label: 'Completed Tasks', icon: '✅', count: completedTasks.length },
                { id: 'messages', label: 'Messages', icon: '💬' },
                { id: 'report', label: 'Report Emergency', icon: '🚨' }
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
            {/* Assigned Tasks Tab */}
            {activeTab === 'assigned' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">My Assigned Tasks</h2>
                
                {assignedTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📋</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Assigned Tasks</h3>
                    <p className="text-gray-600">You don't have any tasks assigned yet. Check back later!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignedTasks.map(task => (
                      <div
                        key={task.id}
                        className="border border-gray-200 rounded-lg p-5 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{getDisasterIcon(task.disasterType)}</div>
                            <div className="flex-1">
                              <Link
                                to={`/reports/${task.id}`}
                                className="font-semibold text-lg text-gray-900 hover:text-blue-600"
                              >
                                {task.title}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  📍 {task.location || 'No location'}
                                </span>
                                <span className="flex items-center gap-1">
                                  👤 {task.reporter?.name || 'Anonymous'}
                                </span>
                                <span className="flex items-center gap-1">
                                  🕐 {new Date(task.createdAt).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end min-w-[200px]">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(task.severity)}`}>
                              {task.severity}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            <div className="flex flex-col gap-2 mt-2 w-full">
                              {task.status === 'assigned' && (
                                <button
                                  onClick={() => handleStartTask(task.id)}
                                  className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition w-full"
                                >
                                  Start Task
                                </button>
                              )}
                              {task.status === 'in-progress' && (
                                <button
                                  onClick={() => handleCompleteTask(task.id)}
                                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition w-full"
                                >
                                  Mark Complete
                                </button>
                              )}
                              <Link
                                to={`/reports/${task.id}`}
                                className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition text-center"
                              >
                                View Details
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed Tasks Tab */}
            {activeTab === 'completed' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Completed Tasks</h2>
                  <span className="text-sm text-gray-500">{completedTasks.length} tasks completed</span>
                </div>
                
                {completedTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Completed Tasks Yet</h3>
                    <p className="text-gray-600">Complete your assigned tasks to see them here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {completedTasks.map(task => (
                      <div
                        key={task.id}
                        className="border border-gray-200 rounded-lg p-5 bg-green-50"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="text-3xl">{getDisasterIcon(task.disasterType)}</div>
                            <div className="flex-1">
                              <Link
                                to={`/reports/${task.id}`}
                                className="font-semibold text-lg text-gray-900 hover:text-blue-600"
                              >
                                {task.title}
                              </Link>
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
                                <span>📍 {task.location || 'No location'}</span>
                                <span>🕐 Completed: {new Date(task.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-2 items-end">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                              ✓ {task.status}
                            </span>
                            <Link
                              to={`/reports/${task.id}`}
                              className="px-4 py-2 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition"
                            >
                              View Report
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Chat Messages</h2>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <p className="text-blue-900 mb-4">
                    💬 View messages for specific tasks by clicking on "View Details" in your assigned tasks.
                  </p>
                  <p className="text-sm text-blue-700">
                    Each task has its own chat thread where you can communicate with coordinators and other volunteers.
                  </p>
                </div>

                {assignedTasks.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Quick Access to Task Chats:</h3>
                    {assignedTasks.slice(0, 5).map(task => (
                      <Link
                        key={task.id}
                        to={`/reports/${task.id}`}
                        className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-600">{task.location}</p>
                          </div>
                          <span className="text-blue-600">View Chat →</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Report Emergency Tab */}
            {activeTab === 'report' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Report Emergency</h2>
                  <p className="text-gray-600 mt-1">Submit a new emergency report to the system</p>
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
                      placeholder="Detailed description of the emergency"
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
                        <option value="flood">Flood</option>
                        <option value="fire">Fire</option>
                        <option value="earthquake">Earthquake</option>
                        <option value="accident">Accident</option>
                        <option value="medical">Medical Emergency</option>
                        <option value="storm">Storm</option>
                        <option value="other">Other</option>
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
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
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
                      placeholder="Street address, landmark, or area"
                      required
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Use My Current Location
                    </button>
                    {reportForm.latitude && reportForm.longitude && (
                      <p className="text-sm text-green-600 mt-2 text-center">
                        ✓ Location captured: {reportForm.latitude.toFixed(6)}, {reportForm.longitude.toFixed(6)}
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
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
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
                      {submittingReport ? 'Submitting...' : 'Submit Report'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}