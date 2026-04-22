import React, { useState, useEffect, useContext, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';
import {
  Bell, BellOff, AlertTriangle, Info, CheckCircle, XCircle,
  Megaphone, Shield, Users, FileText, MessageSquare, Zap,
  RefreshCw, Filter, Search, Trash2, Check, X, ChevronDown,
  Clock, Eye, EyeOff, Star, Archive, Settings
} from 'lucide-react';

// ── Type config ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  emergency:   { icon:AlertTriangle, label:'Emergency',    dark:'text-red-400 bg-red-500/15 border-red-500/30',      light:'text-red-600 bg-red-50 border-red-200'      },
  alert:       { icon:Zap,           label:'Alert',         dark:'text-amber-400 bg-amber-500/15 border-amber-500/30', light:'text-amber-600 bg-amber-50 border-amber-200' },
  info:        { icon:Info,          label:'Info',          dark:'text-blue-400 bg-blue-500/15 border-blue-500/30',   light:'text-blue-600 bg-blue-50 border-blue-200'    },
  success:     { icon:CheckCircle,   label:'Success',       dark:'text-emerald-400 bg-emerald-500/15 border-emerald-500/30', light:'text-emerald-600 bg-emerald-50 border-emerald-200' },
  warning:     { icon:AlertTriangle, label:'Warning',       dark:'text-orange-400 bg-orange-500/15 border-orange-500/30', light:'text-orange-600 bg-orange-50 border-orange-200' },
  system:      { icon:Settings,      label:'System',        dark:'text-purple-400 bg-purple-500/15 border-purple-500/30', light:'text-purple-600 bg-purple-50 border-purple-200' },
  report:      { icon:FileText,      label:'Report',        dark:'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',   light:'text-cyan-600 bg-cyan-50 border-cyan-200'    },
  message:     { icon:MessageSquare, label:'Message',       dark:'text-indigo-400 bg-indigo-500/15 border-indigo-500/30', light:'text-indigo-600 bg-indigo-50 border-indigo-200' },
  volunteer:   { icon:Users,         label:'Volunteer',     dark:'text-teal-400 bg-teal-500/15 border-teal-500/30',   light:'text-teal-600 bg-teal-50 border-teal-200'    },
  announcement:{ icon:Megaphone,     label:'Announcement',  dark:'text-pink-400 bg-pink-500/15 border-pink-500/30',   light:'text-pink-600 bg-pink-50 border-pink-200'    },
};
const getType = (t) => TYPE_CONFIG[t] || TYPE_CONFIG.info;

const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d), now = new Date(), diff = now - dt;
  if (diff < 60000)     return 'Just now';
  if (diff < 3600000)   return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000)  return `${Math.floor(diff/3600000)}h ago`;
  if (diff < 604800000) return dt.toLocaleDateString('en-KE',{weekday:'short',hour:'2-digit',minute:'2-digit'});
  return dt.toLocaleDateString('en-KE',{month:'short',day:'numeric',year:'numeric'});
};

// ── Mock notifications (used when API not available) ─────────────────────
const MOCK = [
  { id:1,  type:'emergency',    title:'Flash Flood Warning — Nairobi',          body:'Water levels rising rapidly in Westlands and Parklands areas. Residents advised to evacuate to higher ground immediately.',                     isRead:false, createdAt: new Date(Date.now()-2*60000).toISOString(),    priority:'high'   },
  { id:2,  type:'alert',        title:'Earthquake Alert — Magnitude 4.2',       body:'Minor earthquake detected 45km south of Nairobi. No structural damage reported. Emergency teams on standby.',                                   isRead:false, createdAt: new Date(Date.now()-15*60000).toISOString(),   priority:'high'   },
  { id:3,  type:'announcement', title:'Volunteer Training This Saturday',        body:'All registered volunteers are required to attend the emergency response training at the CDRS headquarters, 9AM–5PM.',                           isRead:false, createdAt: new Date(Date.now()-2*3600000).toISOString(),  priority:'medium' },
  { id:4,  type:'success',      title:'Your Report #1045 Resolved',             body:'The fire incident you reported in Karen has been successfully addressed by response teams. Thank you for your swift report.',                    isRead:true,  createdAt: new Date(Date.now()-5*3600000).toISOString(),  priority:'low'    },
  { id:5,  type:'system',       title:'System Maintenance Tonight 11PM–1AM',    body:'CDRS platform will undergo scheduled maintenance. Some features may be unavailable. Emergency hotlines remain active.',                        isRead:true,  createdAt: new Date(Date.now()-86400000).toISOString(),   priority:'medium' },
  { id:6,  type:'info',         title:'New Resource Center Opened in Kibera',   body:'A new disaster response resource center has been established in Kibera. It stocks emergency supplies for up to 2,000 people.',                isRead:true,  createdAt: new Date(Date.now()-2*86400000).toISOString(), priority:'low'    },
  { id:7,  type:'warning',      title:'Drought Conditions — Northern Kenya',    body:'Meteorological department reports worsening drought conditions in Marsabit and Turkana. Aid distribution underway.',                           isRead:false, createdAt: new Date(Date.now()-3*86400000).toISOString(), priority:'high'   },
  { id:8,  type:'report',       title:'Monthly Incident Report Published',      body:'The April 2026 disaster incident summary is now available. 47 incidents recorded, 12 critical resolved.',                                      isRead:true,  createdAt: new Date(Date.now()-5*86400000).toISOString(), priority:'low'    },
  { id:9,  type:'volunteer',    title:'Your Volunteer Application Approved',     body:'Congratulations! Your volunteer application (VOL-A3F7K2) has been approved. Welcome to the CDRS response network.',                          isRead:false, createdAt: new Date(Date.now()-7*86400000).toISOString(), priority:'medium' },
  { id:10, type:'message',      title:'New message from Coordinator Mary',      body:'You have a new message regarding the Mathare flood response coordination. Please check your inbox.',                                           isRead:true,  createdAt: new Date(Date.now()-8*86400000).toISOString(), priority:'low'    },
];

// ══════════════════════════════════════════════════════════════════════════
export default function NotificationsPage() {
  const { user } = useContext(AuthContext);
  const { isDark } = useTheme();

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState('all');
  const [filterRead,    setFilterRead]    = useState('all'); // all | unread | read
  const [filterPriority,setFilterPriority]= useState('all');
  const [selected,      setSelected]      = useState(null);
  const [refreshing,    setRefreshing]    = useState(false);

  // Theme helpers
  const t = {
    bg:        isDark ? 'bg-slate-950'    : 'bg-gray-50',
    card:      isDark ? 'bg-slate-900 border-slate-800'   : 'bg-white border-gray-200',
    cardHover: isDark ? 'hover:bg-slate-800/60'           : 'hover:bg-gray-50',
    text:      isDark ? 'text-white'      : 'text-gray-900',
    sub:       isDark ? 'text-slate-400'  : 'text-gray-500',
    muted:     isDark ? 'text-slate-600'  : 'text-gray-400',
    input:     isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-600' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400',
    divider:   isDark ? 'border-slate-800' : 'border-gray-100',
    badge:     isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-gray-100 text-gray-500 border-gray-200',
    tab:       isDark ? 'bg-slate-800 border-slate-700'  : 'bg-gray-100 border-gray-200',
    tabActive: isDark ? 'bg-blue-600 text-white'          : 'bg-blue-600 text-white',
  };

  // Load notifications
  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(Array.isArray(res.data) ? res.data : MOCK);
    } catch {
      setNotifications(MOCK); // fallback to mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30s
  useEffect(() => {
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setTimeout(() => setRefreshing(false), 600);
  };

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try { await api.put(`/notifications/${id}/read`); } catch {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try { await api.put('/notifications/read-all'); } catch {}
  };

  const deleteNotif = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (selected?.id === id) setSelected(null);
    try { await api.delete(`/notifications/${id}`); } catch {}
  };

  const clearAll = () => {
    if (!window.confirm('Clear all notifications?')) return;
    setNotifications([]);
    setSelected(null);
  };

  const openNotif = (n) => {
    setSelected(n);
    if (!n.isRead) markRead(n.id);
  };

  // Filter
  const filtered = notifications.filter(n => {
    if (filterType     !== 'all' && n.type       !== filterType)     return false;
    if (filterRead     === 'unread' && n.isRead)                     return false;
    if (filterRead     === 'read'   && !n.isRead)                    return false;
    if (filterPriority !== 'all' && n.priority   !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      return n.title?.toLowerCase().includes(q) || n.body?.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const emergencyCount = notifications.filter(n => n.type === 'emergency' && !n.isRead).length;

  return (
    <>
      <Navbar />
      <div className={`min-h-screen ${t.bg} pt-16 transition-colors duration-200`}>

        {/* Hero */}
        <div className={`border-b ${isDark ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800' : 'bg-white border-gray-200'}`}>
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className={`text-xs uppercase tracking-widest font-bold ${t.muted}`}>Notifications Center</span>
                </div>
                <h1 className={`text-3xl font-black tracking-tight ${t.text}`}>Alerts & Notifications</h1>
                <p className={`text-sm mt-1 ${t.sub}`}>
                  Real-time updates on disasters, reports, and system activity
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {emergencyCount > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-500/15 border border-red-500/30 rounded-xl animate-pulse">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold text-red-400">{emergencyCount} Active Emergency</span>
                  </div>
                )}
                {unreadCount > 0 && (
                  <span className="px-3 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-full">
                    {unreadCount} unread
                  </span>
                )}
                <button onClick={markAllRead} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <Check className="w-4 h-4" /> Mark all read
                </button>
                <button onClick={refresh} disabled={refreshing} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6" style={{ minHeight: '70vh' }}>

            {/* Left — list */}
            <div className="flex-1 min-w-0 space-y-4">

              {/* Filters */}
              <div className={`rounded-2xl border p-4 space-y-3 ${t.card}`}>
                <div className="flex flex-wrap gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.muted}`} />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search notifications…"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:ring-2 focus:ring-blue-500 focus:outline-none ${t.input}`} />
                  </div>
                  {/* Read filter */}
                  <div className="relative">
                    <select value={filterRead} onChange={e => setFilterRead(e.target.value)}
                      className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm border focus:outline-none cursor-pointer ${t.input}`}>
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
                    <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.muted}`} />
                  </div>
                  {/* Priority filter */}
                  <div className="relative">
                    <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                      className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm border focus:outline-none cursor-pointer ${t.input}`}>
                      <option value="all">All Priority</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <ChevronDown className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${t.muted}`} />
                  </div>
                  <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 transition">
                    <Trash2 className="w-4 h-4" /> Clear all
                  </button>
                </div>

                {/* Type filter pills */}
                <div className="flex flex-wrap gap-2">
                  {['all', ...Object.keys(TYPE_CONFIG)].map(type => {
                    const cfg = type === 'all' ? null : getType(type);
                    const count = type === 'all'
                      ? notifications.length
                      : notifications.filter(n => n.type === type).length;
                    if (count === 0 && type !== 'all') return null;
                    return (
                      <button key={type} onClick={() => setFilterType(type)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          filterType === type
                            ? isDark ? 'bg-blue-600 border-blue-500 text-white' : 'bg-blue-600 border-blue-600 text-white'
                            : isDark ? 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}>
                        {cfg && <cfg.icon className="w-3 h-3" />}
                        {type === 'all' ? 'All' : cfg.label}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filterType === type ? 'bg-white/20' : isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification list */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
                    <div className="absolute inset-1 rounded-full border-4 border-t-blue-500 border-transparent animate-spin" />
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className={`rounded-2xl border p-16 text-center ${t.card}`}>
                  <BellOff className={`w-12 h-12 mx-auto mb-3 ${t.muted}`} />
                  <p className={`font-semibold ${t.sub}`}>No notifications</p>
                  <p className={`text-sm mt-1 ${t.muted}`}>You're all caught up!</p>
                </div>
              ) : (
                <div className={`rounded-2xl border overflow-hidden ${t.card}`}>
                  {filtered.map((n, i) => {
                    const cfg = getType(n.type);
                    const Icon = cfg.icon;
                    const isSelected = selected?.id === n.id;
                    const colorClass = isDark ? cfg.dark : cfg.light;
                    return (
                      <div key={n.id}
                        onClick={() => openNotif(n)}
                        className={`flex items-start gap-4 px-5 py-4 cursor-pointer transition-all border-b last:border-b-0 ${t.divider} ${
                          isSelected
                            ? isDark ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'bg-blue-50 border-l-2 border-l-blue-500'
                            : t.cardHover
                        } ${!n.isRead ? isDark ? 'bg-slate-800/40' : 'bg-blue-50/40' : ''}`}>

                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 mt-0.5 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className={`text-sm font-semibold leading-snug ${!n.isRead ? t.text : t.sub}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                              <span className={`text-xs ${t.muted}`}>{fmtTime(n.createdAt)}</span>
                            </div>
                          </div>
                          <p className={`text-xs line-clamp-2 leading-relaxed ${t.muted}`}>{n.body}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorClass}`}>
                              <Icon className="w-2.5 h-2.5" />{cfg.label}
                            </span>
                            {n.priority === 'high' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">HIGH</span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition" onClick={e => e.stopPropagation()}>
                          <button onClick={() => deleteNotif(n.id)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-700 text-slate-600 hover:text-red-400' : 'hover:bg-red-50 text-gray-300 hover:text-red-500'}`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right — detail panel */}
            <div className="hidden lg:block w-96 flex-shrink-0">
              <div className={`rounded-2xl border sticky top-24 ${t.card}`}>
                {selected ? (() => {
                  const cfg = getType(selected.type);
                  const Icon = cfg.icon;
                  const colorClass = isDark ? cfg.dark : cfg.light;
                  return (
                    <div className="flex flex-col h-full">
                      {/* Header */}
                      <div className={`px-5 py-4 border-b ${t.divider} flex items-center justify-between`}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />{cfg.label}
                        </span>
                        <button onClick={() => setSelected(null)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-slate-700 text-slate-500' : 'hover:bg-gray-100 text-gray-400'}`}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Body */}
                      <div className="p-5 space-y-4">
                        <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-6 h-6" />
                        </div>
                        <h2 className={`text-lg font-bold leading-snug ${t.text}`}>{selected.title}</h2>
                        <p className={`text-sm leading-relaxed ${t.sub}`}>{selected.body}</p>

                        <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                          {[
                            { label:'Type',     value:cfg.label },
                            { label:'Priority', value:selected.priority || 'normal' },
                            { label:'Time',     value:fmtTime(selected.createdAt) },
                            { label:'Status',   value:selected.isRead ? 'Read' : 'Unread' },
                          ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-sm">
                              <span className={t.muted}>{label}</span>
                              <span className={`font-medium capitalize ${t.sub}`}>{value}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          {!selected.isRead && (
                            <button onClick={() => markRead(selected.id)}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition">
                              <Eye className="w-4 h-4" /> Mark Read
                            </button>
                          )}
                          <button onClick={() => deleteNotif(selected.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200'}`}>
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })() : (
                  <div className="p-8 text-center">
                    <Bell className={`w-12 h-12 mx-auto mb-3 ${t.muted}`} />
                    <p className={`font-semibold text-sm ${t.sub}`}>Select a notification</p>
                    <p className={`text-xs mt-1 ${t.muted}`}>Click any item to read details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}