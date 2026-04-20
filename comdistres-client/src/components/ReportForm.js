import React, { useState, useRef, useCallback, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
  MapPin, AlertTriangle, FileText, Camera, Navigation,
  Search, CheckCircle, XCircle, Loader, ChevronDown,
  Phone, Users, Clock, Info
} from 'lucide-react';

// ─── Nominatim geocoder (same approach as GISMapPage) ─────────────────────
const geocodeLocation = async (query) => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Kenya')}&format=json&limit=5&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.map((d) => ({
      displayName: d.display_name,
      shortName:   d.display_name.split(',').slice(0, 3).join(','),
      lat:         parseFloat(d.lat),
      lng:         parseFloat(d.lon),
      type:        d.type,
    }));
  } catch (e) {
    console.warn('Geocode search error:', e);
    return [];
  }
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data.display_name?.split(',').slice(0, 4).join(',').trim() || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch (e) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

// ─── Step config ───────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Incident',  icon: AlertTriangle },
  { id: 2, label: 'Location',  icon: MapPin        },
  { id: 3, label: 'Details',   icon: FileText      },
  { id: 4, label: 'Media',     icon: Camera        },
];

const DISASTER_TYPES = [
  { value: 'flood',      icon: '🌊', label: 'Flood',              color: '#3b82f6' },
  { value: 'fire',       icon: '🔥', label: 'Fire',               color: '#ef4444' },
  { value: 'earthquake', icon: '🏚️', label: 'Earthquake',         color: '#8b5cf6' },
  { value: 'accident',   icon: '🚗', label: 'Accident',           color: '#f59e0b' },
  { value: 'medical',    icon: '🏥', label: 'Medical Emergency',  color: '#ec4899' },
  { value: 'storm',      icon: '⛈️', label: 'Storm',              color: '#6366f1' },
  { value: 'other',      icon: '⚠️', label: 'Other',              color: '#6b7280' },
];

const SEVERITY_LEVELS = [
  { value: 'low',      label: 'Low',      desc: 'Minor incident, no immediate danger',       color: '#22c55e', bg: 'bg-green-50  border-green-300',  text: 'text-green-700'  },
  { value: 'medium',   label: 'Medium',   desc: 'Moderate situation, monitoring needed',      color: '#eab308', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700' },
  { value: 'high',     label: 'High',     desc: 'Serious threat, swift response required',   color: '#f97316', bg: 'bg-orange-50 border-orange-300', text: 'text-orange-700' },
  { value: 'critical', label: 'Critical', desc: 'Life-threatening, immediate action needed', color: '#ef4444', bg: 'bg-red-50    border-red-300',    text: 'text-red-700'    },
];

// ══════════════════════════════════════════════════════════════════════════
export default function ReportForm() {
  const navigate  = useNavigate();
  const fileRef   = useRef(null);
  const searchRef = useRef(null);

  // ── Form state ─────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Core (existing fields)
    title:          '',
    description:    '',
    disasterType:   '',
    severity:       '',
    location:       '',
    latitude:       null,
    longitude:      null,
    imageUrl:       '',
    // Additional fields (new)
    affectedCount:  '',      // estimated number of people affected
    injuredCount:   '',      // number of injured
    contactName:    '',      // on-site contact person
    contactPhone:   '',      // on-site contact phone
    urgencyNotes:   '',      // additional urgency / access notes
    infrastructureDamage: false,  // checkbox
    evacuationNeeded:     false,  // checkbox
    hazardousMaterials:   false,  // checkbox
  });

  // ── Location search state ──────────────────────────────────────────────
  const [locationQuery,    setLocationQuery]    = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationStatus,   setLocationStatus]   = useState('idle'); // idle | searching | found | gps | error
  const [showSuggestions,  setShowSuggestions]  = useState(false);
  const debounceRef = useRef(null);

  // ── Image preview ──────────────────────────────────────────────────────
  const [imagePreview,  setImagePreview]  = useState(null);
  const [imageFile,     setImageFile]     = useState(null);

  // ── Submission state ───────────────────────────────────────────────────
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [submitted, setSubmitted] = useState(false);

  // ── Debounced location search ──────────────────────────────────────────
  useEffect(() => {
    if (!locationQuery.trim() || locationQuery.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLocationStatus('searching');
      const results = await geocodeLocation(locationQuery);
      setLocationSuggestions(results);
      setShowSuggestions(results.length > 0);
      setLocationStatus(results.length > 0 ? 'idle' : 'error');
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [locationQuery]);

  const selectSuggestion = (suggestion) => {
    setFormData((f) => ({
      ...f,
      location:  suggestion.shortName,
      latitude:  suggestion.lat,
      longitude: suggestion.lng,
    }));
    setLocationQuery(suggestion.shortName);
    setShowSuggestions(false);
    setLocationStatus('found');
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('gps');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const name = await reverseGeocode(latitude, longitude);
        setFormData((f) => ({ ...f, location: name, latitude, longitude }));
        setLocationQuery(name);
        setLocationStatus('found');
      },
      () => setLocationStatus('error')
    );
  };

  // ── Image handling ─────────────────────────────────────────────────────
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
    // In production you'd upload to S3/Cloudinary and set imageUrl
    // For now we store the data URL as a preview placeholder
    setFormData((f) => ({ ...f, imageUrl: file.name }));
  };

  // ── Step validation ────────────────────────────────────────────────────
  const canAdvance = () => {
    if (step === 1) return formData.disasterType && formData.severity;
    if (step === 2) return formData.location && formData.latitude && formData.longitude;
    if (step === 3) return formData.title.trim() && formData.description.trim();
    return true;
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const submit = async () => {
    if (!canAdvance() && step < 4) return;
    setError('');
    setLoading(true);
    try {
      // Only send fields the backend/DB knows about
      const payload = {
        title:        formData.title,
        description:  buildDescription(), // enriched description
        disasterType: formData.disasterType,
        severity:     formData.severity,
        location:     formData.location,
        latitude:     formData.latitude,
        longitude:    formData.longitude,
        imageUrl:     formData.imageUrl || null,
      };
      const res = await api.post('/reports', payload);
      setSubmitted(true);
      setTimeout(() => navigate(`/reports/${res.data.id}`), 1800);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Build an enriched description that includes the extra fields
  const buildDescription = () => {
    let desc = formData.description.trim();
    const extras = [];
    if (formData.affectedCount)  extras.push(`Estimated affected: ${formData.affectedCount} people`);
    if (formData.injuredCount)   extras.push(`Injured: ${formData.injuredCount}`);
    if (formData.infrastructureDamage) extras.push('Infrastructure damage reported');
    if (formData.evacuationNeeded)     extras.push('Evacuation needed');
    if (formData.hazardousMaterials)   extras.push('Hazardous materials involved');
    if (formData.urgencyNotes)   extras.push(`Notes: ${formData.urgencyNotes}`);
    if (formData.contactName)    extras.push(`On-site contact: ${formData.contactName}${formData.contactPhone ? ` (${formData.contactPhone})` : ''}`);
    if (extras.length) desc += '\n\n--- Additional Details ---\n' + extras.join('\n');
    return desc;
  };

  // ── Success screen ─────────────────────────────────────────────────────
  if (submitted) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center pt-16">
        <div className="text-center space-y-4 p-8">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-green-800">Report Submitted!</h2>
          <p className="text-green-700">Redirecting to your report…</p>
        </div>
      </div>
    </>
  );

  const selectedDisaster = DISASTER_TYPES.find((d) => d.value === formData.disasterType);
  const selectedSeverity = SEVERITY_LEVELS.find((s) => s.value === formData.severity);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-16 pb-10">
        <div className="max-w-2xl mx-auto px-4 py-8">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-7 h-7 text-red-500" />
              Report an Emergency
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Complete all steps to submit your disaster report. Location coordinates are saved automatically.
            </p>
          </div>

          {/* ── Step indicator ─────────────────────────────────────── */}
          <div className="flex items-center gap-0 mb-8">
            {STEPS.map((s, i) => {
              const done    = step > s.id;
              const active  = step === s.id;
              const Icon    = s.icon;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => done && setStep(s.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        done   ? 'bg-blue-600  border-blue-600  text-white  cursor-pointer' :
                        active ? 'bg-white     border-blue-600  text-blue-600' :
                                 'bg-white     border-gray-300  text-gray-400'
                      }`}>
                      {done ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </button>
                    <span className={`text-xs mt-1 font-medium ${active ? 'text-blue-600' : done ? 'text-blue-500' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 transition-colors ${step > s.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* ── Error ──────────────────────────────────────────────── */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-start gap-2">
              <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* ── Card ───────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

            {/* ══ STEP 1 — Incident Type & Severity ══════════════════ */}
            {step === 1 && (
              <div className="p-6 space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">What type of disaster is this?</h2>
                  <p className="text-sm text-gray-500">Select the category that best describes the incident.</p>
                </div>

                {/* Disaster type grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {DISASTER_TYPES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, disasterType: d.value }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.disasterType === d.value
                          ? 'border-blue-500 bg-blue-50 shadow-sm'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}>
                      <div className="text-2xl mb-1">{d.icon}</div>
                      <div className="text-sm font-semibold text-gray-800">{d.label}</div>
                    </button>
                  ))}
                </div>

                {/* Severity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Severity Level *
                  </label>
                  <div className="space-y-2">
                    {SEVERITY_LEVELS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setFormData((f) => ({ ...f, severity: s.value }))}
                        className={`w-full p-3 rounded-lg border-2 text-left flex items-center gap-3 transition-all ${
                          formData.severity === s.value
                            ? `${s.bg} shadow-sm`
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}>
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <div className="flex-1">
                          <span className={`font-semibold text-sm ${formData.severity === s.value ? s.text : 'text-gray-800'}`}>
                            {s.label}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                        </div>
                        {formData.severity === s.value && (
                          <CheckCircle className={`w-5 h-5 ${s.text}`} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Situation flags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Situation Flags <span className="text-gray-400 font-normal">(check all that apply)</span>
                  </label>
                  <div className="space-y-2">
                    {[
                      { key: 'evacuationNeeded',     label: '🚨 Evacuation Needed',           desc: 'People need to be moved to safety' },
                      { key: 'infrastructureDamage', label: '🏗️ Infrastructure Damage',        desc: 'Roads, buildings, utilities affected' },
                      { key: 'hazardousMaterials',   label: '☢️ Hazardous Materials Involved', desc: 'Chemicals, gas, toxic substances' },
                    ].map(({ key, label, desc }) => (
                      <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        formData[key] ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}>
                        <input
                          type="checkbox"
                          checked={formData[key]}
                          onChange={(e) => setFormData((f) => ({ ...f, [key]: e.target.checked }))}
                          className="mt-0.5 w-4 h-4 accent-red-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">{label}</span>
                          <p className="text-xs text-gray-500">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ══ STEP 2 — Location ══════════════════════════════════ */}
            {step === 2 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Where is the incident?</h2>
                  <p className="text-sm text-gray-500">
                    Type a location name and select from suggestions — coordinates are saved automatically.
                  </p>
                </div>

                {/* Location search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Location Name *
                  </label>
                  <div className="relative" ref={searchRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={locationQuery}
                        onChange={(e) => {
                          setLocationQuery(e.target.value);
                          // Clear coords if user is retyping
                          setFormData((f) => ({ ...f, location: e.target.value, latitude: null, longitude: null }));
                          setLocationStatus('idle');
                        }}
                        placeholder="e.g. Makueni, Mtwapa, CBD Nairobi…"
                        className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      />
                      {locationStatus === 'searching' && (
                        <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />
                      )}
                      {locationStatus === 'found' && (
                        <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                      )}
                    </div>

                    {/* Dropdown suggestions */}
                    {showSuggestions && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                        {locationSuggestions.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => selectSuggestion(s)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition border-b border-gray-100 last:border-0">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800 line-clamp-1">{s.shortName}</p>
                                <p className="text-xs text-gray-500 line-clamp-1">{s.displayName}</p>
                                <p className="text-xs text-blue-600 font-mono mt-0.5">
                                  {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* GPS button */}
                <button
                  type="button"
                  onClick={captureGPS}
                  disabled={locationStatus === 'gps'}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-60">
                  {locationStatus === 'gps'
                    ? <><Loader className="w-4 h-4 animate-spin" /> Getting your GPS…</>
                    : <><Navigation className="w-4 h-4" /> 📍 Use My Current GPS Location</>}
                </button>

                {/* Coords confirmation box */}
                {formData.latitude && formData.longitude ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-green-800">Location confirmed — coordinates will be saved</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-white rounded p-2 border border-green-200">
                        <p className="text-gray-500">Location</p>
                        <p className="font-semibold text-gray-800 truncate">{formData.location}</p>
                      </div>
                      <div className="bg-white rounded p-2 border border-green-200">
                        <p className="text-gray-500">Coordinates</p>
                        <p className="font-mono font-semibold text-gray-800">
                          {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800">
                      🗺️ Verify on Google Maps →
                    </a>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-700">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    Type a location name and select from the dropdown to auto-fill coordinates, or use GPS above.
                  </div>
                )}
              </div>
            )}

            {/* ══ STEP 3 — Incident Details ═══════════════════════════ */}
            {step === 3 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Describe the incident</h2>
                  <p className="text-sm text-gray-500">The more detail you provide, the faster responders can act.</p>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Report Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="e.g. Flash flood blocking Mombasa Road near Mlolongo"
                    maxLength={120}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">{formData.title.length}/120</p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
                    placeholder="Describe what you see: size of affected area, visible damage, ongoing hazards, access routes blocked…"
                  />
                </div>

                {/* Affected / Injured counts */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      <Users className="w-4 h-4" /> Estimated Affected
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.affectedCount}
                      onChange={(e) => setFormData((f) => ({ ...f, affectedCount: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      placeholder="# of people"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-orange-500" /> Injured / Casualties
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.injuredCount}
                      onChange={(e) => setFormData((f) => ({ ...f, injuredCount: e.target.value }))}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                      placeholder="# of injured"
                    />
                  </div>
                </div>

                {/* On-site contact */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                  <p className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                    <Phone className="w-4 h-4" /> On-site Contact <span className="text-gray-400 font-normal">(optional)</span>
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData((f) => ({ ...f, contactName: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Contact name"
                    />
                    <input
                      type="tel"
                      value={formData.contactPhone}
                      onChange={(e) => setFormData((f) => ({ ...f, contactPhone: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="+254 7XX XXX XXX"
                    />
                  </div>
                </div>

                {/* Urgency / access notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Access / Urgency Notes <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={formData.urgencyNotes}
                    onChange={(e) => setFormData((f) => ({ ...f, urgencyNotes: e.target.value }))}
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm resize-none"
                    placeholder="e.g. Road blocked 2km before, bring boats, power lines down…"
                  />
                </div>
              </div>
            )}

            {/* ══ STEP 4 — Media & Review ═════════════════════════════ */}
            {step === 4 && (
              <div className="p-6 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Photo & Final Review</h2>
                  <p className="text-sm text-gray-500">Upload an optional photo, then review before submitting.</p>
                </div>

                {/* Image upload */}
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  {imagePreview ? (
                    <div className="space-y-2">
                      <img src={imagePreview} alt="Preview" className="h-40 mx-auto rounded-lg object-cover shadow" />
                      <p className="text-xs text-gray-500">{imageFile?.name}</p>
                      <p className="text-xs text-blue-600">Click to change photo</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="w-10 h-10 text-gray-400 mx-auto" />
                      <p className="text-sm font-medium text-gray-700">Click to upload a photo</p>
                      <p className="text-xs text-gray-400">JPG, PNG, GIF up to 10MB</p>
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                </div>

                {/* Review summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-gray-800">📋 Report Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{selectedDisaster?.icon}</span>
                      <div>
                        <span className="font-semibold">{selectedDisaster?.label}</span>
                        {selectedSeverity && (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: selectedSeverity.color + '22', color: selectedSeverity.color }}>
                            {selectedSeverity.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 font-medium">{formData.title}</p>
                    <p className="text-gray-600 text-xs line-clamp-2">{formData.description}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      <span>{formData.location}</span>
                      {formData.latitude && (
                        <span className="font-mono text-blue-600 ml-1">
                          ({formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)})
                        </span>
                      )}
                    </div>
                    {(formData.affectedCount || formData.injuredCount) && (
                      <div className="flex gap-4 text-xs text-gray-600">
                        {formData.affectedCount && <span>👥 ~{formData.affectedCount} affected</span>}
                        {formData.injuredCount  && <span>🚑 {formData.injuredCount} injured</span>}
                      </div>
                    )}
                    {(formData.evacuationNeeded || formData.infrastructureDamage || formData.hazardousMaterials) && (
                      <div className="flex flex-wrap gap-1">
                        {formData.evacuationNeeded     && <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">🚨 Evacuation</span>}
                        {formData.infrastructureDamage && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">🏗️ Infra damage</span>}
                        {formData.hazardousMaterials   && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">☢️ Hazmat</span>}
                      </div>
                    )}
                    {formData.contactName && (
                      <p className="text-xs text-gray-600">
                        📞 {formData.contactName}{formData.contactPhone && ` — ${formData.contactPhone}`}
                      </p>
                    )}
                  </div>
                </div>

                {/* Emergency reminder */}
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-700">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Life-threatening emergency?</strong> Call <strong>999</strong> or <strong>112</strong> first before or alongside submitting this report.
                  </span>
                </div>
              </div>
            )}

            {/* ── Step nav buttons ──────────────────────────────────── */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium disabled:opacity-40">
                ← Back
              </button>

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => canAdvance() && setStep((s) => s + 1)}
                  disabled={!canAdvance()}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading || !formData.title || !formData.description || !formData.location}
                  className={`px-6 py-2.5 rounded-lg text-white text-sm font-medium transition flex items-center gap-2 ${
                    loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                  }`}>
                  {loading ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : '🚨 Submit Emergency Report'}
                </button>
              )}
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Reports are reviewed by coordinators · Your identity is protected
          </p>
        </div>
      </div>
    </>
  );
}