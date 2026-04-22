import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle,
  useMapEvents, useMap, Tooltip, Polyline
} from 'react-leaflet';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Layers, Filter, MapPin, RefreshCw, X, Search,
  Download, Clock, BarChart2, Crosshair, List,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  Activity, Navigation, Menu, ChevronRight
} from 'lucide-react';

// ─── Leaflet icon fix ──────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ─── Constants ────────────────────────────────────────────────────────────
const DISASTER_CONFIG = {
  fire:       { color: '#ef4444', icon: '🔥', label: 'Fire'       },
  flood:      { color: '#3b82f6', icon: '🌊', label: 'Flood'      },
  earthquake: { color: '#8b5cf6', icon: '🏚️', label: 'Earthquake' },
  accident:   { color: '#f59e0b', icon: '🚗', label: 'Accident'   },
  medical:    { color: '#ec4899', icon: '🏥', label: 'Medical'    },
  storm:      { color: '#6366f1', icon: '⛈️', label: 'Storm'      },
  other:      { color: '#6b7280', icon: '⚠️', label: 'Other'      },
};
const getDisasterInfo = (type) => DISASTER_CONFIG[type] || DISASTER_CONFIG.other;

const normaliseStatus = (s) => (s || '').toLowerCase();

const SEVERITY_COLORS = {
  low: '#22c55e', medium: '#eab308', high: '#f97316', critical: '#ef4444',
};
const getSeverityColor  = (s) => SEVERITY_COLORS[s] || '#6b7280';
const getSeverityRadius = (s) => ({ low: 300, medium: 600, high: 1000, critical: 1800 }[s] || 500);

const getReportAge = (createdAt) => {
  const diff = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}yr ago`;
};

// ─── Geocoding ────────────────────────────────────────────────────────────
const geocodeCache = {};

const geocodeLocation = async (locationStr) => {
  if (!locationStr) return null;
  const key = locationStr.trim().toLowerCase();
  if (geocodeCache[key]) return geocodeCache[key];
  const queries = [`${locationStr}, Kenya`, locationStr];
  for (const q of queries) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), displayName: data[0].display_name };
        geocodeCache[key] = coords;
        return coords;
      }
    } catch (e) { console.warn('Geocode error for', q, e); }
  }
  return null;
};

const groupByArea = (reports) => {
  const map = {};
  reports.forEach((r) => {
    if (!r.location || r._lat === null) return;
    const area = r.location.split(',')[0].trim();
    if (!map[area]) map[area] = [];
    map[area].push(r);
  });
  return Object.entries(map).map(([name, items]) => {
    const lat = items.reduce((s, r) => s + r._lat, 0) / items.length;
    const lng = items.reduce((s, r) => s + r._lng, 0) / items.length;
    const typeCounts = {};
    items.forEach((r) => { typeCounts[r.disasterType] = (typeCounts[r.disasterType] || 0) + 1; });
    const dominantType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'other';
    return { name, lat, lng, count: items.length, reports: items, dominantType, typeCounts };
  }).filter(Boolean).sort((a, b) => b.count - a.count);
};

const exportCSV = (reports) => {
  const headers = ['ID','Title','Description','Location','Latitude','Longitude','CoordSource','Type','Severity','Status','Reporter ID','Reported','Updated'];
  const rows = reports.map((r) => [
    r.id,
    `"${(r.title || '').replace(/"/g, '""')}"`,
    `"${(r.description || '').replace(/"/g, '""')}"`,
    `"${(r.location || '').replace(/"/g, '""')}"`,
    r._lat ?? '', r._lng ?? '',
    r._geocoded ? 'geocoded' : (r._lat ? 'database' : 'none'),
    r.disasterType, r.severity, r.status, r.reporterId,
    new Date(r.createdAt).toISOString(), new Date(r.updatedAt).toISOString(),
  ]);
  const csv  = [headers, ...rows].map((row) => row.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `disaster_reports_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Custom icons ──────────────────────────────────────────────────────────
const createCustomIcon = (color, icon, size = 'normal', isGeocoded = false) => {
  const dim = size === 'large' ? 54 : 42;
  const fs  = size === 'large' ? '22px' : '18px';
  const border = isGeocoded ? `3px dashed white` : `3px solid white`;
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="background:${color};width:${dim}px;height:${dim}px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        border:${border};box-shadow:0 4px 14px rgba(0,0,0,.4);
        display:flex;align-items:center;justify-content:center;
        animation:mkPulse 2.4s infinite;">
        <div style="transform:rotate(45deg);color:white;font-size:${fs};">${icon}</div>
      </div>
      <style>@keyframes mkPulse{0%,100%{transform:rotate(-45deg) scale(1)}50%{transform:rotate(-45deg) scale(1.08)}}</style>`,
    iconSize:    [dim, dim],
    iconAnchor:  [dim / 2, dim],
    popupAnchor: [0, -dim],
  });
};

const createAreaLabelIcon = (name, count, type) => {
  const { color, icon } = getDisasterInfo(type);
  return L.divIcon({
    className: 'area-label',
    html: `
      <div style="background:rgba(15,23,42,.92);color:#f8fafc;
        border:1.5px solid ${color};border-radius:8px;
        padding:4px 10px;font-size:11px;font-weight:700;
        white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,.4);
        display:flex;align-items:center;gap:6px;">
        <span>${icon}</span><span>${name}</span>
        <span style="background:${color};border-radius:4px;padding:1px 6px;font-size:10px;">${count}</span>
      </div>`,
    iconSize: null, iconAnchor: [0, 0], popupAnchor: [0, -10],
  });
};

const createMeasureIcon = (label) => L.divIcon({
  className: '',
  html: `<div style="background:#1e293b;color:white;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,.3);">${label}</div>`,
  iconAnchor: [0, 0],
});

const calcDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2);
};

// ─── Map sub-components ────────────────────────────────────────────────────
function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

function MapBoundsUpdater({ reports, selectedReport, searchedLocation }) {
  const map = useMap();
  useEffect(() => {
    if (searchedLocation) {
      map.setView([searchedLocation.lat, searchedLocation.lng], 13, { animate: true });
    } else if (selectedReport?._lat && selectedReport?._lng) {
      map.setView([selectedReport._lat, selectedReport._lng], 15, { animate: true });
    } else {
      const valid = reports.filter((r) => r._lat && r._lng);
      if (valid.length > 0) {
        map.fitBounds(valid.map((r) => [r._lat, r._lng]), { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [selectedReport, reports, searchedLocation, map]);
  return null;
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════
export default function GISMapPage() {
  const { user } = useContext(AuthContext);

  const [rawReports,      setRawReports]      = useState([]);
  const [enrichedReports, setEnrichedReports] = useState([]);
  const [filteredReports, setFilteredReports] = useState([]);
  const [areaGroups,      setAreaGroups]      = useState([]);

  const [loading,         setLoading]         = useState(true);
  const [geocoding,       setGeocoding]       = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState({ done: 0, total: 0 });
  const [lastUpdate,      setLastUpdate]      = useState(new Date());

  const [stats, setStats] = useState({
    total: 0, critical: 0, high: 0, medium: 0, low: 0,
    active: 0, resolved: 0, pending: 0, noCoords: 0,
  });

  const [selectedReport,   setSelectedReport]   = useState(null);
  const [clickedLocation,  setClickedLocation]  = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const [locationSearch,   setLocationSearch]   = useState('');
  const [locationResults,  setLocationResults]  = useState([]);
  const [userLocation,     setUserLocation]     = useState(null);

  const [autoRefresh,   setAutoRefresh]   = useState(true);
  const [sidebarTab,    setSidebarTab]    = useState('filters');
  const [expandedArea,  setExpandedArea]  = useState(null);
  const [measureMode,   setMeasureMode]   = useState(false);
  const [measurePoints, setMeasurePoints] = useState([]);
  const [showTimeline,  setShowTimeline]  = useState(false);
  const [timelineValue, setTimelineValue] = useState(100);
  const [timelineDates, setTimelineDates] = useState({ min: null, max: null });

  // ── Mobile drawer state ────────────────────────────────────────────────
  // drawerState: 'closed' | 'peek' | 'open'
  const [drawerState,  setDrawerState]  = useState('closed');
  const [mobileSearch, setMobileSearch] = useState(false);
  const drawerRef = useRef(null);
  const touchStartY = useRef(null);

  const [filters, setFilters] = useState({
    disasterType: 'all', severity: 'all', status: 'all', dateRange: 'all',
  });
  const [mapLayers, setMapLayers] = useState({
    showMarkers: true, showSeverityCircles: true,
    showImpactZones: false, showAreaLabels: true,
  });

  const defaultCenter = [-1.2921, 36.8219];

  // ── Fetch + geocode ────────────────────────────────────────────────────
  const fetchReports = useCallback(async () => {
    try {
      const { data } = await api.get('/reports');
      setRawReports(data);
      setLastUpdate(new Date());

      const ns = normaliseStatus;
      setStats({
        total:    data.length,
        critical: data.filter((r) => r.severity === 'critical').length,
        high:     data.filter((r) => r.severity === 'high').length,
        medium:   data.filter((r) => r.severity === 'medium').length,
        low:      data.filter((r) => r.severity === 'low').length,
        pending:  data.filter((r) => ['pending','reported'].includes(ns(r.status))).length,
        active:   data.filter((r) => ['assigned','in-progress'].includes(ns(r.status))).length,
        resolved: data.filter((r) => ['resolved','closed'].includes(ns(r.status))).length,
        noCoords: data.filter((r) => !r.latitude || !r.longitude).length,
      });

      if (data.length) {
        const ts = data.map((r) => new Date(r.createdAt).getTime()).filter(Boolean);
        setTimelineDates({ min: Math.min(...ts), max: Math.max(...ts) });
      }

      setGeocoding(true);
      const needsGeocode = data.filter((r) => !r.latitude || !r.longitude);
      setGeocodeProgress({ done: 0, total: needsGeocode.length });

      const enriched = await Promise.all(
        data.map(async (r, i) => {
          if (r.latitude && r.longitude &&
              !isNaN(parseFloat(r.latitude)) && !isNaN(parseFloat(r.longitude))) {
            return { ...r, _lat: parseFloat(r.latitude), _lng: parseFloat(r.longitude), _geocoded: false };
          }
          if (r.location) {
            await new Promise((res) => setTimeout(res, needsGeocode.indexOf(r) * 350));
            const coords = await geocodeLocation(r.location);
            setGeocodeProgress((p) => ({ ...p, done: p.done + 1 }));
            if (coords) {
              return { ...r, _lat: coords.lat, _lng: coords.lng, _geocoded: true, _geocodedName: coords.displayName };
            }
          }
          return { ...r, _lat: null, _lng: null, _geocoded: false };
        })
      );

      setEnrichedReports(enriched);
      setGeocoding(false);
      setLoading(false);
    } catch (err) {
      console.error('GISMapPage fetchReports:', err);
      setLoading(false);
      setGeocoding(false);
    }
  }, []);

  useEffect(() => { fetchReports(); getUserLocation(); }, [fetchReports]);
  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchReports, 30000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchReports]);

  useEffect(() => {
    let f = enrichedReports.filter((r) => r._lat && r._lng);
    if (filters.disasterType !== 'all') f = f.filter((r) => r.disasterType === filters.disasterType);
    if (filters.severity     !== 'all') f = f.filter((r) => r.severity     === filters.severity);
    if (filters.status !== 'all')
      f = f.filter((r) => normaliseStatus(r.status) === normaliseStatus(filters.status));
    if (filters.dateRange !== 'all') {
      const days   = { today:1, week:7, month:30 }[filters.dateRange];
      const cutoff = Date.now() - days * 86_400_000;
      f = f.filter((r) => new Date(r.createdAt).getTime() >= cutoff);
    }
    if (showTimeline && timelineDates.min && timelineDates.max) {
      const cut = timelineDates.min + (timelineDates.max - timelineDates.min) * (timelineValue / 100);
      f = f.filter((r) => new Date(r.createdAt).getTime() <= cut);
    }
    setFilteredReports(f);
    setAreaGroups(groupByArea(f));
  }, [enrichedReports, filters, showTimeline, timelineValue, timelineDates]);

  const getUserLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Geolocation denied:', err)
    );
  };

  const handleLocationSearch = () => {
    if (!locationSearch.trim()) return;
    const q = locationSearch.toLowerCase();
    const results = enrichedReports.filter((r) =>
      r.location?.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q)
    );
    setLocationResults(results);
    if (results.length > 0) {
      const withCoords = results.find((r) => r._lat && r._lng);
      if (withCoords) {
        setSearchedLocation({ lat: withCoords._lat, lng: withCoords._lng });
        setSelectedReport(withCoords);
      }
    } else {
      alert(`No disasters found matching "${locationSearch}".`);
    }
  };

  const handleMapClick = (latlng) => {
    if (measureMode) {
      setMeasurePoints((prev) => prev.length >= 2 ? [latlng] : [...prev, latlng]);
      return;
    }
    setClickedLocation(latlng);
  };

  const measureDistance =
    measurePoints.length === 2
      ? calcDistance(measurePoints[0].lat, measurePoints[0].lng, measurePoints[1].lat, measurePoints[1].lng)
      : null;

  const timelineLabel = (() => {
    if (!timelineDates.min || !timelineDates.max) return '';
    const t = timelineDates.min + (timelineDates.max - timelineDates.min) * (timelineValue / 100);
    return new Date(t).toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
  })();

  const STATUS_BADGE = {
    pending:       'bg-yellow-100 text-yellow-800 border-yellow-300',
    reported:      'bg-orange-100 text-orange-800 border-orange-300',
    assigned:      'bg-blue-100   text-blue-800   border-blue-300',
    'in-progress': 'bg-purple-100 text-purple-800 border-purple-300',
    resolved:      'bg-green-100  text-green-800  border-green-300',
    closed:        'bg-gray-100   text-gray-800   border-gray-300',
  };
  const getStatusBadge = (s) => STATUS_BADGE[normaliseStatus(s)] || 'bg-gray-100 text-gray-800 border-gray-300';

  // ── Drawer touch handlers ──────────────────────────────────────────────
  const handleDrawerTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleDrawerTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (delta > 40)       setDrawerState('open');
    else if (delta < -40) setDrawerState(drawerState === 'open' ? 'peek' : 'closed');
    touchStartY.current = null;
  };

  const mappableCount   = enrichedReports.filter((r) => r._lat && r._lng).length;
  const unmappableCount = enrichedReports.filter((r) => !r._lat || !r._lng).length;

  if (loading) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 flex items-center justify-center pt-16">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto" />
          {geocoding && (
            <div className="space-y-1">
              <p className="text-gray-600 font-medium">Geocoding location names…</p>
              <p className="text-sm text-gray-500">{geocodeProgress.done} / {geocodeProgress.total} locations resolved</p>
              <div className="w-48 h-2 bg-gray-200 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${geocodeProgress.total ? (geocodeProgress.done / geocodeProgress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}
          {!geocoding && <p className="text-gray-600">Loading map data…</p>}
        </div>
      </div>
    </>
  );

  // ── Shared sidebar content ─────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">

      {/* ════ FILTERS ════ */}
      {sidebarTab === 'filters' && (
        <>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Disaster Type</label>
            <select value={filters.disasterType}
              onChange={(e) => setFilters((f) => ({ ...f, disasterType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="all">All Types ({rawReports.length})</option>
              {Object.entries(DISASTER_CONFIG).map(([val, { icon, label }]) => {
                const cnt = rawReports.filter((r) => r.disasterType === val).length;
                return cnt > 0 ? <option key={val} value={val}>{icon} {label} ({cnt})</option> : null;
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Severity</label>
            <select value={filters.severity}
              onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="all">All Severities ({rawReports.length})</option>
              {[{val:'critical',emoji:'🔴'},{val:'high',emoji:'🟠'},{val:'medium',emoji:'🟡'},{val:'low',emoji:'🟢'}].map(({ val, emoji }) => {
                const cnt = rawReports.filter((r) => r.severity === val).length;
                return <option key={val} value={val}>{emoji} {val.charAt(0).toUpperCase() + val.slice(1)} ({cnt})</option>;
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Status</label>
            <select value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="all">All Statuses ({rawReports.length})</option>
              {[
                {val:'pending',label:'⏳ Pending'},{val:'reported',label:'📢 Reported'},
                {val:'assigned',label:'📌 Assigned'},{val:'in-progress',label:'⚙️ In Progress'},
                {val:'resolved',label:'✅ Resolved'},{val:'closed',label:'🔒 Closed'},
              ].map(({ val, label }) => {
                const cnt = rawReports.filter((r) => normaliseStatus(r.status) === val).length;
                return cnt > 0 ? <option key={val} value={val}>{label} ({cnt})</option> : null;
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Time Range</label>
            <select value={filters.dateRange}
              onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="all">All Time</option>
              <option value="today">📅 Today</option>
              <option value="week">📆 Last 7 Days</option>
              <option value="month">📊 Last 30 Days</option>
            </select>
          </div>

          <button onClick={() => setFilters({ disasterType:'all', severity:'all', status:'all', dateRange:'all' })}
            className="w-full py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 text-sm transition">
            Clear All Filters
          </button>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" /> Map Layers
            </h3>
            <div className="space-y-2.5">
              {[
                { key:'showMarkers',         label:'Disaster Markers' },
                { key:'showSeverityCircles', label:'Impact Radius Circles' },
                { key:'showImpactZones',     label:'Extended Zones (Critical)' },
                { key:'showAreaLabels',      label:'🏷️ Area Name Labels' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <div onClick={() => setMapLayers((l) => ({ ...l, [key]: !l[key] }))}
                    className={`w-9 h-5 rounded-full relative transition-colors ${mapLayers[key] ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${mapLayers[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <Crosshair className="w-3.5 h-3.5" /> Tools
            </h3>
            <div className="space-y-2">
              <button onClick={() => { setMeasureMode((m) => !m); setMeasurePoints([]); }}
                className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition ${
                  measureMode ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}>
                <Crosshair className="w-4 h-4" />
                {measureMode ? 'Exit Measure Mode' : '📏 Measure Distance'}
              </button>
              <button onClick={() => setShowTimeline((s) => !s)}
                className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition ${
                  showTimeline ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'
                }`}>
                <Clock className="w-4 h-4" />
                {showTimeline ? 'Hide Timeline' : '⏱️ Timeline Filter'}
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-gray-700">Auto-refresh (30s)</span>
              </label>
            </div>
            {measureMode && (
              <div className="mt-2 p-2.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700">
                {measurePoints.length === 0 && 'Click Point A on the map.'}
                {measurePoints.length === 1 && 'Now click Point B.'}
                {measureDistance && <span className="font-bold">📏 Distance: {measureDistance} km</span>}
              </div>
            )}
          </div>

          <div className="border-t pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marker Key</p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow" />
              Solid border = DB coordinates
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-dashed border-white shadow" />
              Dashed border = Geocoded from name
            </div>
          </div>
        </>
      )}

      {/* ════ AREAS ════ */}
      {sidebarTab === 'areas' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">{areaGroups.length} area{areaGroups.length !== 1 ? 's' : ''} on map</p>
          {areaGroups.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No areas with resolved coordinates</p>}
          {areaGroups.map((area) => {
            const { color, icon } = getDisasterInfo(area.dominantType);
            return (
              <div key={area.name} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedArea(expandedArea === area.name ? null : area.name);
                    setSearchedLocation({ lat: area.lat, lng: area.lng });
                    setDrawerState('peek');
                  }}
                  className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-gray-800">{area.name}</p>
                      <p className="text-xs text-gray-500">{area.count} report{area.count > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: color + '22', color }}>{area.count}</span>
                    {expandedArea === area.name ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expandedArea === area.name && (
                  <div className="border-t border-gray-100 px-3 py-2 bg-gray-50 space-y-2">
                    {Object.entries(area.typeCounts).map(([type, cnt]) => {
                      const { color: tc, icon: ti } = getDisasterInfo(type);
                      return (
                        <div key={type} className="flex items-center gap-2 text-xs">
                          <span className="w-24 text-gray-600 truncate">{ti} {type}</span>
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width:`${(cnt / area.count) * 100}%`, background: tc }} />
                          </div>
                          <span className="text-gray-500 w-4 text-right">{cnt}</span>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {area.reports.slice(0, 5).map((r) => (
                        <button key={r.id}
                          onClick={() => { setSelectedReport(r); setSearchedLocation({ lat: r._lat, lng: r._lng }); setDrawerState('peek'); }}
                          className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-blue-50 text-gray-700 transition truncate max-w-full">
                          {r.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════ ALL REPORTS ════ */}
      {sidebarTab === 'reports' && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {rawReports.length} total · {mappableCount} on map · {unmappableCount} no coords
          </p>
          {rawReports.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No reports found</p>}
          {rawReports.map((report) => {
            const enriched  = enrichedReports.find((e) => e.id === report.id);
            const { icon, color } = getDisasterInfo(report.disasterType);
            const hasCoords = enriched?._lat && enriched?._lng;
            const isSelected = selectedReport?.id === report.id;
            return (
              <div key={report.id}
                onClick={() => {
                  if (enriched) {
                    setSelectedReport(enriched);
                    if (hasCoords) { setSearchedLocation({ lat: enriched._lat, lng: enriched._lng }); setDrawerState('peek'); }
                  }
                }}
                className={`p-3 border rounded-lg cursor-pointer transition ${
                  isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}>
                <div className="flex items-start gap-2">
                  <span className="text-xl mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{report.title}</p>
                      {!hasCoords && <span className="text-orange-400 text-xs flex-shrink-0" title="No coordinates">⚠️</span>}
                      {enriched?._geocoded && <span className="text-blue-400 text-xs flex-shrink-0" title="Geocoded">📍</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {report.location || <span className="italic text-gray-400">No location</span>}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: getSeverityColor(report.severity) + '22', color: getSeverityColor(report.severity) }}>
                        {report.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>
                      <span className="text-xs text-gray-400">{getReportAge(report.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── Drawer translate based on state ───────────────────────────────────
  const drawerTranslate = {
    closed: 'translate-y-[calc(100%-56px)]',  // just the handle visible
    peek:   'translate-y-[55%]',              // ~45% of screen
    open:   'translate-y-0',                  // full open
  }[drawerState];

  return (
    <>
      <Navbar />

      {/* ── DESKTOP layout (≥768px) ─────────────────────────────────── */}
      <div className="hidden md:flex h-screen flex-col pt-16">

        {/* Desktop top bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" /> GIS Disaster Map
              </h1>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input type="text" value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                    placeholder="Search location or title…"
                    className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-52" />
                </div>
                <button onClick={handleLocationSearch}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition">
                  Search
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700">Total: <strong>{stats.total}</strong></div>
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-700">Critical: <strong>{stats.critical}</strong></div>
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 text-orange-700">High: <strong>{stats.high}</strong></div>
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-yellow-50 text-yellow-700">Pending: <strong>{stats.pending}</strong></div>
              <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-green-50 text-green-700">Resolved: <strong>{stats.resolved}</strong></div>
              {unmappableCount > 0 && (
                <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">⚠️ {unmappableCount} no coords</div>
              )}
              <span className="text-xs text-gray-400 ml-1">{lastUpdate.toLocaleTimeString()}</span>
            </div>

            <div className="flex items-center gap-2">
              {geocoding && (
                <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                  <Activity className="w-3.5 h-3.5" /> Geocoding…
                </span>
              )}
              <button onClick={fetchReports}
                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1.5 transition">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
              <button onClick={() => exportCSV(enrichedReports)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {locationResults.length > 0 && (
            <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 flex-wrap">
              <p className="text-xs font-semibold text-green-800">{locationResults.length} result(s) for "{locationSearch}"</p>
              <div className="flex flex-wrap gap-1.5">
                {locationResults.slice(0, 6).map((r) => (
                  <button key={r.id}
                    onClick={() => { setSelectedReport(r); if (r._lat && r._lng) setSearchedLocation({ lat: r._lat, lng: r._lng }); }}
                    className="px-2.5 py-1 bg-white border border-green-300 rounded text-xs hover:bg-green-100 transition">
                    {getDisasterInfo(r.disasterType).icon} {r.title}
                    {!r._lat && <span className="ml-1 text-orange-500">(no coords)</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setLocationResults([])} className="ml-auto text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Desktop sidebar */}
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200">
              {[{id:'filters',icon:Filter,label:'Filters'},{id:'areas',icon:BarChart2,label:'Areas'},{id:'reports',icon:List,label:'All'}].map((t) => (
                <button key={t.id} onClick={() => setSidebarTab(t.id)}
                  className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition border-b-2 ${
                    sidebarTab === t.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}>
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>
            <SidebarContent />
          </div>

          {/* Desktop map */}
          <div className="flex-1 relative">
            <MapArea
              filteredReports={filteredReports} selectedReport={selectedReport} searchedLocation={searchedLocation}
              defaultCenter={defaultCenter} mapLayers={mapLayers} userLocation={userLocation}
              clickedLocation={clickedLocation} measureMode={measureMode} measurePoints={measurePoints}
              measureDistance={measureDistance} areaGroups={areaGroups} geocoding={geocoding} loading={loading}
              geocodeProgress={geocodeProgress} showTimeline={showTimeline} timelineLabel={timelineLabel}
              timelineValue={timelineValue} setTimelineValue={setTimelineValue} timelineDates={timelineDates}
              filteredCount={filteredReports.length} handleMapClick={handleMapClick}
              setSelectedReport={setSelectedReport} getDisasterInfo={getDisasterInfo}
              getSeverityColor={getSeverityColor} getSeverityRadius={getSeverityRadius}
              getStatusBadge={getStatusBadge} getReportAge={getReportAge} calcDistance={calcDistance}
              stats={stats} rawReports={rawReports} areaGroupsCount={areaGroups.length}
              createCustomIcon={createCustomIcon} createAreaLabelIcon={createAreaLabelIcon}
              createMeasureIcon={createMeasureIcon}
            />
          </div>
        </div>
      </div>

      {/* ── MOBILE layout (<768px) ──────────────────────────────────── */}
      <div className="flex md:hidden flex-col h-screen pt-16 relative overflow-hidden">

        {/* Mobile top bar — minimal */}
        <div className="absolute top-16 left-0 right-0 z-[1001] flex items-center justify-between px-3 py-2 bg-white/90 backdrop-blur-sm border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-gray-900">GIS Map</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-medium text-blue-600">{filteredReports.length} on map</span>
            {stats.critical > 0 && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                🔴 {stats.critical}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button onClick={() => setMobileSearch((s) => !s)}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              <Search className="w-4 h-4" />
            </button>
            {/* Refresh */}
            <button onClick={fetchReports}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
            {/* Drawer toggle */}
            <button onClick={() => setDrawerState(drawerState === 'closed' ? 'peek' : 'closed')}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition">
              <Menu className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile search bar (conditional) */}
        {mobileSearch && (
          <div className="absolute top-[7rem] left-0 right-0 z-[1001] px-3 py-2 bg-white border-b border-gray-200 shadow-md flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                placeholder="Search location or title…"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={handleLocationSearch}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Go</button>
            <button onClick={() => { setMobileSearch(false); setLocationResults([]); }}
              className="px-2 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search results strip */}
        {locationResults.length > 0 && (
          <div className="absolute top-[10rem] left-0 right-0 z-[1001] px-3 py-2 bg-green-50 border-b border-green-200 flex gap-2 overflow-x-auto">
            {locationResults.slice(0, 6).map((r) => (
              <button key={r.id}
                onClick={() => {
                  setSelectedReport(r);
                  if (r._lat && r._lng) { setSearchedLocation({ lat: r._lat, lng: r._lng }); setDrawerState('peek'); }
                }}
                className="flex-shrink-0 px-2.5 py-1 bg-white border border-green-300 rounded text-xs hover:bg-green-100 transition whitespace-nowrap">
                {getDisasterInfo(r.disasterType).icon} {r.title}
              </button>
            ))}
            <button onClick={() => setLocationResults([])} className="flex-shrink-0 text-gray-400 ml-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Map — full screen behind drawer */}
        <div className="absolute inset-0 top-16">
          <MapArea
            filteredReports={filteredReports} selectedReport={selectedReport} searchedLocation={searchedLocation}
            defaultCenter={defaultCenter} mapLayers={mapLayers} userLocation={userLocation}
            clickedLocation={clickedLocation} measureMode={measureMode} measurePoints={measurePoints}
            measureDistance={measureDistance} areaGroups={areaGroups} geocoding={geocoding} loading={loading}
            geocodeProgress={geocodeProgress} showTimeline={showTimeline} timelineLabel={timelineLabel}
            timelineValue={timelineValue} setTimelineValue={setTimelineValue} timelineDates={timelineDates}
            filteredCount={filteredReports.length} handleMapClick={handleMapClick}
            setSelectedReport={(r) => { setSelectedReport(r); setDrawerState('peek'); }}
            getDisasterInfo={getDisasterInfo} getSeverityColor={getSeverityColor}
            getSeverityRadius={getSeverityRadius} getStatusBadge={getStatusBadge}
            getReportAge={getReportAge} calcDistance={calcDistance}
            stats={stats} rawReports={rawReports} areaGroupsCount={areaGroups.length}
            createCustomIcon={createCustomIcon} createAreaLabelIcon={createAreaLabelIcon}
            createMeasureIcon={createMeasureIcon}
          />
        </div>

        {/* ── Bottom drawer ──────────────────────────────────────── */}
        {/* Backdrop dimmer when open */}
        {drawerState === 'open' && (
          <div className="absolute inset-0 z-[1009] bg-black/30"
            onClick={() => setDrawerState('peek')} />
        )}

        <div
          ref={drawerRef}
          className={`absolute bottom-0 left-0 right-0 z-[1010] bg-white rounded-t-2xl shadow-2xl flex flex-col
            transition-transform duration-300 ease-out ${drawerTranslate}`}
          style={{ height: 'calc(100% - 4.5rem)' }}
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
        >
          {/* Drawer handle */}
          <div className="flex-shrink-0 flex flex-col items-center pt-2 pb-1 cursor-pointer"
            onClick={() => setDrawerState(drawerState === 'open' ? 'peek' : 'open')}>
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          {/* Drawer header */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-100">
            {/* Tab pills */}
            <div className="flex gap-1">
              {[
                {id:'filters', icon:Filter,   label:'Filters'},
                {id:'areas',   icon:BarChart2, label:'Areas'},
                {id:'reports', icon:List,      label:'All'},
              ].map((t) => (
                <button key={t.id} onClick={() => { setSidebarTab(t.id); if (drawerState === 'closed') setDrawerState('peek'); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    sidebarTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => exportCSV(enrichedReports)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setDrawerState('closed')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 transition">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Stats row in drawer */}
          <div className="flex-shrink-0 flex gap-2 px-4 py-2 overflow-x-auto border-b border-gray-100">
            {[
              { label:'Total',    value: stats.total,    color:'text-blue-700',  bg:'bg-blue-50'   },
              { label:'Critical', value: stats.critical, color:'text-red-700',   bg:'bg-red-50'    },
              { label:'High',     value: stats.high,     color:'text-orange-700',bg:'bg-orange-50' },
              { label:'Pending',  value: stats.pending,  color:'text-yellow-700',bg:'bg-yellow-50' },
              { label:'Resolved', value: stats.resolved, color:'text-green-700', bg:'bg-green-50'  },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`flex-shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg ${bg}`}>
                <span className={`text-base font-bold ${color}`}>{value}</span>
                <span className={`text-xs ${color} opacity-80`}>{label}</span>
              </div>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <SidebarContent />
          </div>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAP AREA — extracted so it can be used in both desktop + mobile
// ══════════════════════════════════════════════════════════════════════════
function MapArea({
  filteredReports, selectedReport, searchedLocation, defaultCenter,
  mapLayers, userLocation, clickedLocation, measureMode, measurePoints,
  measureDistance, areaGroups, geocoding, loading, geocodeProgress,
  showTimeline, timelineLabel, timelineValue, setTimelineValue, timelineDates,
  filteredCount, handleMapClick, setSelectedReport, getDisasterInfo,
  getSeverityColor, getSeverityRadius, getStatusBadge, getReportAge,
  calcDistance, stats, rawReports, areaGroupsCount,
  createCustomIcon, createAreaLabelIcon, createMeasureIcon,
}) {
  return (
    <div className="h-full w-full relative">
      {geocoding && !loading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-blue-200 rounded-lg px-4 py-2 shadow-lg flex items-center gap-3">
          <Activity className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-xs text-blue-700 font-medium">Geocoding {geocodeProgress.done}/{geocodeProgress.total} locations…</span>
        </div>
      )}

      {showTimeline && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-white border border-gray-200 rounded-xl px-5 py-3 w-72 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Timeline Filter
            </span>
            <span className="text-xs text-blue-600 font-mono">{timelineLabel}</span>
          </div>
          <input type="range" min="0" max="100" value={timelineValue}
            onChange={(e) => setTimelineValue(Number(e.target.value))}
            className="w-full accent-blue-600" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{timelineDates.min ? new Date(timelineDates.min).toLocaleDateString() : ''}</span>
            <span>{timelineDates.max ? new Date(timelineDates.max).toLocaleDateString() : ''}</span>
          </div>
          <p className="text-xs text-gray-500 text-center mt-1">{filteredCount} reports up to this date</p>
        </div>
      )}

      {measureMode && (
        <div className="absolute top-3 right-3 z-[1000] bg-orange-500 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Crosshair className="w-4 h-4" />
          {measurePoints.length === 0 ? 'Click Point A' : measurePoints.length === 1 ? 'Click Point B' : `${measureDistance} km`}
        </div>
      )}

      <MapContainer center={defaultCenter} zoom={7} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapBoundsUpdater reports={filteredReports} selectedReport={selectedReport} searchedLocation={searchedLocation} />
        <MapClickHandler onMapClick={handleMapClick} />

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createCustomIcon('#0ea5e9', '📍')}>
            <Popup><strong>Your Location</strong><br />{userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}</Popup>
          </Marker>
        )}

        {clickedLocation && !measureMode && (
          <Circle center={[clickedLocation.lat, clickedLocation.lng]} radius={5000}
            pathOptions={{ color:'#3b82f6', fillColor:'#3b82f6', fillOpacity:0.07, weight:2, dashArray:'6,8' }} />
        )}

        {measurePoints.length === 2 && (
          <Polyline positions={measurePoints.map((p) => [p.lat, p.lng])} pathOptions={{ color:'#f97316', weight:3, dashArray:'8,6' }} />
        )}
        {measurePoints.map((pt, i) => (
          <Marker key={i} position={[pt.lat, pt.lng]} icon={createMeasureIcon(i === 0 ? 'A' : `B · ${measureDistance} km`)}>
            <Tooltip permanent>{i === 0 ? 'Point A' : `Point B — ${measureDistance} km`}</Tooltip>
          </Marker>
        ))}

        {mapLayers.showAreaLabels && areaGroups.map((area) => (
          <Marker key={`area-${area.name}`} position={[area.lat, area.lng]}
            icon={createAreaLabelIcon(area.name, area.count, area.dominantType)} zIndexOffset={-100}>
            <Popup>
              <div className="p-1 min-w-[180px]">
                <h3 className="font-bold mb-1">{area.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{area.count} report{area.count > 1 ? 's' : ''} in this area</p>
                {Object.entries(area.typeCounts).map(([type, cnt]) => (
                  <div key={type} className="flex justify-between text-xs py-0.5">
                    <span>{getDisasterInfo(type).icon} {type}</span>
                    <span className="font-semibold">{cnt}</span>
                  </div>
                ))}
              </div>
            </Popup>
          </Marker>
        ))}

        {mapLayers.showMarkers && filteredReports.map((report) => {
          const { color, icon } = getDisasterInfo(report.disasterType);
          const isSelected = selectedReport?.id === report.id;
          return (
            <React.Fragment key={report.id}>
              <Marker
                position={[report._lat, report._lng]}
                icon={createCustomIcon(color, icon, isSelected ? 'large' : 'normal', report._geocoded)}
                eventHandlers={{ click: () => setSelectedReport(report) }}>
                <Popup minWidth={280}>
                  <div className="p-2">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-bold text-sm">{report.title}</h3>
                        <p className="text-xs text-gray-500">{getReportAge(report.createdAt)}</p>
                      </div>
                      <span className="text-2xl">{icon}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{report.description}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{report.location}</span>
                        {report._geocoded && <span className="text-blue-500 font-medium">(geocoded)</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <Navigation className="w-3 h-3 text-gray-400" />
                        <span className="font-mono text-gray-500">{report._lat.toFixed(5)}, {report._lng.toFixed(5)}</span>
                      </div>
                      <p>
                        <strong>Severity: </strong>
                        <span className="px-1.5 py-0.5 rounded font-semibold"
                          style={{ background: getSeverityColor(report.severity) + '22', color: getSeverityColor(report.severity) }}>
                          {report.severity}
                        </span>
                      </p>
                      <p>
                        <strong>Status: </strong>
                        <span className={`px-1.5 py-0.5 rounded border ${getStatusBadge(report.status)}`}>{report.status}</span>
                      </p>
                      {report.reporter && <p><strong>Reported by:</strong> {report.reporter.name}</p>}
                      <p><strong>Date:</strong> {new Date(report.createdAt).toLocaleString()}</p>
                      {userLocation && (
                        <p><strong>From you:</strong> {calcDistance(userLocation.lat, userLocation.lng, report._lat, report._lng)} km</p>
                      )}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a href={`/reports/${report.id}`}
                        className="flex-1 text-center px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition font-medium">
                        View Report →
                      </a>
                      <a href={`https://www.google.com/maps?q=${report._lat},${report._lng}`}
                        target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition">
                        🗺️ GMaps
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>

              {mapLayers.showSeverityCircles && (
                <Circle center={[report._lat, report._lng]} radius={getSeverityRadius(report.severity)}
                  pathOptions={{ color: getSeverityColor(report.severity), fillColor: getSeverityColor(report.severity), fillOpacity:0.12, weight:1.5 }} />
              )}

              {mapLayers.showImpactZones && report.severity === 'critical' && (
                <Circle center={[report._lat, report._lng]} radius={getSeverityRadius(report.severity) * 2}
                  pathOptions={{ color:'#ef4444', fillColor:'#ef4444', fillOpacity:0.05, weight:2, dashArray:'10,10' }} />
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Severity legend */}
      <div className="absolute bottom-4 left-4 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-[1000]">
        <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Severity</p>
        <div className="space-y-1.5 text-xs">
          {[{s:'critical',cnt:stats.critical},{s:'high',cnt:stats.high},{s:'medium',cnt:stats.medium},{s:'low',cnt:stats.low}].map(({ s, cnt }) => (
            <div key={s} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: getSeverityColor(s) }} />
              <span className="text-gray-600 capitalize w-14">{s}</span>
              <span className="font-bold text-gray-800 ml-auto">{cnt}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 mt-2 pt-2 space-y-0.5 text-xs text-gray-500">
          <p>🗺️ {filteredCount} on map / {stats.total} total</p>
          <p>🏷️ {areaGroupsCount} areas</p>
        </div>
      </div>

      {/* Type legend */}
      <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-[1000]">
        <p className="text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Disaster Types</p>
        <div className="space-y-1 text-xs">
          {Object.entries(DISASTER_CONFIG).map(([type, { icon, label }]) => {
            const cnt = rawReports.filter((r) => r.disasterType === type).length;
            return cnt > 0 ? (
              <div key={type} className="flex items-center gap-1.5">
                <span>{icon}</span>
                <span className="text-gray-600">{label}</span>
                <span className="font-bold text-gray-800 ml-auto pl-2">{cnt}</span>
              </div>
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}

// need MapBoundsUpdater inside MapArea scope — re-declare here
function MapBoundsUpdater({ reports, selectedReport, searchedLocation }) {
  const map = useMap();
  useEffect(() => {
    if (searchedLocation) {
      map.setView([searchedLocation.lat, searchedLocation.lng], 13, { animate: true });
    } else if (selectedReport?._lat && selectedReport?._lng) {
      map.setView([selectedReport._lat, selectedReport._lng], 15, { animate: true });
    } else {
      const valid = reports.filter((r) => r._lat && r._lng);
      if (valid.length > 0) {
        map.fitBounds(valid.map((r) => [r._lat, r._lng]), { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [selectedReport, reports, searchedLocation, map]);
  return null;
}