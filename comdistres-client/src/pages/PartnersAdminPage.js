import React, { useState, useEffect, useCallback, useContext } from 'react';
import Navbar from '../components/Navbar';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Handshake, Search, RefreshCw, Eye, ChevronDown,
  MapPin, Mail, Phone, Globe, Building, Loader,
  X, Check, Download, Award, DollarSign, Users,
  TrendingUp, AlertTriangle
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:   { label:'Pending',   pill:'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon:'⏳' },
  reviewing: { label:'Reviewing', pill:'bg-blue-500/20   text-blue-300   border-blue-500/40',   icon:'🔍' },
  active:    { label:'Active',    pill:'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',icon:'✅' },
  inactive:  { label:'Inactive',  pill:'bg-slate-500/20  text-slate-300  border-slate-500/40',  icon:'⏸️' },
  rejected:  { label:'Rejected',  pill:'bg-red-500/20    text-red-300    border-red-500/40',    icon:'❌' },
};

const ORG_ICONS = { ngo:'🤝', government:'🏛️', corporate:'🏢', hospital:'🏥', education:'🎓', media:'📡', religious:'⛪', other:'⚡' };
const getS = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.pending;
const timeAgo = (d) => {
  const diff = Date.now() - new Date(d);
  const m = Math.floor(diff/60000); const h = Math.floor(diff/3600000); const dy = Math.floor(diff/86400000);
  if (m < 1) return 'just now'; if (m < 60) return `${m}m ago`; if (h < 24) return `${h}h ago`; return `${dy}d ago`;
};

// ── Detail Modal ───────────────────────────────────────────────────────────
function DetailModal({ p, onClose, onStatusUpdate }) {
  const [status, setStatus] = useState(p.status);
  const [notes,  setNotes]  = useState(p.adminNotes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onStatusUpdate(p.id, status, notes);
    setSaving(false);
    onClose();
  };

  const contribs = p.contributions ? p.contributions.split(',').filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white text-lg">Partnership Application</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Org header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-3xl flex-shrink-0">
              {ORG_ICONS[p.orgType] || '⚡'}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{p.orgName}</h2>
              <p className="text-sm text-slate-400">{p.referenceNumber} · {p.county} · {p.orgType}</p>
            </div>
            <span className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getS(p.status).pill}`}>
              {getS(p.status).icon} {getS(p.status).label}
            </span>
          </div>

          {/* Tier */}
          {p.tier && (
            <div className="p-3 bg-amber-900/20 border border-amber-800/40 rounded-xl flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">{p.tier}</span>
            </div>
          )}

          {/* Org details */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon:MapPin,      label:'County',   value:p.county },
              { icon:Users,       label:'Org Size', value:p.orgSize },
              { icon:Globe,       label:'Website',  value:p.orgWebsite },
              { icon:DollarSign,  label:'Funding',  value:p.fundingAmount },
              { icon:Handshake,   label:'Duration', value:p.duration },
              { icon:TrendingUp,  label:'Timeline', value:p.timeline },
            ].filter(x => x.value).map(({ icon:Icon, label, value }) => (
              <div key={label} className="flex items-start gap-2 bg-slate-800/50 rounded-xl p-3">
                <Icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm text-slate-200 font-medium">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Contributions */}
          {contribs.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Contributions Offered</p>
              <div className="flex flex-wrap gap-2">
                {contribs.map(c => <span key={c} className="px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-300">{c}</span>)}
              </div>
            </div>
          )}

          {p.description && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/40 rounded-xl p-4 border border-slate-700">{p.description}</p>
            </div>
          )}

          {p.specificNeeds && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-2">Specific Conditions</p>
              <p className="text-sm text-slate-300 leading-relaxed">{p.specificNeeds}</p>
            </div>
          )}

          {/* Contact */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wide font-bold">Primary Contact</p>
            <p className="font-semibold text-slate-200">{p.contactName} · {p.contactTitle}</p>
            <p className="text-sm text-slate-400">{p.contactEmail} · {p.contactPhone}</p>
            {p.altContactName && <p className="text-xs text-slate-500">Alt: {p.altContactName} — {p.altContactEmail}</p>}
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
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-2">
                {saving ? <Loader className="w-4 h-4 animate-spin text-white" /> : <Check className="w-4 h-4" />}
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
export default function PartnersAdminPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [partners,     setPartners]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => { if (user && user.role > 2) navigate('/dashboard'); }, [user]);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await api.get('/partnerships', { params });
      setPartners(res.data);
    } catch (err) {
      console.error('fetchPartners error:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const handleStatusUpdate = async (id, status, adminNotes) => {
    try {
      const res = await api.put(`/partnerships/${id}/status`, { status, adminNotes });
      setPartners(prev => prev.map(p => p.id === id ? res.data : p));
    } catch (err) {
      alert('Failed to update: ' + (err.response?.data?.error || err.message));
    }
  };

  const filtered = partners.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.orgName?.toLowerCase().includes(q) || p.contactEmail?.toLowerCase().includes(q) || p.referenceNumber?.toLowerCase().includes(q) || p.county?.toLowerCase().includes(q);
  });

  const stats = {
    total:  partners.length,
    active: partners.filter(p => p.status === 'active').length,
    pending:partners.filter(p => p.status === 'pending').length,
    gold:   partners.filter(p => p.tier === 'Gold Partner').length,
  };

  const exportCSV = () => {
    const h = ['Ref','Org Name','Type','County','Tier','Contributions','Contact','Email','Status','Applied'];
    const rows = filtered.map(p => [
      p.referenceNumber, `"${p.orgName}"`, p.orgType, p.county, p.tier||'—',
      `"${p.contributions||''}"`, p.contactName, p.contactEmail, p.status,
      new Date(p.createdAt).toISOString()
    ]);
    const csv = [h,...rows].map(r=>r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    const a = document.createElement('a'); a.href=url; a.download='partnerships.csv'; a.click();
  };

  return (
    <>
      <Navbar />
      {selected && <DetailModal p={selected} onClose={() => setSelected(null)} onStatusUpdate={handleStatusUpdate} />}
      <div className="min-h-screen bg-slate-950 pt-16">
        {/* Header */}
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Handshake className="w-5 h-5 text-amber-400" />
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Admin Panel</span>
                </div>
                <h1 className="text-3xl font-black text-white">Partnerships</h1>
                <p className="text-slate-400 text-sm mt-1">Manage all partnership applications and active partners</p>
              </div>
              <div className="flex gap-2">
                <button onClick={fetchPartners}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 rounded-xl text-sm transition">
                  <RefreshCw className="w-4 h-4" /> Refresh
                </button>
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-semibold rounded-xl text-sm transition">
                  <Download className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label:'Total Partners',  val:stats.total,  color:'text-slate-300',   bg:'bg-slate-800/60 border-slate-700' },
                { label:'Active',          val:stats.active, color:'text-emerald-400', bg:'bg-emerald-900/20 border-emerald-900/40' },
                { label:'Pending Review',  val:stats.pending,color:'text-yellow-400',  bg:'bg-yellow-900/20 border-yellow-900/40' },
                { label:'Gold Partners',   val:stats.gold,   color:'text-amber-400',   bg:'bg-amber-900/20 border-amber-900/40' },
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
                placeholder="Search org name, email, ref…"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm focus:outline-none cursor-pointer">
                <option value="all">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-600" />
            </div>
            <span className="self-center text-xs text-slate-500 ml-auto">{filtered.length} partner{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Cards grid */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-slate-600 gap-3">
              <Loader className="w-6 h-6 animate-spin" /> Loading partnerships…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <Handshake className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No partnerships found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(p => {
                const s = getS(p.status);
                const contribs = p.contributions ? p.contributions.split(',').filter(Boolean).slice(0,3) : [];
                return (
                  <div key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl flex-shrink-0">
                          {ORG_ICONS[p.orgType] || '⚡'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-200 text-sm">{p.orgName}</p>
                          <p className="text-xs text-slate-500">{p.county} · {p.orgType}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${s.pill}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>

                    {p.tier && (
                      <div className="mb-3 flex items-center gap-1.5 text-xs text-amber-400">
                        <Award className="w-3.5 h-3.5" /> {p.tier}
                      </div>
                    )}

                    {contribs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {contribs.map(c => <span key={c} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">{c}</span>)}
                        {p.contributions?.split(',').length > 3 && <span className="text-[10px] text-slate-600">+{p.contributions.split(',').length-3}</span>}
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                      <div className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{p.contactEmail}</div>
                      {p.fundingAmount && <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" />{p.fundingAmount}</div>}
                      <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{timeAgo(p.createdAt)}</div>
                    </div>

                    <button onClick={() => setSelected(p)}
                      className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition">
                      <Eye className="w-3.5 h-3.5" /> View & Manage
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}