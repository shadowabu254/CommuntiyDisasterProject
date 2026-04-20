import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  Search, Filter, RefreshCw, Grid, List, AlertTriangle,
  MapPin, User, Clock, ChevronDown, X, Plus,
  TrendingUp, CheckCircle, Activity, AlertCircle,
  Image, ExternalLink, Eye
} from 'lucide-react';

// ─── Config ────────────────────────────────────────────────────────────────
const DISASTER_CONFIG = {
  fire:       { icon: '🔥', label: 'Fire',       color: '#ef4444', bg: 'bg-red-500'    },
  flood:      { icon: '🌊', label: 'Flood',       color: '#3b82f6', bg: 'bg-blue-500'  },
  earthquake: { icon: '🏚️', label: 'Earthquake',  color: '#8b5cf6', bg: 'bg-violet-500'},
  accident:   { icon: '🚗', label: 'Accident',    color: '#f59e0b', bg: 'bg-amber-500' },
  medical:    { icon: '🏥', label: 'Medical',     color: '#ec4899', bg: 'bg-pink-500'  },
  storm:      { icon: '⛈️', label: 'Storm',       color: '#6366f1', bg: 'bg-indigo-500'},
  other:      { icon: '⚠️', label: 'Other',       color: '#6b7280', bg: 'bg-gray-500'  },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', dot: '🔴', color: '#ef4444', pill: 'bg-red-100    text-red-800    ring-red-300'    },
  high:     { label: 'High',     dot: '🟠', color: '#f97316', pill: 'bg-orange-100 text-orange-800 ring-orange-300' },
  medium:   { label: 'Medium',   dot: '🟡', color: '#eab308', pill: 'bg-yellow-100 text-yellow-800 ring-yellow-300' },
  low:      { label: 'Low',      dot: '🟢', color: '#22c55e', pill: 'bg-green-100  text-green-800  ring-green-300'  },
};

const STATUS_CONFIG = {
  pending:      { label: 'Pending',     pill: 'bg-yellow-100 text-yellow-800', dot: 'bg-yellow-400' },
  reported:     { label: 'Reported',    pill: 'bg-orange-100 text-orange-800', dot: 'bg-orange-400' },
  assigned:     { label: 'Assigned',    pill: 'bg-blue-100   text-blue-800',   dot: 'bg-blue-400'   },
  'in-progress':{ label: 'In Progress', pill: 'bg-purple-100 text-purple-800', dot: 'bg-purple-400' },
  resolved:     { label: 'Resolved',    pill: 'bg-green-100  text-green-800',  dot: 'bg-green-400'  },
  closed:       { label: 'Closed',      pill: 'bg-gray-100   text-gray-700',   dot: 'bg-gray-400'   },
};

const ns  = (s) => (s || '').toLowerCase();
const getStatus   = (s) => STATUS_CONFIG[ns(s)]    || STATUS_CONFIG.pending;
const getSeverity = (s) => SEVERITY_CONFIG[s]      || { label: s, dot: '⚪', color: '#9ca3af', pill: 'bg-gray-100 text-gray-700 ring-gray-300' };
const getDisaster = (t) => DISASTER_CONFIG[t]      || DISASTER_CONFIG.other;

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString('en-KE', { day:'numeric', month:'short', year:'numeric' });
};

const isNewReport = (date) => Date.now() - new Date(date).getTime() < 3_600_000 * 6; // < 6h

// ═══════════════════════════════════════════════════════════════════════════
export default function Reports() {
  const [reports,  setReports]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [search,   setSearch]   = useState('');
  const [sortBy,   setSortBy]   = useState('newest'); // newest | oldest | severity | status
  const [lightbox, setLightbox] = useState(null);    // imageUrl to show full-screen
  const [filter, setFilter] = useState({
    status: 'all', disasterType: 'all', severity: 'all',
  });

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/reports');
      setReports(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // ── Derived data ─────────────────────────────────────────────────────────
  const stats = {
    total:    reports.length,
    critical: reports.filter((r) => r.severity === 'critical').length,
    active:   reports.filter((r) => ['pending','reported','assigned','in-progress'].includes(ns(r.status))).length,
    resolved: reports.filter((r) => ['resolved','closed'].includes(ns(r.status))).length,
    withImage:reports.filter((r) => r.imageUrl).length,
  };

  const SEVERITY_ORDER = { critical:0, high:1, medium:2, low:3 };

  const filtered = reports
    .filter((r) => {
      if (filter.status      !== 'all' && ns(r.status)      !== ns(filter.status)) return false;
      if (filter.disasterType!== 'all' && r.disasterType    !== filter.disasterType) return false;
      if (filter.severity    !== 'all' && r.severity        !== filter.severity) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          r.title?.toLowerCase().includes(q)       ||
          r.description?.toLowerCase().includes(q) ||
          r.location?.toLowerCase().includes(q)    ||
          r.reporter?.name?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')   return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest')   return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'severity') return (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4);
      if (sortBy === 'status')   return (a.status || '').localeCompare(b.status || '');
      return 0;
    });

  const hasFilters = filter.status !== 'all' || filter.disasterType !== 'all' || filter.severity !== 'all' || search;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-16">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-ping" />
            <div className="absolute inset-2 rounded-full border-4 border-t-red-500 border-transparent animate-spin" />
          </div>
          <p className="text-slate-400 text-sm tracking-widest uppercase">Loading reports…</p>
        </div>
      </div>
    </>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-16">
        <div className="bg-red-950/60 border border-red-800 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-red-300 font-bold text-lg mb-2">Failed to Load Reports</h2>
          <p className="text-red-400/80 text-sm mb-6">{error}</p>
          <button onClick={fetchReports}
            className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition font-medium">
            Try Again
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-8 h-8" />
          </button>
          <img src={lightbox} alt="Disaster" className="max-h-[90vh] max-w-full rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      <div className="min-h-screen bg-slate-950 pt-16">

        {/* ── Hero / Command Header ──────────────────────────────────── */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Title row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold">Live Feed</span>
                </div>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  Disaster Reports
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  Community emergency monitoring · {stats.total} total reports
                </p>
              </div>
              <Link to="/reports/new"
                className="inline-flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-red-900/40 hover:shadow-red-700/40 hover:-translate-y-0.5">
                <Plus className="w-5 h-5" />
                Report Emergency
              </Link>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'Total Reports', value: stats.total,    icon: Activity,      color: 'text-slate-300',  border: 'border-slate-700' },
                { label: 'Critical',      value: stats.critical, icon: AlertTriangle, color: 'text-red-400',    border: 'border-red-900/60' },
                { label: 'Active',        value: stats.active,   icon: TrendingUp,    color: 'text-amber-400',  border: 'border-amber-900/60' },
                { label: 'Resolved',      value: stats.resolved, icon: CheckCircle,   color: 'text-emerald-400',border: 'border-emerald-900/60' },
              ].map(({ label, value, icon: Icon, color, border }) => (
                <div key={label} className={`bg-slate-900/80 border ${border} rounded-xl p-4 flex items-center gap-3`}>
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div>
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 font-medium">{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Search + controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, location, type, reporter…"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:outline-none cursor-pointer">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="severity">By Severity</option>
                  <option value="status">By Status</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
              </div>

              {/* View toggle */}
              <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
                <button onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh */}
              <button onClick={fetchReports}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl hover:bg-slate-700 hover:text-slate-200 transition flex items-center gap-2 text-sm">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* ── Filter chips ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-5">
            {/* Status filter */}
            <div className="relative">
              <select
                value={filter.status}
                onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
                className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer focus:outline-none ${
                  filter.status !== 'all'
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}>
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="reported">Reported</option>
                <option value="assigned">Assigned</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-70" />
            </div>

            {/* Type filter */}
            <div className="relative">
              <select
                value={filter.disasterType}
                onChange={(e) => setFilter((f) => ({ ...f, disasterType: e.target.value }))}
                className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer focus:outline-none ${
                  filter.disasterType !== 'all'
                    ? 'bg-violet-600 text-white border-violet-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}>
                <option value="all">All Types</option>
                {Object.entries(DISASTER_CONFIG).map(([v, { icon, label }]) => (
                  <option key={v} value={v}>{icon} {label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-70" />
            </div>

            {/* Severity filter */}
            <div className="relative">
              <select
                value={filter.severity}
                onChange={(e) => setFilter((f) => ({ ...f, severity: e.target.value }))}
                className={`appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-semibold border transition cursor-pointer focus:outline-none ${
                  filter.severity !== 'all'
                    ? 'bg-red-700 text-white border-red-600'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                }`}>
                <option value="all">All Severity</option>
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-70" />
            </div>

            {/* Clear */}
            {hasFilters && (
              <button
                onClick={() => { setFilter({ status:'all', disasterType:'all', severity:'all' }); setSearch(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition border border-slate-600">
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}

            {/* Result count */}
            <span className="ml-auto text-xs text-slate-500 self-center">
              {filtered.length} of {reports.length} reports
            </span>
          </div>

          {/* ── Empty state ───────────────────────────────────────────── */}
          {filtered.length === 0 && (
            <div className="text-center py-24">
              <div className="text-7xl mb-4">📭</div>
              <h3 className="text-xl font-bold text-slate-300 mb-2">No reports found</h3>
              <p className="text-slate-500 text-sm mb-6">
                {reports.length === 0
                  ? 'No emergencies reported yet.'
                  : 'Try adjusting your search or filters.'}
              </p>
              {reports.length === 0 && (
                <Link to="/reports/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition">
                  <Plus className="w-4 h-4" /> Create First Report
                </Link>
              )}
            </div>
          )}

          {/* ══ GRID VIEW ══════════════════════════════════════════════ */}
          {viewMode === 'grid' && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((report, idx) => {
                const disaster  = getDisaster(report.disasterType);
                const severity  = getSeverity(report.severity);
                const status    = getStatus(report.status);
                const isNew     = isNewReport(report.createdAt);
                return (
                  <div key={report.id}
                    className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-2xl hover:shadow-slate-900/60"
                    style={{ animationDelay: `${idx * 40}ms` }}>

                    {/* Image or placeholder */}
                    <div className="relative h-44 overflow-hidden bg-slate-800">
                      {report.imageUrl ? (
                        <>
                          <img
                            src={report.imageUrl}
                            alt={report.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                          {/* Fallback if image fails */}
                          <div className="hidden w-full h-full items-center justify-center" style={{ background: disaster.color + '18' }}>
                            <span className="text-5xl">{disaster.icon}</span>
                          </div>
                          {/* Expand button */}
                          <button
                            onClick={(e) => { e.preventDefault(); setLightbox(report.imageUrl); }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-lg text-white opacity-0 group-hover:opacity-100 transition hover:bg-black/70">
                            <Eye className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2"
                          style={{ background: `linear-gradient(135deg, ${disaster.color}18, ${disaster.color}08)` }}>
                          <span className="text-5xl">{disaster.icon}</span>
                          <span className="text-xs text-slate-600 flex items-center gap-1">
                            <Image className="w-3 h-3" /> No photo
                          </span>
                        </div>
                      )}

                      {/* Severity bar at top */}
                      <div className="absolute top-0 left-0 right-0 h-1"
                        style={{ background: severity.color }} />

                      {/* NEW badge */}
                      {isNew && (
                        <div className="absolute top-3 left-3 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
                          NEW
                        </div>
                      )}

                      {/* Type badge */}
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <span className="text-sm">{disaster.icon}</span>
                        <span className="text-xs text-white font-semibold">{disaster.label}</span>
                      </div>
                    </div>

                    {/* Card body */}
                    <div className="p-4">
                      {/* Badges row */}
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${severity.pill}`}>
                          {severity.dot} {severity.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 ${status.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>

                      <Link to={`/reports/${report.id}`}>
                        <h3 className="font-bold text-white text-base leading-snug mb-2 group-hover:text-red-300 transition line-clamp-2">
                          {report.title}
                        </h3>
                      </Link>

                      <p className="text-slate-400 text-xs line-clamp-2 mb-3 leading-relaxed">
                        {report.description}
                      </p>

                      {/* Meta */}
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                          <span className="truncate">{report.location || 'Location not specified'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-600" />
                            <span>{report.reporter?.name || 'Anonymous'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timeAgo(report.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* View button */}
                      <Link to={`/reports/${report.id}`}
                        className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition border border-slate-700 hover:border-slate-600">
                        <ExternalLink className="w-3.5 h-3.5" /> View Full Report
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ LIST VIEW ══════════════════════════════════════════════ */}
          {viewMode === 'list' && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered.map((report) => {
                const disaster = getDisaster(report.disasterType);
                const severity = getSeverity(report.severity);
                const status   = getStatus(report.status);
                const isNew    = isNewReport(report.createdAt);

                return (
                  <Link key={report.id} to={`/reports/${report.id}`}
                    className="group flex gap-0 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-600 transition-all hover:shadow-xl hover:shadow-slate-950/60">

                    {/* Severity stripe */}
                    <div className="w-1 flex-shrink-0" style={{ background: severity.color }} />

                    {/* Thumbnail */}
                    <div className="w-28 flex-shrink-0 relative bg-slate-800">
                      {report.imageUrl ? (
                        <img
                          src={report.imageUrl}
                          alt={report.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                        />
                      ) : null}
                      <div className={`${report.imageUrl ? 'hidden' : 'flex'} w-full h-full min-h-[100px] items-center justify-center`}
                        style={{ background: disaster.color + '18' }}>
                        <span className="text-3xl">{disaster.icon}</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-4 flex flex-col md:flex-row md:items-center gap-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isNew && (
                            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded">NEW</span>
                          )}
                          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{disaster.label}</span>
                        </div>
                        <h3 className="font-bold text-white text-sm mb-1 group-hover:text-red-300 transition truncate">
                          {report.title}
                        </h3>
                        <p className="text-slate-400 text-xs line-clamp-1 mb-2">{report.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{report.location || '—'}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" />{report.reporter?.name || 'Anonymous'}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{timeAgo(report.createdAt)}</span>
                          {report.imageUrl && <span className="flex items-center gap-1 text-blue-400"><Image className="w-3 h-3" />Has photo</span>}
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="flex md:flex-col gap-2 md:items-end flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ring-1 ${severity.pill}`}>
                          {severity.dot} {severity.label}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${status.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Bottom spacing */}
          <div className="h-12" />
        </div>
      </div>
    </>
  );
}