import React, { useEffect, useState, useContext, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import ChatBox from '../components/ChatBox';
import { AuthContext } from '../context/AuthContext';
import {
  MapPin, Clock, User, AlertTriangle, CheckCircle, ChevronLeft,
  ExternalLink, Trash2, RefreshCw, Share2, Printer, Navigation,
  Activity, Eye, X, ZoomIn, ZoomOut, RotateCw, Download,
  Info, Radio, Shield, Phone, Users, Flag, Copy, Check
} from 'lucide-react';

// ─── Helpers ───────────────────────────────────────────────────────────────
const DISASTER_CONFIG = {
  fire:       { icon: '🔥', label: 'Fire',       color: '#ef4444', gradient: 'from-red-900/80    to-red-950/60'    },
  flood:      { icon: '🌊', label: 'Flood',       color: '#3b82f6', gradient: 'from-blue-900/80   to-blue-950/60'   },
  earthquake: { icon: '🏚️', label: 'Earthquake',  color: '#8b5cf6', gradient: 'from-violet-900/80 to-violet-950/60' },
  accident:   { icon: '🚗', label: 'Accident',    color: '#f59e0b', gradient: 'from-amber-900/80  to-amber-950/60'  },
  medical:    { icon: '🏥', label: 'Medical',     color: '#ec4899', gradient: 'from-pink-900/80   to-pink-950/60'   },
  storm:      { icon: '⛈️', label: 'Storm',       color: '#6366f1', gradient: 'from-indigo-900/80 to-indigo-950/60' },
  other:      { icon: '⚠️', label: 'Other',       color: '#6b7280', gradient: 'from-slate-800/80  to-slate-900/60'  },
};

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: '#ef4444', ring: 'ring-red-500',    pill: 'bg-red-500/20    text-red-300    ring-red-500/40'    },
  high:     { label: 'High',     color: '#f97316', ring: 'ring-orange-500', pill: 'bg-orange-500/20 text-orange-300 ring-orange-500/40' },
  medium:   { label: 'Medium',   color: '#eab308', ring: 'ring-yellow-500', pill: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/40' },
  low:      { label: 'Low',      color: '#22c55e', ring: 'ring-green-500',  pill: 'bg-green-500/20  text-green-300  ring-green-500/40'  },
};

const STATUS_FLOW = [
  { key: 'pending',     label: 'Pending',     icon: '⏳', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { key: 'assigned',    label: 'Assigned',    icon: '📌', color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
  { key: 'in-progress', label: 'In Progress', icon: '⚙️', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  { key: 'resolved',    label: 'Resolved',    icon: '✅', color: 'text-emerald-400',bg: 'bg-emerald-500/20'},
  { key: 'closed',      label: 'Closed',      icon: '🔒', color: 'text-slate-400',  bg: 'bg-slate-500/20'  },
];

const ns        = (s) => (s || '').toLowerCase();
const getDis    = (t) => DISASTER_CONFIG[t]   || DISASTER_CONFIG.other;
const getSev    = (s) => SEVERITY_CONFIG[s]   || { label: s, color: '#9ca3af', pill: 'bg-slate-500/20 text-slate-300 ring-slate-500/40' };
const getStatus = (s) => STATUS_FLOW.find((x) => x.key === ns(s)) || STATUS_FLOW[0];

const fmt = (d, opts) => new Date(d).toLocaleDateString('en-KE', opts || { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const dy = Math.floor(diff / 86_400_000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${dy}d ago`;
};

// Build a rough status timeline from report data
const buildTimeline = (report) => {
  const events = [
    { time: report.createdAt, label: 'Report submitted', icon: '📋', color: 'text-blue-400' },
  ];
  const s = ns(report.status);
  if (['assigned','in-progress','resolved','closed'].includes(s))
    events.push({ time: report.updatedAt, label: 'Assigned to responder', icon: '📌', color: 'text-blue-400' });
  if (['in-progress','resolved','closed'].includes(s))
    events.push({ time: report.updatedAt, label: 'Response in progress', icon: '⚙️', color: 'text-purple-400' });
  if (['resolved','closed'].includes(s))
    events.push({ time: report.updatedAt, label: 'Incident resolved', icon: '✅', color: 'text-emerald-400' });
  if (s === 'closed')
    events.push({ time: report.updatedAt, label: 'Case closed', icon: '🔒', color: 'text-slate-400' });
  return events;
};

// ── Lightbox component ─────────────────────────────────────────────────────
function Lightbox({ src, onClose }) {
  const [zoom, setZoom]     = useState(1);
  const [rotate, setRotate] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 flex flex-col" onClick={onClose}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 bg-black/60 border-b border-white/10 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}>
        <span className="text-white/70 text-sm font-medium">Incident Photo</span>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-white/60 text-xs w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => setRotate((r) => r + 90)}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
            <RotateCw className="w-4 h-4" />
          </button>
          <a href={src} download target="_blank" rel="noopener noreferrer"
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition">
            <Download className="w-4 h-4" />
          </a>
          <button onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-red-600/60 rounded-lg transition ml-2">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Image */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-6"
        onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Incident"
          style={{ transform: `scale(${zoom}) rotate(${rotate}deg)`, transition: 'transform 0.2s ease' }}
          className="max-w-full max-h-full rounded-xl shadow-2xl object-contain cursor-zoom-in"
          onClick={() => setZoom((z) => z === 1 ? 2 : 1)}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function ReportDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useContext(AuthContext);

  const [report,    setReport]    = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [updating,  setUpdating]  = useState(false);
  const [lightbox,  setLightbox]  = useState(false);
  const [copied,    setCopied]    = useState(false);
  const [mapCoords, setMapCoords] = useState(null); // geocoded if DB null

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const res = await api.get(`/reports/${id}`);
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Geocode location if DB coords are null
  useEffect(() => {
    if (!report) return;
    if (report.latitude && report.longitude) {
      setMapCoords({ lat: parseFloat(report.latitude), lng: parseFloat(report.longitude) });
      return;
    }
    if (report.location) {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(report.location + ', Kenya')}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } })
        .then((r) => r.json())
        .then((d) => {
          if (d?.[0]) setMapCoords({ lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon), geocoded: true });
        }).catch(() => {});
    }
  }, [report]);

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdating(true);
      await api.put(`/reports/${id}`, { status: newStatus });
      setReport((r) => ({ ...r, status: newStatus, updatedAt: new Date().toISOString() }));
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Permanently delete this report? This cannot be undone.')) return;
    try {
      await api.delete(`/reports/${id}`);
      navigate('/reports');
    } catch (err) {
      alert('Failed to delete: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => window.print();

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
          <p className="text-slate-400 text-sm tracking-widest uppercase">Loading report…</p>
        </div>
      </div>
    </>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !report) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 flex items-center justify-center pt-16">
        <div className="text-center bg-slate-900 border border-slate-800 rounded-2xl p-10 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">Report Not Found</h2>
          <p className="text-slate-400 text-sm mb-6">{error || 'No data available'}</p>
          <Link to="/reports" className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition">
            <ChevronLeft className="w-4 h-4" /> Back to Reports
          </Link>
        </div>
      </div>
    </>
  );

  const dis      = getDis(report.disasterType);
  const sev      = getSev(report.severity);
  const stat     = getStatus(report.status);
  const timeline = buildTimeline(report);
  const canEdit  = user && (user.id === report.reporterId || user.role === 1 || user.role === 2);
  const statusIdx= STATUS_FLOW.findIndex((x) => x.key === ns(report.status));

  return (
    <>
      <Navbar />
      {lightbox && <Lightbox src={report.imageUrl} onClose={() => setLightbox(false)} />}

      <div className="min-h-screen bg-slate-950 pt-16 print:bg-white print:pt-0">

        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <div className={`relative bg-gradient-to-br ${dis.gradient} border-b border-white/10 overflow-hidden`}>
          {/* Background texture */}
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          
          <div className="relative max-w-5xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <Link to="/reports"
              className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-6 transition">
              <ChevronLeft className="w-4 h-4" /> All Reports
            </Link>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left: icon + title */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-5xl drop-shadow-lg">{dis.icon}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-white/50 uppercase tracking-widest font-bold">{dis.label}</span>
                      <span className="text-white/30">·</span>
                      <span className="text-xs text-white/50">Report #{report.id}</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black text-white leading-tight mt-0.5">
                      {report.title}
                    </h1>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-white/70">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-white/50" />
                    {report.location || 'Location not specified'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-white/50" />
                    {fmt(report.createdAt)} · {timeAgo(report.createdAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-white/50" />
                    {report.reporter?.name || 'Anonymous'}
                  </span>
                </div>
              </div>

              {/* Right: status + severity + actions */}
              <div className="flex flex-col gap-3 lg:items-end">
                <div className="flex gap-2 flex-wrap lg:justify-end">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ring-1 ${sev.pill}`}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>
                    {sev.label} Severity
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold ${stat.bg} ${stat.color}`}>
                    <span>{stat.icon}</span> {stat.label}
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button onClick={fetchReport}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition" title="Refresh">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition text-xs font-medium">
                    {copied ? <><Check className="w-4 h-4 text-green-400" /> Copied!</> : <><Share2 className="w-4 h-4" /> Share</>}
                  </button>
                  <button onClick={handlePrint}
                    className="p-2 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded-lg transition" title="Print">
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

          {/* ── Status Progress Bar ─────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Response Status
            </p>
            <div className="flex items-center gap-0">
              {STATUS_FLOW.map((s, i) => {
                const done    = i < statusIdx;
                const current = i === statusIdx;
                const future  = i > statusIdx;
                return (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => canEdit && handleStatusUpdate(s.key)}
                        disabled={updating || !canEdit}
                        title={canEdit ? `Set to ${s.label}` : s.label}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all border-2 ${
                          current ? 'border-white/40 scale-110 shadow-lg shadow-black/40 bg-slate-700' :
                          done    ? 'border-transparent bg-emerald-600 opacity-90' :
                                    'border-slate-700 bg-slate-800 opacity-40'
                        } ${canEdit && !current ? 'hover:scale-105 hover:opacity-80 cursor-pointer' : ''}`}>
                        {s.icon}
                      </button>
                      <span className={`text-[10px] font-semibold ${
                        current ? s.color : done ? 'text-emerald-500' : 'text-slate-600'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 transition-colors ${i < statusIdx ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            {canEdit && (
              <p className="text-xs text-slate-600 mt-3">Click a status step to update</p>
            )}
          </div>

          {/* ── Main grid ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ── Left column (2/3) ──────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* Image — CLICKABLE LIGHTBOX */}
              {report.imageUrl ? (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Incident Photo</p>
                    <button onClick={() => setLightbox(true)}
                      className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium">
                      <Eye className="w-3.5 h-3.5" /> View Full Screen
                    </button>
                  </div>
                  <div className="relative group cursor-pointer" onClick={() => setLightbox(true)}>
                    <img
                      src={report.imageUrl}
                      alt={report.title}
                      className="w-full max-h-96 object-cover"
                      onError={(e) => { e.target.parentElement.parentElement.style.display = 'none'; }}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center gap-2">
                        <ZoomIn className="w-10 h-10 text-white drop-shadow-lg" />
                        <span className="text-white text-sm font-semibold">Click to enlarge</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 flex items-center justify-center gap-3 text-slate-600">
                  <span className="text-4xl opacity-30">{dis.icon}</span>
                  <p className="text-sm">No photo attached to this report</p>
                </div>
              )}

              {/* Description */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3 flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Description
                </h3>
                <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                  {report.description}
                </p>
              </div>

              {/* Map / Location ──────────────────────────────────── */}
              {mapCoords && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
                      <Navigation className="w-3.5 h-3.5" /> Location
                      {mapCoords.geocoded && <span className="text-blue-500">(geocoded from name)</span>}
                    </p>
                    <a href={`https://www.google.com/maps?q=${mapCoords.lat},${mapCoords.lng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition font-medium">
                      <ExternalLink className="w-3.5 h-3.5" /> Google Maps
                    </a>
                  </div>
                  {/* OpenStreetMap embed */}
                  <div className="relative h-64 bg-slate-800">
                    <iframe
                      title="location-map"
                      width="100%" height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lng - 0.05},${mapCoords.lat - 0.05},${mapCoords.lng + 0.05},${mapCoords.lat + 0.05}&layer=mapnik&marker=${mapCoords.lat},${mapCoords.lng}`}
                    />
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-300">{report.location}</span>
                    </div>
                    <span className="font-mono text-xs text-slate-600">
                      {mapCoords.lat.toFixed(5)}, {mapCoords.lng.toFixed(5)}
                    </span>
                  </div>
                </div>
              )}

              {/* No map fallback */}
              {!mapCoords && report.location && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-600" />
                  <div>
                    <p className="text-sm text-slate-300 font-medium">{report.location}</p>
                    <p className="text-xs text-slate-600 mt-0.5">Coordinates not available · resolving…</p>
                  </div>
                </div>
              )}

              {/* Chat */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
                    💬 Discussion & Field Updates
                  </p>
                </div>
                <div className="p-4">
                  <ChatBox reportId={report.id} />
                </div>
              </div>
            </div>

            {/* ── Right column (1/3) ─────────────────────────────── */}
            <div className="space-y-5">

              {/* Key details card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Report Details</p>

                {[
                  { label: 'Report ID',     value: `#${report.id}`,           icon: Flag     },
                  { label: 'Disaster Type', value: `${dis.icon} ${dis.label}`, icon: AlertTriangle },
                  { label: 'Reported By',   value: report.reporter?.name || 'Anonymous', icon: User },
                  { label: 'Contact',       value: report.reporter?.email || '—',        icon: Phone },
                  { label: 'Submitted',     value: fmt(report.createdAt),               icon: Clock },
                  { label: 'Last Updated',  value: fmt(report.updatedAt),               icon: RefreshCw },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-medium">{label}</p>
                      <p className="text-sm text-slate-200 font-semibold truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Severity + status visual */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Threat Assessment</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Severity</span>
                      <span className="font-semibold" style={{ color: sev.color }}>{sev.label}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          background: sev.color,
                          width: { critical:'100%', high:'75%', medium:'50%', low:'25%' }[report.severity] || '50%'
                        }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Response Progress</span>
                      <span className="font-semibold text-blue-400">{Math.round(((statusIdx + 1) / STATUS_FLOW.length) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${((statusIdx + 1) / STATUS_FLOW.length) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> Event Timeline
                </p>
                <div className="space-y-3">
                  {timeline.map((ev, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="relative flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm flex-shrink-0">
                          {ev.icon}
                        </div>
                        {i < timeline.length - 1 && (
                          <div className="w-0.5 h-6 bg-slate-800 mt-1" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className={`text-xs font-semibold ${ev.color}`}>{ev.label}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{timeAgo(ev.time)} · {fmt(ev.time, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                  {/* Pending future step */}
                  {ns(report.status) !== 'closed' && ns(report.status) !== 'resolved' && (
                    <div className="flex items-start gap-3 opacity-30">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-dashed border-slate-700 flex items-center justify-center text-sm">
                        {STATUS_FLOW[statusIdx + 1]?.icon || '🔒'}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Awaiting {STATUS_FLOW[statusIdx + 1]?.label || 'closure'}…</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-3">Quick Actions</p>
                {mapCoords && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${mapCoords.lat},${mapCoords.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition border border-slate-700 hover:border-slate-600">
                    <Navigation className="w-4 h-4 text-blue-400" /> Get Directions
                  </a>
                )}
                <button onClick={handleShare}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition border border-slate-700 hover:border-slate-600">
                  {copied ? <><Check className="w-4 h-4 text-green-400" /> Link copied!</> : <><Copy className="w-4 h-4 text-purple-400" /> Copy Report Link</>}
                </button>
                <button onClick={handlePrint}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition border border-slate-700 hover:border-slate-600">
                  <Printer className="w-4 h-4 text-slate-400" /> Print / Save PDF
                </button>
                {report.imageUrl && (
                  <a href={report.imageUrl} download target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition border border-slate-700 hover:border-slate-600">
                    <Download className="w-4 h-4 text-emerald-400" /> Download Photo
                  </a>
                )}
              </div>

              {/* Admin: Delete */}
              {canEdit && user.role === 1 && (
                <button onClick={handleDelete}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-900/40 hover:bg-red-800/60 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition border border-red-900/60 hover:border-red-700">
                  <Trash2 className="w-4 h-4" /> Delete Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}