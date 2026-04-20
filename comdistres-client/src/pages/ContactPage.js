import React, { useState, useContext, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import {
  Mail, Phone, MapPin, Send, Clock, AlertCircle, Inbox,
  MessageSquare, ChevronDown, X, Check, Search,
  RefreshCw, Eye, Reply, Trash2, ExternalLink,
  Shield, Users, Globe, Twitter, Facebook, Youtube,
  CheckCircle, Loader, Star, Archive,
  ChevronRight, Info, Activity
} from 'lucide-react';

// ─── Config ────────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
  emergency:   { icon:'🚨', label:'Emergency',    color:'text-red-400',    bg:'bg-red-500/15    border-red-500/30'    },
  volunteer:   { icon:'🤝', label:'Volunteer',     color:'text-emerald-400',bg:'bg-emerald-500/15 border-emerald-500/30'},
  partnership: { icon:'🏛️', label:'Partnership',   color:'text-blue-400',   bg:'bg-blue-500/15   border-blue-500/30'  },
  general:     { icon:'💬', label:'General',       color:'text-slate-400',  bg:'bg-slate-500/15  border-slate-500/30' },
  feedback:    { icon:'⭐', label:'Feedback',      color:'text-yellow-400', bg:'bg-yellow-500/15 border-yellow-500/30'},
  technical:   { icon:'🔧', label:'Technical',     color:'text-purple-400', bg:'bg-purple-500/15 border-purple-500/30'},
};
const STATUS_CONFIG = {
  new:      { label:'New',     pill:'bg-blue-500/20 text-blue-300',      dot:'bg-blue-500'    },
  read:     { label:'Read',    pill:'bg-slate-700 text-slate-400',        dot:'bg-slate-600'   },
  replied:  { label:'Replied', pill:'bg-emerald-500/20 text-emerald-300', dot:'bg-emerald-500' },
  archived: { label:'Archived',pill:'bg-slate-800 text-slate-500',        dot:'bg-slate-700'   },
};
const getType   = (t) => TYPE_CONFIG[t]   || TYPE_CONFIG.general;
const getStatus = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.read;
const timeAgo   = (d) => {
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ─── Reply Modal ───────────────────────────────────────────────────────────
function ReplyModal({ msg, onClose, onSend }) {
  const [text, setText] = useState(msg.reply || '');
  const [sending, setSending] = useState(false);
  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    await onSend(msg.id, text.trim());
    setSending(false);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white flex items-center gap-2"><Reply className="w-4 h-4 text-blue-400" /> Reply to {msg.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-500 mb-1">Original · {msg.subject}</p>
            <p className="text-sm text-slate-300 line-clamp-3">{msg.message}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Mail className="w-4 h-4" />
            <span>To: <span className="text-slate-200 font-medium">{msg.name}</span> — {msg.email}</span>
          </div>
          <textarea value={text} onChange={e => setText(e.target.value)} rows={5} autoFocus
            placeholder="Type your reply…"
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
            <button onClick={handleSend} disabled={!text.trim() || sending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center gap-2">
              {sending ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message Detail ────────────────────────────────────────────────────────
function MessageDetail({ msg, onClose, onReply, onStar, onArchive, onDelete }) {
  const t = getType(msg.type);
  const s = getStatus(msg.status);
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${t.bg} ${t.color}`}>
          <span>{t.icon}</span> {t.label}
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onStar(msg.id)} className={`p-1.5 rounded-lg hover:bg-slate-700 transition ${msg.starred ? 'text-yellow-400' : 'text-slate-600'}`}>
            <Star className="w-4 h-4" />
          </button>
          <button onClick={() => onArchive(msg.id)} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-600 hover:text-slate-300 transition">
            <Archive className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(msg.id)} className="p-1.5 rounded-lg hover:bg-red-900/40 text-slate-600 hover:text-red-400 transition">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-500 hover:text-slate-300 transition ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <h2 className="text-lg font-bold text-white">{msg.subject}</h2>
        <div className="flex items-center gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {msg.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">{msg.name}</p>
            <p className="text-xs text-slate-400">{msg.email}</p>
            {msg.phone && <p className="text-xs text-slate-500">{msg.phone}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${s.pill}`}>{s.label}</span>
            <p className="text-xs text-slate-600 mt-1">{timeAgo(msg.createdAt)}</p>
          </div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
        </div>
        {msg.reply && (
          <div className="border-l-4 border-blue-500 bg-blue-500/5 rounded-r-xl p-4">
            <p className="text-xs text-blue-400 font-semibold mb-2 flex items-center gap-1"><Reply className="w-3 h-3" /> Your Reply</p>
            <p className="text-sm text-slate-300 leading-relaxed">{msg.reply}</p>
          </div>
        )}
      </div>
      <div className="p-5 border-t border-slate-800 flex-shrink-0 space-y-2">
        <button onClick={() => onReply(msg)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition">
          <Reply className="w-4 h-4" /> Reply to {msg.name}
        </button>
        {msg.email && (
          <a href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm border border-slate-700 transition">
            <ExternalLink className="w-3.5 h-3.5" /> Open in Email Client
          </a>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function ContactPage() {
  const { user } = useContext(AuthContext);
  const isAdmin = user && (user.role === 1 || user.role === 2);

  // ── Form ────────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({ name:'',email:'',phone:'',subject:'',message:'',type:'general' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [formError,  setFormError]  = useState('');

  // ── Inbox ────────────────────────────────────────────────────────────────
  const [showInbox,   setShowInbox]   = useState(false);
  const [messages,    setMessages]    = useState([]);
  const [inboxLoading,setInboxLoading]= useState(false);
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [inboxSearch, setInboxSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [inboxType,   setInboxType]   = useState('all');
  const [openFaq,     setOpenFaq]     = useState(null);

  // ── Fetch messages from DB ──────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    if (!isAdmin) return;
    setInboxLoading(true);
    try {
      const res = await api.get('/contact/messages');
      setMessages(res.data);
      // Refresh selectedMsg if open
      if (selectedMsg) {
        const fresh = res.data.find(m => m.id === selectedMsg.id);
        if (fresh) setSelectedMsg(fresh);
      }
    } catch (err) {
      console.error('fetchMessages error:', err);
    } finally {
      setInboxLoading(false);
    }
  }, [isAdmin, selectedMsg?.id]);

  // Load on mount + when inbox opens + auto-refresh every 15s
  useEffect(() => {
    if (isAdmin && showInbox) {
      fetchMessages();
      const iv = setInterval(fetchMessages, 15000);
      return () => clearInterval(iv);
    }
  }, [isAdmin, showInbox]);

  const unreadCount = messages.filter(m => m.status === 'new').length;

  const filteredMessages = messages.filter(m => {
    if (inboxFilter === 'unread'   && m.status !== 'new')      return false;
    if (inboxFilter === 'starred'  && !m.starred)               return false;
    if (inboxFilter === 'archived' && m.status !== 'archived')  return false;
    if (inboxFilter === 'all'      && m.status === 'archived')  return false;
    if (inboxType   !== 'all'      && m.type !== inboxType)     return false;
    if (inboxSearch) {
      const q = inboxSearch.toLowerCase();
      return m.name?.toLowerCase().includes(q) || m.subject?.toLowerCase().includes(q) || m.message?.toLowerCase().includes(q);
    }
    return true;
  });

  const openMessage = async (msg) => {
    setSelectedMsg(msg);
    if (msg.status === 'new') {
      try {
        await api.put(`/contact/messages/${msg.id}/status`, { status: 'read' });
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'read' } : m));
        setSelectedMsg({ ...msg, status: 'read' });
      } catch {}
    }
  };

  const handleReply = async (id, text) => {
    try {
      const res = await api.put(`/contact/messages/${id}/reply`, { reply: text });
      const updated = res.data;
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
      if (selectedMsg?.id === id) setSelectedMsg(updated);
    } catch (err) {
      alert('Failed to send reply: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStar = async (id) => {
    try {
      const res = await api.put(`/contact/messages/${id}/star`);
      const updated = res.data;
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
      if (selectedMsg?.id === id) setSelectedMsg(updated);
    } catch {}
  };

  const handleArchive = async (id) => {
    try {
      await api.put(`/contact/messages/${id}/status`, { status: 'archived' });
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: 'archived' } : m));
      if (selectedMsg?.id === id) setSelectedMsg(null);
    } catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this message permanently?')) return;
    try {
      await api.delete(`/contact/messages/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
      if (selectedMsg?.id === id) setSelectedMsg(null);
    } catch {}
  };

  // ── Form submit — saves to DB ───────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.post('/contact/submit', formData);
      setSubmitted(true);
      setFormData({ name:'',email:'',phone:'',subject:'',message:'',type:'general' });
      setTimeout(() => setSubmitted(false), 5000);
      // Refresh inbox if open
      if (isAdmin && showInbox) fetchMessages();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to send. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const FAQS = [
    { q:'How quickly will I get a response?', a:'Emergency reports: within 15 minutes. General inquiries: within 24 business hours. Volunteer enquiries: within 48 hours.' },
    { q:'Can I report an emergency through this form?', a:'For life-threatening emergencies call 999 or 112 immediately. Use the "Report Emergency" button on our platform for disaster reporting.' },
    { q:'Is this service available 24/7?', a:'Our emergency hotline and reporting system operate around the clock. Office hours (8AM–5PM Mon–Fri) apply only to non-emergency administrative matters.' },
    { q:'How do I track my submitted inquiry?', a:'You will receive an email confirmation with a reference number. You can also log in and check the status from your dashboard.' },
    { q:'How can I volunteer?', a:'Select "Volunteer Opportunity" as the inquiry type, or use the dedicated Volunteer Application page for a full application.' },
    { q:'Can organisations donate resources?', a:'Yes! Select "Partnership" or use the dedicated Partner With Us page. We coordinate in-kind donations including food, medical supplies, shelter materials, and transport.' },
  ];

  return (
    <>
      <Navbar />
      {replyTarget && (
        <ReplyModal msg={replyTarget} onClose={() => setReplyTarget(null)} onSend={handleReply} />
      )}
      
      <div className="min-h-screen bg-slate-950 pt-16">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize:'40px 40px' }} />
          <div className="relative max-w-7xl mx-auto px-4 py-14">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">24/7 Support</span>
                </div>
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Contact & Support</h1>
                <p className="text-slate-400 text-lg max-w-xl">Emergency response coordination, volunteer management, and community support.</p>
              </div>
              {isAdmin && (
                <button onClick={() => { setShowInbox(s => !s); if (!showInbox) fetchMessages(); }}
                  className={`relative flex items-center gap-3 px-6 py-4 rounded-2xl border font-bold text-base transition-all shadow-lg ${
                    showInbox ? 'bg-blue-600 border-blue-500 text-white shadow-blue-900/50'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}>
                  <Inbox className="w-5 h-5" />
                  Message Inbox
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                { label:'Emergency', number:'999',             color:'bg-red-600/20   border-red-600/40  text-red-300' },
                { label:'Ambulance', number:'112',             color:'bg-pink-600/20  border-pink-600/40 text-pink-300' },
                { label:'CDRS Hotline', number:'+254 700 123 456', color:'bg-emerald-600/20 border-emerald-600/40 text-emerald-300' },
              ].map(({ label, number, color }) => (
                <a key={label} href={`tel:${number.replace(/\s/g,'')}`}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border font-semibold text-sm transition hover:scale-105 ${color}`}>
                  <Phone className="w-4 h-4" />
                  <span className="text-slate-500 text-xs">{label}</span>
                  <span>{number}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-10">

          {/* ══ INBOX PANEL ══════════════════════════════════════════ */}
          {isAdmin && showInbox && (
            <div className="mb-10 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <Inbox className="w-5 h-5 text-blue-400" />
                  <h2 className="font-bold text-white">Message Inbox</h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded-full">{unreadCount} new</span>
                  )}
                  <span className="text-xs text-slate-600">· synced with database · auto-refreshes every 15s</span>
                </div>
                <button onClick={fetchMessages} disabled={inboxLoading}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition disabled:opacity-40">
                  <RefreshCw className={`w-3.5 h-3.5 ${inboxLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                  <input value={inboxSearch} onChange={e => setInboxSearch(e.target.value)}
                    placeholder="Search messages…"
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 placeholder-slate-600 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {['all','unread','starred','archived'].map(f => (
                    <button key={f} onClick={() => setInboxFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition capitalize ${
                        inboxFilter === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300 border border-slate-700'
                      }`}>{f}</button>
                  ))}
                </div>
                <div className="relative">
                  <select value={inboxType} onChange={e => setInboxType(e.target.value)}
                    className="appearance-none pl-3 pr-7 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg text-xs focus:outline-none cursor-pointer">
                    <option value="all">All Types</option>
                    {Object.entries(TYPE_CONFIG).map(([v,{label}]) => <option key={v} value={v}>{label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-slate-600" />
                </div>
              </div>

              {/* Inbox body */}
              <div className="flex" style={{ minHeight: 420, maxHeight: 560 }}>
                <div className={`border-r border-slate-800 overflow-y-auto flex-shrink-0 ${selectedMsg ? 'w-72' : 'flex-1'}`}>
                  {inboxLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-slate-600 gap-2">
                      <Loader className="w-5 h-5 animate-spin" /> Loading…
                    </div>
                  ) : filteredMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-600">
                      <Inbox className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">No messages</p>
                    </div>
                  ) : filteredMessages.map(msg => {
                    const t = getType(msg.type);
                    const isSelected = selectedMsg?.id === msg.id;
                    const isNew = msg.status === 'new';
                    return (
                      <button key={msg.id} onClick={() => openMessage(msg)}
                        className={`w-full text-left px-4 py-3.5 border-b border-slate-800/60 transition-all ${
                          isSelected ? 'bg-blue-600/15 border-l-2 border-l-blue-500' : 'hover:bg-slate-800/40'
                        }`}>
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5">
                            {msg.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className={`text-sm font-semibold truncate ${isNew ? 'text-white' : 'text-slate-300'}`}>{msg.name}</span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {msg.starred && <Star className="w-3 h-3 text-yellow-400 fill-current" />}
                                {isNew && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                                <span className="text-xs text-slate-600">{timeAgo(msg.createdAt)}</span>
                              </div>
                            </div>
                            <p className={`text-xs truncate mb-1 ${isNew ? 'text-slate-300 font-medium' : 'text-slate-500'}`}>{msg.subject}</p>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${t.bg} ${t.color}`}>{t.icon}</span>
                              {msg.status === 'replied' && (
                                <span className="text-[10px] text-emerald-500 font-semibold flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" /> replied
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedMsg && (
                  <div className="flex-1 overflow-hidden">
                    <MessageDetail msg={selectedMsg} onClose={() => setSelectedMsg(null)}
                      onReply={m => setReplyTarget(m)} onStar={handleStar}
                      onArchive={handleArchive} onDelete={handleDelete} />
                  </div>
                )}
                {!selectedMsg && filteredMessages.length > 0 && (
                  <div className="hidden lg:flex flex-1 items-center justify-center text-slate-700 flex-col gap-3">
                    <MessageSquare className="w-12 h-12 opacity-20" />
                    <p className="text-sm">Select a message to read</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left sidebar */}
            <div className="space-y-5">
              <div className="bg-red-950/40 border border-red-900/60 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <h2 className="font-bold text-red-300">Emergency Numbers</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label:'General Emergency', number:'999',             sub:'Police, Fire, Ambulance' },
                    { label:'Ambulance Direct',   number:'112',             sub:'Medical emergencies'    },
                    { label:'CDRS Hotline',       number:'+254 700 123 456',sub:'24/7 disaster response' },
                  ].map(({ label, number, sub }) => (
                    <a key={label} href={`tel:${number.replace(/\s/g,'')}`}
                      className="flex items-center justify-between p-3 bg-red-900/20 hover:bg-red-900/40 rounded-xl transition border border-red-900/30 group">
                      <div>
                        <p className="text-xs text-red-400/70 font-medium">{label}</p>
                        <p className="font-bold text-red-200 text-sm">{number}</p>
                        <p className="text-xs text-red-500">{sub}</p>
                      </div>
                      <Phone className="w-4 h-4 text-red-600 group-hover:text-red-400 transition" />
                    </a>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <h2 className="font-bold text-white text-sm uppercase tracking-wider">Contact Information</h2>
                {[
                  { icon:Mail,   label:'Email',        lines:['support@cdrs.org','emergency@cdrs.org'] },
                  { icon:Phone,  label:'Phone',        lines:['+254 700 123 456','+254 733 456 789'] },
                  { icon:MapPin, label:'Address',      lines:['Community Disaster Response Center','Nairobi, Kenya · P.O. Box 12345-00100'] },
                  { icon:Clock,  label:'Office Hours', lines:['Mon–Fri: 8:00 AM – 5:00 PM','Emergency line: 24/7'] },
                ].map(({ icon:Icon, label, lines }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                      {lines.map((l,i) => <p key={i} className="text-sm text-slate-300">{l}</p>)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-emerald-300 text-sm">Response Guarantee</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label:'Emergency reports',color:'text-red-400',   time:'≤ 15 min' },
                    { label:'General inquiries',color:'text-yellow-400',time:'≤ 24 hrs' },
                    { label:'Volunteer queries',color:'text-blue-400',  time:'≤ 48 hrs' },
                    { label:'Partnerships',     color:'text-purple-400',time:'≤ 72 hrs' },
                  ].map(({ label, color, time }) => (
                    <div key={label} className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className={`font-bold ${color}`}>{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: form + FAQ */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-800">
                  <h2 className="text-xl font-bold text-white">Send a Message</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Saved directly to our database and visible in the inbox above.</p>
                </div>
                <div className="p-7">
                  {submitted && (
                    <div className="mb-5 p-4 bg-emerald-950/50 border border-emerald-800 rounded-xl flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-emerald-300">Message sent successfully!</p>
                        <p className="text-emerald-500 text-xs mt-0.5">We shall respond to you soon</p>
                      </div>
                    </div>
                  )}
                  {formError && (
                    <div className="mb-5 p-4 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-sm">{formError}</div>
                  )}
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {[
                        { key:'name', label:'Full Name *', type:'text', placeholder:'Your full name', req:true },
                        { key:'email',label:'Email *',     type:'email',placeholder:'your@email.com', req:true },
                        { key:'phone',label:'Phone',       type:'tel', placeholder:'+254 7XX XXX XXX',req:false },
                      ].map(({ key, label, type, placeholder, req }) => (
                        <div key={key}>
                          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">{label}</label>
                          <input type={type} required={req} value={formData[key]}
                            onChange={e => setFormData(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Inquiry Type *</label>
                        <div className="relative">
                          <select required value={formData.type} onChange={e => setFormData(f => ({...f,type:e.target.value}))}
                            className="appearance-none w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                            {Object.entries(TYPE_CONFIG).map(([v,{icon,label}]) => <option key={v} value={v}>{icon} {label}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Subject *</label>
                      <input type="text" required value={formData.subject}
                        onChange={e => setFormData(f => ({...f,subject:e.target.value}))}
                        placeholder="Brief subject of your message"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Message *</label>
                      <textarea required rows={5} value={formData.message}
                        onChange={e => setFormData(f => ({...f,message:e.target.value}))}
                        placeholder="Please provide as much detail as possible…"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none" />
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                      <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500">Your information is stored securely and used only to respond to your inquiry.</p>
                    </div>
                    <button type="submit" disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold transition">
                      {submitting ? <><Loader className="w-5 h-5 animate-spin" /> Sending…</> : <><Send className="w-5 h-5" /> Send Message</>}
                    </button>
                  </form>
                </div>
              </div>

              {/* FAQ */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="px-7 py-5 border-b border-slate-800">
                  <h3 className="font-bold text-white text-lg">Frequently Asked Questions</h3>
                </div>
                <div className="divide-y divide-slate-800">
                  {FAQS.map((faq, i) => (
                    <div key={i}>
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex items-center justify-between px-7 py-4 text-left hover:bg-slate-800/50 transition">
                        <span className={`text-sm font-semibold pr-4 ${openFaq === i ? 'text-blue-300' : 'text-slate-300'}`}>{faq.q}</span>
                        {openFaq === i ? <ChevronDown className="w-4 h-4 text-blue-400 flex-shrink-0 rotate-180" /> : <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                      </button>
                      {openFaq === i && <div className="px-7 pb-4"><p className="text-sm text-slate-400 leading-relaxed">{faq.a}</p></div>}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon:Users, title:'Become a Volunteer', desc:'Join our network of trained emergency responders.', btn:'Apply Now', color:'from-emerald-900/40 to-emerald-950/60 border-emerald-900/50', btnColor:'bg-emerald-600 hover:bg-emerald-500 text-white', href:'/volunteer-apply' },
                  { icon:Shield,title:'Partner With Us',    desc:'Organisations, NGOs, and government bodies can collaborate with CDRS.', btn:'Get in Touch', color:'from-blue-900/40 to-blue-950/60 border-blue-900/50', btnColor:'bg-blue-600 hover:bg-blue-500 text-white', href:'/partner' },
                ].map(({ icon:Icon, title, desc, btn, color, btnColor, href }) => (
                  <div key={title} className={`bg-gradient-to-br ${color} border rounded-2xl p-6 flex flex-col gap-4 transition-all hover:border-opacity-80`}>
                    <Icon className="w-8 h-8 text-slate-300 opacity-70" />
                    <div>
                      <h4 className="font-bold text-white text-base">{title}</h4>
                      <p className="text-slate-400 text-sm mt-1">{desc}</p>
                    </div>
                    <a href={href} className={`self-start flex items-center gap-2 px-4 py-2 ${btnColor} rounded-xl text-sm font-semibold transition`}>
                      {btn} <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}