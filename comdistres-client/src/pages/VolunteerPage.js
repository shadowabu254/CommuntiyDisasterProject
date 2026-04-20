import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Heart, Shield, Clock, MapPin, Phone, Mail, User,
  CheckCircle, ChevronRight, ChevronLeft, Loader,
  AlertTriangle, Star, Users, Award, Calendar,
  Briefcase, Car, Wifi, Check, X, Info, ChevronDown
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────
const SKILLS = [
  { id:'first_aid',      icon:'🩺', label:'First Aid / CPR'      },
  { id:'medical',        icon:'🏥', label:'Medical Professional'  },
  { id:'search_rescue',  icon:'🔍', label:'Search & Rescue'       },
  { id:'firefighting',   icon:'🔥', label:'Firefighting'          },
  { id:'construction',   icon:'🔨', label:'Construction / Repair' },
  { id:'logistics',      icon:'📦', label:'Logistics / Supply'    },
  { id:'communication',  icon:'📡', label:'Communications / IT'   },
  { id:'counselling',    icon:'💬', label:'Counselling / Welfare'  },
  { id:'driving',        icon:'🚗', label:'Driving (own vehicle)'  },
  { id:'cooking',        icon:'🍳', label:'Food Preparation'       },
  { id:'translation',    icon:'🌐', label:'Translation / Interpreter'},
  { id:'coordination',   icon:'📋', label:'Event Coordination'     },
];

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIMES = ['Morning (6AM–12PM)','Afternoon (12PM–6PM)','Evening (6PM–10PM)','Overnight (10PM–6AM)'];

const STEPS = [
  { id:1, label:'Personal Info',   icon: User      },
  { id:2, label:'Skills',          icon: Star      },
  { id:3, label:'Availability',    icon: Calendar  },
  { id:4, label:'Experience',      icon: Briefcase },
  { id:5, label:'Review & Submit', icon: CheckCircle},
];

const IMPACT_STATS = [
  { value:'2,400+', label:'Active Volunteers',   icon: Users  },
  { value:'340+',   label:'Disasters Responded', icon: Shield },
  { value:'18,000+',label:'People Helped',       icon: Heart  },
  { value:'47',     label:'Counties Covered',    icon: MapPin },
];

// ── Toggle chip component ──────────────────────────────────────────────────
function ToggleChip({ selected, onClick, icon, label, small = false }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border transition-all font-medium ${
        small ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
      } ${
        selected
          ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm shadow-blue-900/30'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
      }`}>
      {icon && <span>{icon}</span>}
      <span>{label}</span>
      {selected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
    </button>
  );
}

// ── Field component ────────────────────────────────────────────────────────
function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition";

// ══════════════════════════════════════════════════════════════════════════
export default function VolunteerPage() {
  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [refNumber,  setRefNumber]  = useState('');
  const [errors,     setErrors]     = useState({});

  const [form, setForm] = useState({
    // Step 1 — personal
    firstName:'', lastName:'', email:'', phone:'', idNumber:'',
    county:'', town:'', address:'',
    // Step 2 — skills
    skills: [],
    otherSkills:'',
    hasVehicle: false,
    hasFirstAidCert: false,
    // Step 3 — availability
    days: [],
    times: [],
    hoursPerMonth: '',
    startDate: '',
    remote: false,
    // Step 4 — experience
    experience: '',       // none | some | experienced | professional
    previousOrg: '',
    whyVolunteer: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    languages: '',
    medicalConditions: '',
    agreeTerms: false,
    ageConfirm: false,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggle = (key, val) => setForm(f => ({
    ...f, [key]: f[key].includes(val)
      ? f[key].filter(v => v !== val)
      : [...f[key], val]
  }));

  // Validation per step
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.firstName.trim()) e.firstName = 'Required';
      if (!form.lastName.trim())  e.lastName  = 'Required';
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
      if (!form.phone.trim())     e.phone     = 'Required';
      if (!form.county.trim())    e.county    = 'Required';
    }
    if (step === 2) {
      if (form.skills.length === 0) e.skills = 'Select at least one skill';
    }
    if (step === 3) {
      if (form.days.length === 0)   e.days  = 'Select at least one day';
      if (form.times.length === 0)  e.times = 'Select at least one time slot';
      if (!form.hoursPerMonth)      e.hoursPerMonth = 'Required';
    }
    if (step === 4) {
      if (!form.whyVolunteer.trim()) e.whyVolunteer = 'Required';
      if (!form.emergencyContactName.trim()) e.emergencyContactName = 'Required';
      if (!form.emergencyContactPhone.trim()) e.emergencyContactPhone = 'Required';
      if (!form.agreeTerms) e.agreeTerms = 'You must agree to the terms';
      if (!form.ageConfirm) e.ageConfirm = 'You must confirm you are 18+';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(5, s + 1)); };
  const prev = () => { setStep(s => Math.max(1, s - 1)); setErrors({}); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        availableDays:  form.days,
        availableTimes: form.times,
      };
      const res = await api.post('/volunteers/apply', payload);
      setRefNumber(res.data.referenceNumber);
      setSubmitted(true);
    } catch (err) {
      alert('Submission failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (submitted) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 pt-16 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Application Submitted!</h2>
            <p className="text-slate-400 text-sm mb-4">
              Thank you for volunteering with CDRS. Our coordination team will review your application and contact you within 48 hours.
            </p>
            <div className="inline-block px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Your Reference Number</p>
              <p className="font-mono font-bold text-blue-300 text-lg tracking-widest">{refNumber}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-2 text-sm text-slate-400">
            <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Confirmation sent to {form.email}</p>
            <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Application visible in admin inbox</p>
            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" /> Response within 48 hours</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition text-sm font-medium">
              Go Home
            </Link>
            <Link to="/reports" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition text-sm font-semibold">
              View Reports
            </Link>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 pt-16">

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Join Our Team</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Volunteer Application</h1>
            <p className="text-slate-400 text-lg max-w-2xl">
              Join thousands of Kenyans who help communities prepare for, respond to, and recover from disasters.
            </p>

            {/* Impact stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {IMPACT_STATS.map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <Icon className="w-5 h-5 text-emerald-400 mb-2" />
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10">

          {/* Step indicator */}
          <div className="flex items-center gap-0 mb-10">
            {STEPS.map((s, i) => {
              const done    = step > s.id;
              const active  = step === s.id;
              const Icon    = s.icon;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => done && setStep(s.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                        done   ? 'bg-emerald-600  border-emerald-500 text-white cursor-pointer hover:scale-105' :
                        active ? 'bg-slate-800    border-blue-500    text-blue-400' :
                                 'bg-slate-900    border-slate-700   text-slate-600'
                      }`}>
                      {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                    </button>
                    <span className={`text-[10px] font-bold uppercase tracking-wide hidden sm:block ${
                      active ? 'text-blue-400' : done ? 'text-emerald-500' : 'text-slate-600'
                    }`}>{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 transition-colors ${step > s.id ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Form card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-7 py-5 border-b border-slate-800 flex items-center gap-3">
              {React.createElement(STEPS[step - 1].icon, { className: 'w-5 h-5 text-blue-400' })}
              <div>
                <h2 className="font-bold text-white">Step {step} of {STEPS.length}: {STEPS[step-1].label}</h2>
                <p className="text-xs text-slate-500">
                  {[
                    'Tell us about yourself',
                    'What can you offer?',
                    'When are you available?',
                    'Your background & commitment',
                    'Review your application before submitting'
                  ][step - 1]}
                </p>
              </div>
            </div>

            <div className="p-7 space-y-6">

              {/* ═══ STEP 1 — Personal Info ═══════════════════════════ */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="First Name" required>
                      <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                        placeholder="Jane" className={inputCls} />
                      {errors.firstName && <p className="text-xs text-red-400 mt-1">{errors.firstName}</p>}
                    </Field>
                    <Field label="Last Name" required>
                      <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                        placeholder="Doe" className={inputCls} />
                      {errors.lastName && <p className="text-xs text-red-400 mt-1">{errors.lastName}</p>}
                    </Field>
                    <Field label="Email Address" required>
                      <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                        placeholder="jane@example.com" className={inputCls} />
                      {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
                    </Field>
                    <Field label="Phone Number" required>
                      <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                        placeholder="+254 7XX XXX XXX" className={inputCls} />
                      {errors.phone && <p className="text-xs text-red-400 mt-1">{errors.phone}</p>}
                    </Field>
                    <Field label="ID / Passport Number" hint="For verification purposes only">
                      <input value={form.idNumber} onChange={e => set('idNumber', e.target.value)}
                        placeholder="12345678" className={inputCls} />
                    </Field>
                    <Field label="County" required>
                      <div className="relative">
                        <select value={form.county} onChange={e => set('county', e.target.value)} className={inputCls + ' appearance-none'}>
                          <option value="">Select county…</option>
                          {['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Machakos','Kilifi','Meru','Nyeri','Kisii','Kakamega','Garissa','Wajir','Other'].map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                      {errors.county && <p className="text-xs text-red-400 mt-1">{errors.county}</p>}
                    </Field>
                    <Field label="Town / Sub-location">
                      <input value={form.town} onChange={e => set('town', e.target.value)}
                        placeholder="Westlands" className={inputCls} />
                    </Field>
                    <Field label="Physical Address">
                      <input value={form.address} onChange={e => set('address', e.target.value)}
                        placeholder="House / apartment number, street" className={inputCls} />
                    </Field>
                  </div>
                </>
              )}

              {/* ═══ STEP 2 — Skills ══════════════════════════════════ */}
              {step === 2 && (
                <>
                  <Field label="Your Skills & Capabilities" required hint="Select everything that applies — be generous!">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
                      {SKILLS.map(s => (
                        <ToggleChip key={s.id}
                          selected={form.skills.includes(s.id)}
                          onClick={() => toggle('skills', s.id)}
                          icon={s.icon} label={s.label} />
                      ))}
                    </div>
                    {errors.skills && <p className="text-xs text-red-400 mt-2">{errors.skills}</p>}
                  </Field>

                  <Field label="Other Skills" hint="Anything not listed above">
                    <input value={form.otherSkills} onChange={e => set('otherSkills', e.target.value)}
                      placeholder="e.g. Drone operation, photography, accounting…" className={inputCls} />
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key:'hasVehicle',     icon:'🚗', label:'I have my own vehicle', desc:'Available to transport people or supplies' },
                      { key:'hasFirstAidCert',icon:'🩺', label:'I hold a First Aid certificate', desc:'Current certification from recognised body' },
                    ].map(({ key, icon, label, desc }) => (
                      <label key={key}
                        className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          form[key] ? 'bg-blue-600/15 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}>
                        <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} className="mt-0.5 accent-blue-500 w-4 h-4" />
                        <div>
                          <p className="font-semibold text-sm">{icon} {label}</p>
                          <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <Field label="Languages Spoken">
                    <input value={form.languages} onChange={e => set('languages', e.target.value)}
                      placeholder="e.g. English, Swahili, Kikuyu, Luo…" className={inputCls} />
                  </Field>
                </>
              )}

              {/* ═══ STEP 3 — Availability ════════════════════════════ */}
              {step === 3 && (
                <>
                  <Field label="Available Days" required>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {DAYS.map(d => (
                        <ToggleChip key={d} small selected={form.days.includes(d)} onClick={() => toggle('days', d)} label={d.slice(0,3)} />
                      ))}
                    </div>
                    {errors.days && <p className="text-xs text-red-400 mt-2">{errors.days}</p>}
                  </Field>

                  <Field label="Available Times" required>
                    <div className="space-y-2 mt-2">
                      {TIMES.map(t => (
                        <ToggleChip key={t} selected={form.times.includes(t)} onClick={() => toggle('times', t)} label={t} />
                      ))}
                    </div>
                    {errors.times && <p className="text-xs text-red-400 mt-2">{errors.times}</p>}
                  </Field>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Hours per Month" required hint="Realistic commitment you can maintain">
                      <div className="relative">
                        <select value={form.hoursPerMonth} onChange={e => set('hoursPerMonth', e.target.value)} className={inputCls + ' appearance-none'}>
                          <option value="">Select…</option>
                          {['1–5 hours','5–10 hours','10–20 hours','20–40 hours','Full-time (40+ hours)'].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                      {errors.hoursPerMonth && <p className="text-xs text-red-400 mt-1">{errors.hoursPerMonth}</p>}
                    </Field>
                    <Field label="Earliest Start Date" hint="When can you begin?">
                      <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)}
                        min={new Date().toISOString().split('T')[0]} className={inputCls} />
                    </Field>
                  </div>

                  <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    form.remote ? 'bg-blue-600/15 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}>
                    <input type="checkbox" checked={form.remote} onChange={e => set('remote', e.target.checked)} className="mt-0.5 accent-blue-500 w-4 h-4" />
                    <div>
                      <p className="font-semibold text-sm">🌐 Available for remote / virtual volunteering</p>
                      <p className="text-xs opacity-70 mt-0.5">Online coordination, data entry, social media, translation</p>
                    </div>
                  </label>
                </>
              )}

              {/* ═══ STEP 4 — Experience & Commitment ════════════════ */}
              {step === 4 && (
                <>
                  <Field label="Experience Level">
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {[
                        { v:'none',         label:'No Experience',     desc:'Willing to learn' },
                        { v:'some',         label:'Some Experience',   desc:'1–2 past events'  },
                        { v:'experienced',  label:'Experienced',       desc:'3+ years'         },
                        { v:'professional', label:'Professional',      desc:'Paid/trained role' },
                      ].map(({ v, label, desc }) => (
                        <button key={v} type="button" onClick={() => set('experience', v)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            form.experience === v
                              ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}>
                          <p className="font-semibold text-sm">{label}</p>
                          <p className="text-xs opacity-70">{desc}</p>
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field label="Previous Organisation / Employer" hint="Most recent relevant position">
                    <input value={form.previousOrg} onChange={e => set('previousOrg', e.target.value)}
                      placeholder="Red Cross, St John Ambulance, KRCS…" className={inputCls} />
                  </Field>

                  <Field label="Why do you want to volunteer with CDRS?" required>
                    <textarea value={form.whyVolunteer} onChange={e => set('whyVolunteer', e.target.value)}
                      rows={4} placeholder="Tell us what motivates you and what you hope to contribute…"
                      className={inputCls + ' resize-none'} />
                    {errors.whyVolunteer && <p className="text-xs text-red-400 mt-1">{errors.whyVolunteer}</p>}
                  </Field>

                  <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 space-y-4">
                    <p className="text-sm font-bold text-slate-300 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-red-400" /> Emergency Contact
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Contact Name" required>
                        <input value={form.emergencyContactName} onChange={e => set('emergencyContactName', e.target.value)}
                          placeholder="Next of kin name" className={inputCls} />
                        {errors.emergencyContactName && <p className="text-xs text-red-400 mt-1">{errors.emergencyContactName}</p>}
                      </Field>
                      <Field label="Contact Phone" required>
                        <input type="tel" value={form.emergencyContactPhone} onChange={e => set('emergencyContactPhone', e.target.value)}
                          placeholder="+254 7XX XXX XXX" className={inputCls} />
                        {errors.emergencyContactPhone && <p className="text-xs text-red-400 mt-1">{errors.emergencyContactPhone}</p>}
                      </Field>
                    </div>
                  </div>

                  <Field label="Medical Conditions / Limitations" hint="Optional — helps us assign appropriate tasks">
                    <textarea value={form.medicalConditions} onChange={e => set('medicalConditions', e.target.value)}
                      rows={2} placeholder="Any physical limitations, allergies, or conditions we should know about…"
                      className={inputCls + ' resize-none'} />
                  </Field>

                  {/* Agreements */}
                  <div className="space-y-3">
                    {[
                      { key:'ageConfirm', label:'I confirm I am 18 years of age or older', error: errors.ageConfirm },
                      { key:'agreeTerms', label:'I agree to the CDRS Volunteer Code of Conduct, Privacy Policy, and understand my data will be used for coordination purposes only', error: errors.agreeTerms },
                    ].map(({ key, label, error }) => (
                      <div key={key}>
                        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                          form[key] ? 'bg-emerald-600/10 border-emerald-600/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}>
                          <input type="checkbox" checked={form[key]} onChange={e => set(key, e.target.checked)} className="mt-0.5 accent-emerald-500 w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">{label}</span>
                        </label>
                        {error && <p className="text-xs text-red-400 mt-1 ml-1">{error}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ═══ STEP 5 — Review ══════════════════════════════════ */}
              {step === 5 && (
                <div className="space-y-5">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4 text-sm">
                    {[
                      { label:'Name',          value:`${form.firstName} ${form.lastName}` },
                      { label:'Email',         value:form.email },
                      { label:'Phone',         value:form.phone },
                      { label:'County',        value:form.county || '—' },
                      { label:'Skills',        value:form.skills.map(s => SKILLS.find(x=>x.id===s)?.label).filter(Boolean).join(', ') || '—' },
                      { label:'Other Skills',  value:form.otherSkills || '—' },
                      { label:'Availability',  value:`${form.days.slice(0,3).join(', ')}${form.days.length>3 ? ` +${form.days.length-3} more` : ''} · ${form.times.slice(0,2).join(', ')}${form.times.length>2?' +more':''}` },
                      { label:'Hours/Month',   value:form.hoursPerMonth || '—' },
                      { label:'Experience',    value:form.experience || 'Not specified' },
                      { label:'Emergency Contact', value:`${form.emergencyContactName} — ${form.emergencyContactPhone}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex gap-4">
                        <span className="text-slate-500 w-36 flex-shrink-0 font-medium">{label}</span>
                        <span className="text-slate-300 flex-1">{value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-emerald-950/30 border border-emerald-900/50 rounded-xl flex items-start gap-3">
                    <Info className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-emerald-300/80">
                      <p className="font-semibold text-emerald-300 mb-1">What happens next?</p>
                      <p>Our team reviews your application within 48 hours. You'll receive an email with next steps including an orientation session and team assignment.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="px-7 py-5 border-t border-slate-800 flex justify-between items-center bg-slate-950/40">
              <button onClick={prev} disabled={step === 1}
                className="flex items-center gap-2 px-5 py-2.5 border border-slate-700 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-slate-200 transition text-sm font-medium disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <span className="text-xs text-slate-600">{step} of {STEPS.length}</span>
              {step < 5 ? (
                <button onClick={next}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition">
                  {submitting ? <><Loader className="w-4 h-4 animate-spin" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Submit Application</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}