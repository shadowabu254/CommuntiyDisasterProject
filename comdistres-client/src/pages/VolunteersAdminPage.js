import React, { useState, useEffect, useCallback, useContext } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, RefreshCw, CheckCircle, XCircle,
  Clock, Eye, ChevronDown, MapPin, Mail, Phone, Calendar,
  Star, Award, Car, Heart, Loader, X, Check, AlertTriangle,
  Download, Activity
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:    { label:'Pending',    pill:'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', dot:'bg-yellow-500',  icon:'⏳' },
  reviewing:  { label:'Reviewing',  pill:'bg-blue-500/20   text-blue-300   border-blue-500/40',   dot:'bg-blue-500',    icon:'🔍' },
  approved:   { label:'Approved',   pill:'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',dot:'bg-emerald-500',icon:'✅' },
  rejected:   { label:'Rejected',   pill:'bg-red-500/20    text-red-300    border-red-500/40',    dot:'bg-red-500',     icon:'❌' },
  on_hold:    { label:'On Hold',    pill:'bg-slate-500/20  text-slate-300  border-slate-500/40',  dot:'bg-slate-500',   icon:'⏸️' },
};
const EXP_LABELS = { none:'No Experience', some:'Some Experience', experienced:'Experienced', professional:'Professional' };
const getS = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.pending;
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff/60000); const h = Math.floor(diff/3600000); const dy = Math.floor(diff/86400000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${dy}d ago`;
};

// ── Detail Modal ───────────────────────────────────────────────────────────
function DetailModal({ app, onClose, onStatusUpdate }) {
  const [status,     setStatus]     = useState(app.status);
  const [notes,      setNotes]      = useState(app.adminNotes || '');
  const [saving,     setSaving]     = useState(false);

  const save = async () => {
    setSaving(true);
    await onStatusUpdate(app.id, status, notes);
    setSaving(false);
    onClose();
  };

  const skills = app.skills ? app.skills.split(',').filter(Boolean) : [];
  const days   = app.availableDays  ? app.availableDays.split(',').filter(Boolean)  : [];
  const times  = app.availableTimes ? app.availableTimes.split(',').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Volunteer Application</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {app.firstName.charAt(0)}{app.lastName.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{app.firstName} {app.lastName}</h2>
              <p className="text-sm text-slate-400">{app.referenceNumber} · Applied {timeAgo(app.createdAt)}</p>
            </div>
            <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getS(app.status).pill}`}>
              {getS(app.status).icon} {getS(app.status).label}
            </span>
          </div>

          {/* Contact details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon:Mail,    label:'Email',   value:app.email   },
              { icon:Phone,   label:'Phone',   value:app.phone   },
              { icon:MapPin,  label:'County',  value:app.county  },
              { icon:Calendar,label:'Applied', value:new Date(app.createdAt).toLocaleDateString() },
            ].map(({ icon:Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2 bg-slate-800/50 rounded-xl p-3">
                <Icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-200 font-medium">{value || '—'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => <span key={s} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">{s}</span>)}
              </div>
              <div className="flex gap-3 mt-2">
                {app.hasVehicle && <span className="text-xs text-blue-400 flex items-center gap-1"><Car className="w-3 h-3" /> Has vehicle</span>}
                {app.hasFirstAidCert && <span className="text-xs text-pink-400 flex items-center gap-1"><Heart className="w-3 h-3" /> First Aid cert</span>}
              </div>
            </div>
          )}

          {/* Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Available Days</p>
              <div className="flex flex-wrap gap-1.5">
                {days.map(d => <span key={d} className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300">{d.slice(0,3)}</span>)}
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Hours / Month</p>
              <p className="text-sm text-slate-200">{app.hoursPerMonth || '—'}</p>
            </div>
          </div>

          {/* Experience + motivation */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Experience Level</p>
            <p className="text-sm text-slate-300">{EXP_LABELS[app.experienceLevel] || app.experienceLevel}</p>
            {app.previousOrg && <p className="text-xs text-slate-500 mt-1">Previous: {app.previousOrg}</p>}
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Why They Want to Volunteer</p>
            <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 rounded-xl p-4 border border-slate-700">{app.whyVolunteer}</p>
          </div>

          {/* Emergency contact */}
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Emergency Contact</p>
            <p className="text-sm text-slate-200">{app.emergencyContactName} · {app.emergencyContactPhone}</p>
          </div>

          {/* Status update */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Update Status</p>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <button key={val} onClick={() => setStatus(val)}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    status === val ? `${cfg.pill} scale-105` : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-600'
                  }`}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Admin notes (optional)…"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-2">
                {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function VolunteersAdminPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [apps,      setApps]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCounty, setFilterCounty] = useState('all');

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role > 2) navigate('/dashboard');
  }, [user]);

  const fetchApps = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterCounty !== 'all') params.county = filterCounty;
      const res = await api.get('/volunteers', { params });
      setApps(res.data);
    } catch (err) {
      console.error('fetchApps error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterCounty]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const handleStatusUpdate = async (id, status, adminNotes) => {
    try {
      const res = await api.put(`/volunteers/${id}/status`, { status, adminNotes });
      setApps(prev => prev.map(a => a.id === id ? res.data : a));
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  const filtered = apps.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(q) ||
      a.email?.toLowerCase().includes(q) ||
      a.county?.toLowerCase().includes(q) ||
      a.referenceNumber?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total:    apps.length,
    pending:  apps.filter(a => a.status === 'pending').length,
    approved: apps.filter(a => a.status === 'approved').length,
    reviewing:apps.filter(a => a.status === 'reviewing').length,
  };

  const counties = [...new Set(apps.map(a => a.county).filter(Boolean))].sort();

  const exportCSV = () => {
    const h = ['Ref','Name','Email','Phone','County','Skills','Experience','Hours/Month','Status','Applied'];
    const rows = filtered.map(a => [
      a.referenceNumber, `"${a.firstName} ${a.lastName}"`, a.email, a.phone,
      a.county, `"${a.skills||''}"`, a.experienceLevel, a.hoursPerMonth, a.status,
      new Date(a.createdAt).toISOString()
    ]);
    const csv = [h,...rows].map(r=>r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a = document.createElement('a'); a.href=url; a.download='volunteer_applications.csv'; a.click();
  };

  return (
    <>
      <Navbar />
      {selected && (
        <DetailModal app={selected} onClose={() => setSelected(null)} onStatusUpdate={handleStatusUpdate} />
      )}
      <div className="min-h-screen bg-slate-950 pt-16">
        {/* Header */}
        <div className="bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Admin Panel</span>
                </div>
                <h1 className="text-3xl font-black text-white">Volunteer Applications</h1>
                <p className="text-slate-400 text-sm mt-1">Review and manage all volunteer applications</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchApps}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl text-sm transition">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label:'Total',     val:stats.total,     color:'text-slate-300',   bg:'bg-slate-800/60 border-slate-700' },
                { label:'Pending',   val:stats.pending,   color:'text-yellow-400',  bg:'bg-yellow-900/20 border-yellow-900/40' },
                { label:'Reviewing', val:stats.reviewing, color:'text-blue-400',    bg:'bg-blue-900/20 border-blue-900/40' },
                { label:'Approved',  val:stats.approved,  color:'text-emerald-400', bg:'bg-emerald-900/20 border-emerald-900/40' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`border rounded-xl p-4 ${bg}`}>
                  <p className={`text-2xl font-black ${color}`}>{val}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search name, email, ref…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-600" />
            </div>
            <div className="relative">
              <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="all">All Counties</option>
                {counties.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-600" />
            </div>
            <span className="self-center text-xs text-slate-500 ml-auto">{filtered.length} application{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-600 gap-3">
              <Loader className="w-6 h-6 animate-spin" /> Loading applications…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No applications found</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                    {['Applicant','Contact','County','Skills','Availability','Experience','Status','Applied','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map(app => {
                    const s = getS(app.status);
                    const skills = app.skills ? app.skills.split(',').filter(Boolean).slice(0,3) : [];
                    return (
                      <tr key={app.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {app.firstName.charAt(0)}{app.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-200">{app.firstName} {app.lastName}</p>
                              <p className="text-xs text-slate-600">{app.referenceNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-slate-400 text-xs">{app.email}</p>
                          <p className="text-slate-500 text-xs">{app.phone}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{app.county}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {skills.map(s => <span key={s} className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">{s}</span>)}
                            {app.skills?.split(',').length > 3 && <span className="text-[10px] text-slate-600">+{app.skills.split(',').length-3}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{app.hoursPerMonth || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400 capitalize">{EXP_LABELS[app.experienceLevel] || app.experienceLevel}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${s.pill}`}>
                            {s.icon} {s.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(app.createdAt)}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelected(app)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium transition">
                            <Eye className="w-3.5 h-3.5" /> Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}