import React, { useState, useRef, useContext } from 'react';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import {
  Package, Truck, Users, Heart, Activity, Shield, Wrench,
  Radio, FileText, Download, Upload, Search, Filter,
  Eye, Trash2, Plus, X, Check, ChevronDown, MapPin,
  AlertTriangle, Clock, RefreshCw, ExternalLink,
  BookOpen, Video, Globe, Phone, Star, Lock,
  BarChart2, TrendingUp, Zap, Database
} from 'lucide-react';

const DOCS_KEY = 'cdrs_documents';
const loadDocs = () => {
  try { return JSON.parse(localStorage.getItem(DOCS_KEY) || 'null') || getDefaultDocs(); }
  catch { return getDefaultDocs(); }
};
const saveDocs = (d) => { try { localStorage.setItem(DOCS_KEY, JSON.stringify(d)); } catch {} };

function getDefaultDocs() {
  return [
    { id:1, name:'Emergency Response Protocol', category:'protocols', type:'PDF', size:'2.5 MB', description:'Standard operating procedures for all emergency response scenarios.', access:'public', downloads:142, uploadedAt:'2025-01-15', uploadedBy:'Admin', url:null },
    { id:2, name:'Volunteer Training Manual', category:'training', type:'PDF', size:'4.1 MB', description:'Comprehensive guide for new volunteer orientation and field operations.', access:'public', downloads:89, uploadedAt:'2025-02-03', uploadedBy:'Admin', url:null },
    { id:3, name:'Disaster Preparedness Guide', category:'guides', type:'PDF', size:'3.2 MB', description:'Community guide for preparing households and businesses for disasters.', access:'public', downloads:317, uploadedAt:'2025-01-28', uploadedBy:'Admin', url:null },
    { id:4, name:'Communication Procedures', category:'protocols', type:'PDF', size:'1.8 MB', description:'Radio protocols, chain of command, and inter-agency communication standards.', access:'public', downloads:56, uploadedAt:'2025-03-01', uploadedBy:'Coordinator', url:null },
    { id:5, name:'Resource Allocation Guidelines', category:'guides', type:'PDF', size:'2.1 MB', description:'Framework for equitable and effective distribution of emergency resources.', access:'restricted', downloads:34, uploadedAt:'2025-02-14', uploadedBy:'Admin', url:null },
    { id:6, name:'Safety Protocols Handbook', category:'training', type:'PDF', size:'3.7 MB', description:'Personal safety requirements for all field responders and volunteers.', access:'public', downloads:201, uploadedAt:'2025-01-10', uploadedBy:'Admin', url:null },
    { id:7, name:'Flood Response Checklist', category:'checklists', type:'PDF', size:'0.9 MB', description:'Step-by-step checklist for coordinating flood emergency response.', access:'public', downloads:78, uploadedAt:'2025-02-20', uploadedBy:'Coordinator', url:null },
    { id:8, name:'Medical Triage Guidelines', category:'medical', type:'PDF', size:'1.5 MB', description:'START triage system guidelines for mass casualty incidents.', access:'restricted', downloads:45, uploadedAt:'2025-03-05', uploadedBy:'Admin', url:null },
  ];
}

const INVENTORY = {
  equipment: [
    { name:'Fire Extinguishers',     qty:150, location:'Central Warehouse',       status:'available', condition:'good'      },
    { name:'First Aid Kits',         qty:200, location:'Multiple Depots',          status:'available', condition:'excellent' },
    { name:'Rescue Tools',           qty:50,  location:'Fire Stations',            status:'available', condition:'good'      },
    { name:'Emergency Generators',   qty:30,  location:'Power Stations',           status:'available', condition:'good'      },
    { name:'Water Pumps',            qty:45,  location:'Flood Response Units',     status:'available', condition:'good'      },
    { name:'Communication Radios',   qty:100, location:'Coordination Centers',     status:'available', condition:'excellent' },
    { name:'Thermal Cameras',        qty:12,  location:'Rescue Units',             status:'available', condition:'excellent' },
    { name:'Rope & Harness Sets',    qty:60,  location:'Mountain Rescue Depot',    status:'limited',   condition:'good'      },
  ],
  vehicles: [
    { name:'Ambulances',             qty:25,  location:'Medical Centers',          status:'ready',     condition:'excellent' },
    { name:'Fire Trucks',            qty:15,  location:'Fire Stations',            status:'ready',     condition:'good'      },
    { name:'Rescue Vehicles',        qty:20,  location:'Response Depots',          status:'ready',     condition:'good'      },
    { name:'Supply Trucks',          qty:10,  location:'Central Depot',            status:'ready',     condition:'good'      },
    { name:'Mobile Command Units',   qty:5,   location:'Headquarters',             status:'ready',     condition:'excellent' },
    { name:'Boats (Inflatable)',     qty:18,  location:'Flood Response Base',      status:'ready',     condition:'good'      },
    { name:'Helicopters',            qty:2,   location:'Wilson Airport',           status:'standby',   condition:'excellent' },
  ],
  medical: [
    { name:'Medical Personnel',      qty:150, location:'Hospitals',                status:'on-call',   condition:'—' },
    { name:'Emergency Beds',         qty:300, location:'Medical Facilities',       status:'available', condition:'—' },
    { name:'Oxygen Supplies',        qty:500, location:'Medical Centers',          status:'stocked',   condition:'good' },
    { name:'Trauma Kits',            qty:100, location:'Ambulances',               status:'ready',     condition:'good' },
    { name:'Defibrillators',         qty:75,  location:'Emergency Units',          status:'operational',condition:'excellent' },
    { name:'Blood Pressure Monitors',qty:80,  location:'Clinics',                  status:'available', condition:'good' },
    { name:'Stretchers',             qty:120, location:'Hospitals & Depots',       status:'available', condition:'good' },
  ],
  supplies: [
    { name:'Food Rations (Emergency)',qty:5000,location:'Central Storage',         status:'stocked',   condition:'—' },
    { name:'Water Bottles (Cases)',  qty:3000, location:'Distribution Points',     status:'available', condition:'—' },
    { name:'Blankets',               qty:2000, location:'Relief Centers',          status:'available', condition:'good' },
    { name:'Tents / Shelters',       qty:200,  location:'Emergency Camps',         status:'available', condition:'good' },
    { name:'Hygiene Kits',           qty:1500, location:'Distribution Centers',    status:'stocked',   condition:'—' },
    { name:'Solar Lanterns',         qty:600,  location:'Relief Stores',           status:'available', condition:'good' },
    { name:'Portable Toilets',       qty:80,   location:'Field Operations Base',   status:'limited',   condition:'good' },
  ],
};

const STATUS_STYLE = {
  available:   'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  ready:       'bg-blue-500/15    text-blue-300    border-blue-500/30',
  stocked:     'bg-teal-500/15    text-teal-300    border-teal-500/30',
  limited:     'bg-amber-500/15   text-amber-300   border-amber-500/30',
  standby:     'bg-purple-500/15  text-purple-300  border-purple-500/30',
  'on-call':   'bg-yellow-500/15  text-yellow-300  border-yellow-500/30',
  operational: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

const COND_STYLE = { excellent:'text-emerald-400', good:'text-blue-400', fair:'text-amber-400', '—':'text-slate-600' };

const CAT_DOC_STYLE = {
  protocols:  { color:'text-red-400',    bg:'bg-red-500/10    border-red-500/30'    },
  training:   { color:'text-blue-400',   bg:'bg-blue-500/10   border-blue-500/30'   },
  guides:     { color:'text-emerald-400',bg:'bg-emerald-500/10 border-emerald-500/30'},
  checklists: { color:'text-amber-400',  bg:'bg-amber-500/10  border-amber-500/30'  },
  medical:    { color:'text-pink-400',   bg:'bg-pink-500/10   border-pink-500/30'   },
  other:      { color:'text-slate-400',  bg:'bg-slate-500/10  border-slate-500/30'  },
};

const ORGS = [
  { name:'Kenya Red Cross',             role:'Primary Emergency Response Partner', contact:'+254 703 037 000', icon:'🔴', color:'bg-red-500/10    border-red-500/30'    },
  { name:'St. John Ambulance',          role:'Emergency Medical Services',         contact:'+254 720 221 992', icon:'⚕️', color:'bg-blue-500/10   border-blue-500/30'   },
  { name:'Nairobi Fire Brigade',        role:'Fire & Rescue Operations',           contact:'999',             icon:'🔥', color:'bg-orange-500/10 border-orange-500/30' },
  { name:'National Disaster Mgmt Unit', role:'Coordination & Policy',              contact:'+254 20 2729450', icon:'🏛️', color:'bg-purple-500/10 border-purple-500/30' },
  { name:'Kenya Meteorological Dept',   role:'Weather & Early Warning',            contact:'+254 20 3867880', icon:'🌦️', color:'bg-sky-500/10    border-sky-500/30'    },
  { name:'Kenya Wildlife Service',      role:'Rural & Wildlife Emergency Support', contact:'+254 20 6000800', icon:'🦁', color:'bg-emerald-500/10 border-emerald-500/30'},
];

const TECH_STACK = [
  { name:'Real-time Reporting',   desc:'Instant reports with GPS location and photo uploads',      icon:Activity,  color:'text-blue-400'    },
  { name:'GIS Mapping Platform',  desc:'Interactive disaster maps with severity zones and routing',icon:Globe,     color:'text-emerald-400' },
  { name:'Socket.io Live Chat',   desc:'Real-time messaging between all response roles',           icon:Radio,     color:'text-purple-400'  },
  { name:'MySQL Database',        desc:'Secure persistent storage for all system data',            icon:Database,  color:'text-amber-400'   },
  { name:'React Role Dashboards', desc:'Custom views for admin, coordinator, volunteer, citizen',  icon:BarChart2, color:'text-pink-400'    },
  { name:'Node.js / Express API', desc:'Robust REST API with JWT auth and real-time events',       icon:Zap,       color:'text-yellow-400'  },
  { name:'Nominatim Geocoding',   desc:'Auto-resolves location names to GPS coordinates on maps',  icon:MapPin,    color:'text-red-400'     },
  { name:'Leaflet Maps',          desc:'Open-source interactive mapping with custom markers',      icon:TrendingUp,color:'text-teal-400'    },
];

function UploadModal({ onClose, onUpload }) {
  const fileRef = useRef();
  const [file,     setFile]     = useState(null);
  const [meta,     setMeta]     = useState({ name:'', category:'guides', description:'', access:'public' });
  const [progress, setProgress] = useState(0);
  const [done,     setDone]     = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!meta.name) setMeta(m => ({ ...m, name: f.name.replace(/\.[^.]+$/, '') }));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) { setFile(f); if (!meta.name) setMeta(m => ({ ...m, name: f.name.replace(/\.[^.]+$/, '') })); }
  };

  const handleUpload = () => {
    if (!file || !meta.name.trim()) return;
    let p = 0;
    const iv = setInterval(() => {
      p += Math.random() * 20;
      if (p >= 100) { p = 100; clearInterval(iv); setDone(true); }
      setProgress(Math.min(p, 100));
    }, 120);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const doc = {
        id: Date.now(), name: meta.name.trim(), category: meta.category,
        description: meta.description.trim(), access: meta.access,
        type: file.name.split('.').pop().toUpperCase(),
        size: file.size > 1048576 ? (file.size/1048576).toFixed(1)+' MB' : (file.size/1024).toFixed(0)+' KB',
        downloads: 0, uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: 'You', url: ev.target.result,
      };
      setTimeout(() => { onUpload(doc); onClose(); }, 600);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white flex items-center gap-2"><Upload className="w-4 h-4 text-emerald-400" /> Upload Document</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${file ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800/40'}`}>
            {file ? (
              <div className="space-y-1">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-emerald-300">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size/1024).toFixed(0)} KB · Click to change</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400">Drag & drop or <span className="text-blue-400 font-medium">browse</span></p>
                <p className="text-xs text-slate-600">PDF, DOC, DOCX, XLS, PPT, PNG, ZIP</p>
              </div>
            )}
            <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.zip" />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Document Name *</label>
              <input value={meta.name} onChange={e => setMeta(m => ({...m,name:e.target.value}))}
                placeholder="e.g. Flood Response Protocol 2025"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Category</label>
                <div className="relative">
                  <select value={meta.category} onChange={e => setMeta(m => ({...m,category:e.target.value}))}
                    className="appearance-none w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                    {['protocols','training','guides','checklists','medical','other'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Access</label>
                <div className="relative">
                  <select value={meta.access} onChange={e => setMeta(m => ({...m,access:e.target.value}))}
                    className="appearance-none w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-sm focus:outline-none cursor-pointer">
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none text-slate-500" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Description</label>
              <textarea value={meta.description} onChange={e => setMeta(m => ({...m,description:e.target.value}))}
                rows={2} placeholder="Brief description of this document…"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none" />
            </div>
          </div>
          {progress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{done ? 'Upload complete' : 'Uploading…'}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${progress}%`}} />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-slate-200 text-sm">Cancel</button>
            <button onClick={handleUpload} disabled={!file || !meta.name.trim() || progress > 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-2 transition">
              <Upload className="w-4 h-4" /> Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({ doc, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-bold text-white truncate pr-4">{doc.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 flex-shrink-0"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {doc.url && doc.type === 'PDF' ? (
            <iframe src={doc.url} className="w-full h-96 rounded-xl border border-slate-700" title={doc.name} />
          ) : (
            <div className="h-48 flex flex-col items-center justify-center bg-slate-800 rounded-xl border border-slate-700 gap-3">
              <FileText className="w-12 h-12 text-slate-600" />
              <div className="text-center">
                <p className="text-slate-300 font-semibold">{doc.name}</p>
                <p className="text-slate-500 text-sm">{doc.type} · {doc.size}</p>
                {!doc.url && <p className="text-slate-600 text-xs mt-1">This is a placeholder — upload a real file to enable preview</p>}
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              {label:'Category', value:doc.category},
              {label:'Size',     value:doc.size},
              {label:'Access',   value:doc.access},
              {label:'Uploaded', value:doc.uploadedAt},
              {label:'Downloads',value:doc.downloads},
              {label:'By',       value:doc.uploadedBy},
            ].map(({label,value}) => (
              <div key={label} className="bg-slate-800 rounded-xl p-3">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="text-slate-200 font-medium capitalize text-sm">{value}</p>
              </div>
            ))}
          </div>
          {doc.description && <p className="text-sm text-slate-400 bg-slate-800/60 rounded-xl p-4 border border-slate-700">{doc.description}</p>}
          {doc.url ? (
            <a href={doc.url} download={`${doc.name}.${doc.type.toLowerCase()}`}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition text-sm">
              <Download className="w-4 h-4" /> Download File
            </a>
          ) : (
            <button disabled className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 text-slate-500 rounded-xl font-semibold text-sm cursor-not-allowed border border-slate-700">
              <Download className="w-4 h-4" /> No file attached — upload to enable download
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResourcesPage() {
  const { user }  = useContext(AuthContext);
  const isAdmin   = user && (user.role === 1 || user.role === 2);

  const [activeInvTab,  setActiveInvTab]  = useState('equipment');
  const [docs,          setDocs]          = useState(loadDocs);
  const [docSearch,     setDocSearch]     = useState('');
  const [docCategory,   setDocCategory]   = useState('all');
  const [docAccess,     setDocAccess]     = useState('all');
  const [showUpload,    setShowUpload]    = useState(false);
  const [previewDoc,    setPreviewDoc]    = useState(null);
  const [invSearch,     setInvSearch]     = useState('');
  const [activeSection, setActiveSection] = useState('inventory');

  const handleUpload = (doc) => {
    const updated = [doc, ...docs];
    setDocs(updated);
    saveDocs(updated);
  };

  const handleDelete = (id) => {
    if (!window.confirm('Delete this document permanently?')) return;
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated);
    saveDocs(updated);
  };

  const handleDownload = (doc) => {
    if (doc.url) {
      const a = document.createElement('a');
      a.href = doc.url;
      a.download = `${doc.name}.${doc.type.toLowerCase()}`;
      a.click();
    }
    const updated = docs.map(d => d.id === doc.id ? {...d, downloads: d.downloads + 1} : d);
    setDocs(updated);
    saveDocs(updated);
  };

  const filteredDocs = docs.filter(d => {
    if (docCategory !== 'all' && d.category !== docCategory) return false;
    if (docAccess   !== 'all' && d.access   !== docAccess)   return false;
    if (docSearch) {
      const q = docSearch.toLowerCase();
      return d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredInv = INVENTORY[activeInvTab].filter(r =>
    !invSearch || r.name.toLowerCase().includes(invSearch.toLowerCase()) || r.location.toLowerCase().includes(invSearch.toLowerCase())
  );

  const invStats = {
    total:    Object.values(INVENTORY).flat().reduce((s,r) => s+r.qty, 0),
    vehicles: INVENTORY.vehicles.reduce((s,r) => s+r.qty, 0),
  };

  const NAV = [
    {id:'inventory', label:'Inventory',  icon:Package },
    {id:'documents', label:'Documents',  icon:FileText},
    {id:'partners',  label:'Partners',   icon:Users   },
    {id:'technology',label:'Technology', icon:Activity},
  ];

  return (
    <>
      <Navbar />
      {showUpload && <UploadModal onClose={() => setShowUpload(false)} onUpload={handleUpload} />}
      {previewDoc  && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      <div className="min-h-screen bg-slate-950 pt-16">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-b border-slate-800 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)',backgroundSize:'40px 40px'}} />
          <div className="relative max-w-7xl mx-auto px-4 py-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Resource Management</span>
                </div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Disaster Response Resources</h1>
                <p className="text-slate-400 text-lg max-w-2xl">Real-time inventory, partner network, documents, and technology powering Kenya's community disaster response.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                {[
                  {val:invStats.total.toLocaleString(), label:'Total Items',  color:'text-emerald-400'},
                  {val:invStats.vehicles,               label:'Vehicles',     color:'text-blue-400'  },
                  {val:docs.length,                     label:'Documents',    color:'text-amber-400' },
                  {val:ORGS.length,                     label:'Partners',     color:'text-purple-400'},
                ].map(({val,label,color}) => (
                  <div key={label} className="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-center min-w-[90px]">
                    <p className={`text-2xl font-black ${color}`}>{val}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section nav */}
        <div className="border-b border-slate-800 bg-slate-900/50 sticky top-16 z-30 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 flex">
            {NAV.map(({id,label,icon:Icon}) => (
              <button key={id} onClick={() => setActiveSection(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold border-b-2 transition ${activeSection===id ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* INVENTORY */}
          {activeSection === 'inventory' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-black text-white">Resource Inventory</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">Live Data</span>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  {id:'equipment',label:'Equipment',icon:Wrench, count:INVENTORY.equipment.length},
                  {id:'vehicles', label:'Vehicles', icon:Truck,  count:INVENTORY.vehicles.length },
                  {id:'medical',  label:'Medical',  icon:Heart,  count:INVENTORY.medical.length  },
                  {id:'supplies', label:'Supplies', icon:Package,count:INVENTORY.supplies.length },
                ].map(({id,label,icon:Icon,count}) => (
                  <button key={id} onClick={() => setActiveInvTab(id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition border ${activeInvTab===id ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300'}`}>
                    <Icon className="w-4 h-4" />{label}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeInvTab===id?'bg-emerald-500/20 text-emerald-400':'bg-slate-800 text-slate-600'}`}>{count}</span>
                  </button>
                ))}
              </div>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input value={invSearch} onChange={e => setInvSearch(e.target.value)} placeholder="Search resources…"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                      {['Resource','Quantity','Location','Condition','Status'].map(h => (
                        <th key={h} className="px-5 py-3 text-left font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredInv.map((r,i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition">
                        <td className="px-5 py-3.5 font-semibold text-slate-200">{r.name}</td>
                        <td className="px-5 py-3.5 text-slate-300 font-mono font-bold">{r.qty.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-400">
                          <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />{r.location}</span>
                        </td>
                        <td className={`px-5 py-3.5 font-semibold capitalize ${COND_STYLE[r.condition]||'text-slate-400'}`}>{r.condition}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_STYLE[r.status]||'bg-slate-700 text-slate-400 border-slate-600'}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredInv.length === 0 && (
                  <div className="text-center py-12 text-slate-600"><Package className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No resources match your search</p></div>
                )}
              </div>
              <div className="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-900/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">Need Additional Resources?</h3>
                  <p className="text-slate-400 text-sm mt-1">Contact our resource allocation team to request equipment, personnel, or supplies.</p>
                </div>
                <a href="/contact" className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition whitespace-nowrap flex-shrink-0">
                  Request Resources <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* DOCUMENTS */}
          {activeSection === 'documents' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-white">Documents & Guides</h2>
                  <p className="text-slate-500 text-sm mt-0.5">{docs.length} documents · {docs.reduce((s,d)=>s+d.downloads,0).toLocaleString()} total downloads</p>
                </div>
                {isAdmin && (
                  <button onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold transition text-sm">
                    <Upload className="w-4 h-4" /> Upload Document
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents…"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="relative">
                  <select value={docCategory} onChange={e => setDocCategory(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm focus:outline-none cursor-pointer">
                    <option value="all">All Categories</option>
                    {['protocols','training','guides','checklists','medical','other'].map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-600" />
                </div>
                <div className="relative">
                  <select value={docAccess} onChange={e => setDocAccess(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-sm focus:outline-none cursor-pointer">
                    <option value="all">All Access</option>
                    <option value="public">Public</option>
                    <option value="restricted">Restricted</option>
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-600" />
                </div>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="text-center py-16 text-slate-600"><FileText className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No documents match your search</p></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredDocs.map(doc => {
                    const cat = CAT_DOC_STYLE[doc.category] || CAT_DOC_STYLE.other;
                    return (
                      <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${cat.bg} ${cat.color}`}>{doc.category}</div>
                          <div className="flex items-center gap-1">
                            {doc.access === 'restricted' && <Lock className="w-3.5 h-3.5 text-amber-500" />}
                            <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">{doc.type}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                            <FileText className={`w-5 h-5 ${cat.color}`} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-200 text-sm leading-snug line-clamp-2">{doc.name}</h3>
                            <p className="text-xs text-slate-600 mt-0.5">{doc.size} · {doc.uploadedAt}</p>
                          </div>
                        </div>
                        {doc.description && <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">{doc.description}</p>}
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-3">
                          <span className="flex items-center gap-1"><Download className="w-3 h-3" /> {doc.downloads} downloads</span>
                          <span>by {doc.uploadedBy}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setPreviewDoc(doc)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition">
                            <Eye className="w-3.5 h-3.5" /> Preview
                          </button>
                          <button onClick={() => handleDownload(doc)} disabled={!doc.url}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${doc.url ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}>
                            <Download className="w-3.5 h-3.5" /> {doc.url ? 'Download' : 'No file'}
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(doc.id)}
                              className="p-2 bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-700 text-slate-600 hover:text-red-400 rounded-xl transition">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {!isAdmin && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
                  <Lock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Document uploads require admin or coordinator access.</p>
                </div>
              )}
            </div>
          )}

          {/* PARTNERS */}
          {activeSection === 'partners' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Partner Organisations</h2>
              <p className="text-slate-400">Our network of organisations coordinating disaster response across Kenya.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {ORGS.map((org,i) => (
                  <div key={i} className={`bg-slate-900 border rounded-2xl p-5 hover:border-slate-600 transition-all ${org.color}`}>
                    <div className="flex items-start gap-4">
                      <div className="text-4xl flex-shrink-0">{org.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-base">{org.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 mb-3">{org.role}</p>
                        <a href={`tel:${org.contact.replace(/\s/g,'')}`}
                          className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition">
                          <Phone className="w-3.5 h-3.5" /> {org.contact}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-900/50 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-white text-lg">Want to Partner With Us?</h3>
                  <p className="text-slate-400 text-sm mt-1">Join our network of organisations helping Kenyan communities respond to disasters.</p>
                </div>
                <a href="/partner" className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition whitespace-nowrap flex-shrink-0">
                  Apply as Partner <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          )}

          {/* TECHNOLOGY */}
          {activeSection === 'technology' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white">Technology & Infrastructure</h2>
              <p className="text-slate-400">The technical stack powering CDRS — built for reliability, speed, and scale.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {TECH_STACK.map(({name,desc,icon:Icon,color}) => (
                  <div key={name} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <h3 className="font-bold text-white text-sm mb-1">{name}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-white flex items-center gap-2"><Database className="w-5 h-5 text-emerald-400" /> System Architecture</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {[
                    {layer:'Frontend', items:['React 18','React Router v6','Tailwind CSS','Recharts','React-Leaflet','Socket.io Client'], color:'text-blue-400',    border:'border-blue-900/40'    },
                    {layer:'Backend',  items:['Node.js / Express','Sequelize ORM','Socket.io Server','JWT Auth','REST API','Swagger Docs'], color:'text-emerald-400',border:'border-emerald-900/40' },
                    {layer:'Database', items:['MySQL 8','5 core tables','Relational model','Auto-sync migrations','Contact messages','Volunteer apps'], color:'text-amber-400', border:'border-amber-900/40'   },
                  ].map(({layer,items,color,border}) => (
                    <div key={layer} className={`bg-slate-950 border rounded-xl p-4 ${border}`}>
                      <p className={`font-bold text-sm mb-3 ${color}`}>{layer}</p>
                      <ul className="space-y-1.5">
                        {items.map(item => (
                          <li key={item} className="flex items-center gap-2 text-xs text-slate-400">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.replace('text-','bg-')}`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}