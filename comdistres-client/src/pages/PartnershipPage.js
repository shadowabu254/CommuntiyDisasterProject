import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Shield, Handshake, Building, Heart, Globe, ChevronRight,
  ChevronLeft, CheckCircle, Loader, Check, Info, ChevronDown,
  Package, Truck, DollarSign, Users, Wifi, Wrench, BookOpen,
  AlertTriangle, Phone, Mail, MapPin, Award, TrendingUp, X
} from 'lucide-react';

// ── Config ─────────────────────────────────────────────────────────────────
const ORG_TYPES = [
  { id:'ngo',         icon:'🤝', label:'NGO / Non-profit',     desc:'Civil society & humanitarian orgs'  },
  { id:'government',  icon:'🏛️', label:'Government Agency',    desc:'National, county, or municipal body' },
  { id:'corporate',   icon:'🏢', label:'Private Company',      desc:'CSR, sponsorship, or in-kind support' },
  { id:'hospital',    icon:'🏥', label:'Medical Facility',     desc:'Hospitals, clinics, health networks'  },
  { id:'education',   icon:'🎓', label:'Educational Institution',desc:'Schools, colleges, universities'   },
  { id:'media',       icon:'📡', label:'Media Organisation',   desc:'TV, radio, online news, social media' },
  { id:'religious',   icon:'⛪', label:'Faith Organisation',   desc:'Churches, mosques, community groups'  },
  { id:'other',       icon:'⚡', label:'Other',                desc:'Describe below'                      },
];

const CONTRIBUTIONS = [
  { id:'funding',        icon: DollarSign, label:'Financial Funding',        desc:'Grants, donations, emergency funds' },
  { id:'medical',        icon: Heart,      label:'Medical Supplies',         desc:'Medicines, equipment, PPE'          },
  { id:'food_water',     icon: Package,    label:'Food & Water',             desc:'Emergency rations, clean water'     },
  { id:'transport',      icon: Truck,      label:'Transport / Logistics',    desc:'Vehicles, fuel, warehousing'        },
  { id:'tech',           icon: Wifi,       label:'Technology / ICT',         desc:'Software, hardware, connectivity'   },
  { id:'personnel',      icon: Users,      label:'Skilled Personnel',        desc:'Doctors, engineers, specialists'    },
  { id:'training',       icon: BookOpen,   label:'Training & Capacity',      desc:'Workshops, certifications'          },
  { id:'equipment',      icon: Wrench,     label:'Tools & Equipment',        desc:'Generators, tents, heavy machinery' },
  { id:'shelter',        icon: Shield,     label:'Shelter / Housing',        desc:'Temporary accommodation support'    },
  { id:'communication',  icon: Globe,      label:'Communications',           desc:'Media, public messaging, PR'        },
];

const PARTNERSHIP_TIERS = [
  {
    name:'Community Partner',
    color:'from-slate-800 to-slate-900',
    border:'border-slate-700',
    badge:'bg-slate-700 text-slate-300',
    perks:['Listed on our website','Participation in 1 annual event','Quarterly impact report','Certificate of partnership'],
    commitment:'In-kind donations or KES 50,000+/year',
  },
  {
    name:'Silver Partner',
    color:'from-blue-950 to-slate-900',
    border:'border-blue-800/60',
    badge:'bg-blue-700/30 text-blue-300',
    perks:['All Community benefits','Logo on vehicles & materials','Priority response coordination','Joint press releases','2 event co-sponsorships'],
    commitment:'KES 200,000+ or equivalent in-kind',
    highlight: false,
  },
  {
    name:'Gold Partner',
    color:'from-amber-950/60 to-slate-900',
    border:'border-amber-700/50',
    badge:'bg-amber-700/30 text-amber-300',
    perks:['All Silver benefits','Board advisory seat','Named emergency response team','Annual gala invitation','Social media collaboration','Custom impact reports'],
    commitment:'KES 500,000+ or equivalent',
    highlight: true,
  },
];

const STEPS = [
  { id:1, label:'Organisation',   icon: Building      },
  { id:2, label:'Contribution',   icon: Handshake     },
  { id:3, label:'Contact',        icon: Phone         },
  { id:4, label:'Review',         icon: CheckCircle   },
];

const inputCls = "w-full px-4 py-3 bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition";

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

// ══════════════════════════════════════════════════════════════════════════
export default function PartnershipPage() {
  const [step,       setStep]       = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [refNumber,  setRefNumber]  = useState('');
  const [errors,     setErrors]     = useState({});

  const [form, setForm] = useState({
    // Step 1
    orgType:       '',
    orgName:       '',
    orgWebsite:    '',
    orgSize:       '',
    county:        '',
    country:       'Kenya',
    description:   '',
    // Step 2
    contributions: [],
    tier:          '',
    fundingAmount: '',
    timeline:      '',
    duration:      '',
    specificNeeds: '',
    // Step 3
    contactName:   '',
    contactTitle:  '',
    contactEmail:  '',
    contactPhone:  '',
    altContactName:'',
    altContactEmail:'',
    howHeard:      '',
    agreeTerms:    false,
  });

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const toggleContrib = (id) => setForm(f => ({
    ...f,
    contributions: f.contributions.includes(id)
      ? f.contributions.filter(c => c !== id)
      : [...f.contributions, id]
  }));

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.orgType)           e.orgType   = 'Select an organisation type';
      if (!form.orgName.trim())    e.orgName   = 'Required';
      if (!form.county.trim())     e.county    = 'Required';
    }
    if (step === 2) {
      if (form.contributions.length === 0) e.contributions = 'Select at least one contribution type';
    }
    if (step === 3) {
      if (!form.contactName.trim())  e.contactName  = 'Required';
      if (!form.contactTitle.trim()) e.contactTitle = 'Required';
      if (!form.contactEmail.trim() || !/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Valid email required';
      if (!form.contactPhone.trim()) e.contactPhone = 'Required';
      if (!form.agreeTerms)          e.agreeTerms   = 'You must agree to the terms';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(4, s + 1)); };
  const prev = () => { setStep(s => Math.max(1, s - 1)); setErrors({}); };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await api.post('/partnerships/apply', form);
      setRefNumber(res.data.referenceNumber);
      setSubmitted(true);
    } catch (err) {
      alert('Submission failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Success
  if (submitted) return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-950 pt-16 flex items-center justify-center px-4">
        <div className="max-w-lg w-full text-center space-y-6">
          <div className="w-20 h-20 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto border-2 border-amber-500/40">
            <Handshake className="w-10 h-10 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white mb-2">Partnership Request Received!</h2>
            <p className="text-slate-400 text-sm mb-4">
              Thank you, <strong className="text-slate-200">{form.contactName}</strong>! Our partnerships team will review {form.orgName}'s application and be in touch within 72 hours.
            </p>
            <div className="inline-block px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl">
              <p className="text-xs text-slate-500 mb-1">Reference Number</p>
              <p className="font-mono font-bold text-amber-300 text-lg tracking-widest">{refNumber}</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left space-y-2 text-sm text-slate-400">
            <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Confirmation sent to {form.contactEmail}</p>
            <p className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Application visible in admin inbox</p>
            <p className="flex items-center gap-2"><Award className="w-4 h-4 text-amber-400" /> Partnership agreement drafted within 5 days</p>
          </div>
          <div className="flex gap-3 justify-center">
            <Link to="/" className="px-5 py-2.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-700 transition text-sm font-medium">
              Go Home
            </Link>
            <Link to="/contact" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition text-sm font-semibold">
              Back to Contact
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
        <div className="bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-12">
            <div className="flex items-center gap-2 mb-3">
              <Handshake className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Collaborate With Us</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Partner With CDRS</h1>
            <p className="text-slate-400 text-lg max-w-2xl">
              Together we build more resilient communities. Whether you offer funding, supplies, expertise, or people — every partnership saves lives.
            </p>

            {/* Partner stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[
                { value:'120+',  label:'Active Partners',    icon: Handshake  },
                { value:'47',    label:'Counties Reached',   icon: MapPin     },
                { value:'KES 8M+',label:'Resources Mobilised',icon: TrendingUp },
                { value:'98%',   label:'Partner Satisfaction',icon: Award     },
              ].map(({ value, label, icon: Icon }) => (
                <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                  <Icon className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-black text-white">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">

          {/* Partnership tiers */}
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Partnership Tiers</h2>
            <p className="text-slate-500 text-sm mb-6">Choose the level that fits your organisation's capacity.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PARTNERSHIP_TIERS.map((tier) => (
                <button key={tier.name} type="button"
                  onClick={() => set('tier', tier.name)}
                  className={`relative text-left bg-gradient-to-br ${tier.color} border-2 rounded-2xl p-6 transition-all hover:-translate-y-1 ${
                    form.tier === tier.name
                      ? 'border-amber-500 shadow-lg shadow-amber-900/30'
                      : tier.border + ' hover:border-slate-600'
                  }`}>
                  {tier.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-xs font-black rounded-full">POPULAR</span>
                  )}
                  {form.tier === tier.name && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-black" />
                    </div>
                  )}
                  <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold mb-3 ${tier.badge}`}>
                    {tier.name}
                  </span>
                  <p className="text-xs text-slate-500 mb-3 font-medium">{tier.commitment}</p>
                  <ul className="space-y-1.5">
                    {tier.perks.map(perk => (
                      <li key={perk} className="flex items-start gap-2 text-xs text-slate-400">
                        <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Multi-step form */}
          <div>
            {/* Step indicator */}
            <div className="flex items-center gap-0 mb-8">
              {STEPS.map((s, i) => {
                const done   = step > s.id;
                const active = step === s.id;
                const Icon   = s.icon;
                return (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => done && setStep(s.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                          done   ? 'bg-amber-600  border-amber-500 text-white cursor-pointer hover:scale-105' :
                          active ? 'bg-slate-800  border-amber-500 text-amber-400' :
                                   'bg-slate-900  border-slate-700 text-slate-600'
                        }`}>
                        {done ? <Check className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                      </button>
                      <span className={`text-[10px] font-bold uppercase tracking-wide hidden sm:block ${
                        active ? 'text-amber-400' : done ? 'text-amber-500' : 'text-slate-600'
                      }`}>{s.label}</span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-5 transition-colors ${step > s.id ? 'bg-amber-600' : 'bg-slate-800'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
              <div className="px-7 py-5 border-b border-slate-800 flex items-center gap-3">
                {React.createElement(STEPS[step - 1].icon, { className: 'w-5 h-5 text-amber-400' })}
                <div>
                  <h2 className="font-bold text-white">Step {step} of {STEPS.length}: {STEPS[step-1].label}</h2>
                  <p className="text-xs text-slate-500">
                    {['Tell us about your organisation','What can you contribute?','Primary contact details','Review and submit'][step-1]}
                  </p>
                </div>
              </div>

              <div className="p-7 space-y-6">

                {/* ═══ STEP 1 — Organisation ════════════════════════════ */}
                {step === 1 && (
                  <>
                    <Field label="Organisation Type" required>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                        {ORG_TYPES.map(t => (
                          <button key={t.id} type="button" onClick={() => set('orgType', t.id)}
                            className={`p-3 rounded-xl border text-left transition-all ${
                              form.orgType === t.id
                                ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}>
                            <div className="text-2xl mb-1">{t.icon}</div>
                            <p className="text-xs font-bold">{t.label}</p>
                            <p className="text-[10px] opacity-60 mt-0.5">{t.desc}</p>
                          </button>
                        ))}
                      </div>
                      {errors.orgType && <p className="text-xs text-red-400 mt-2">{errors.orgType}</p>}
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Organisation Name" required>
                        <input value={form.orgName} onChange={e => set('orgName', e.target.value)}
                          placeholder="Acme Foundation Kenya" className={inputCls} />
                        {errors.orgName && <p className="text-xs text-red-400 mt-1">{errors.orgName}</p>}
                      </Field>
                      <Field label="Website">
                        <input value={form.orgWebsite} onChange={e => set('orgWebsite', e.target.value)}
                          placeholder="https://yourorg.org" className={inputCls} />
                      </Field>
                      <Field label="Organisation Size">
                        <div className="relative">
                          <select value={form.orgSize} onChange={e => set('orgSize', e.target.value)} className={inputCls + ' appearance-none'}>
                            <option value="">Select…</option>
                            {['1–10 employees','10–50','50–200','200–1000','1000+'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </Field>
                      <Field label="County / Region" required>
                        <div className="relative">
                          <select value={form.county} onChange={e => set('county', e.target.value)} className={inputCls + ' appearance-none'}>
                            <option value="">Select county…</option>
                            {['Nairobi','Mombasa','Kisumu','Nakuru','Machakos','Kilifi','Meru','Nyeri','National (all counties)','Other'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                        {errors.county && <p className="text-xs text-red-400 mt-1">{errors.county}</p>}
                      </Field>
                    </div>

                    <Field label="Organisation Description" hint="What does your organisation do?">
                      <textarea value={form.description} onChange={e => set('description', e.target.value)}
                        rows={3} placeholder="Brief description of your mission and activities…"
                        className={inputCls + ' resize-none'} />
                    </Field>
                  </>
                )}

                {/* ═══ STEP 2 — Contribution ════════════════════════════ */}
                {step === 2 && (
                  <>
                    <Field label="What can your organisation contribute?" required>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                        {CONTRIBUTIONS.map(({ id, icon: Icon, label, desc }) => (
                          <button key={id} type="button" onClick={() => toggleContrib(id)}
                            className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                              form.contributions.includes(id)
                                ? 'bg-amber-600/15 border-amber-500 text-amber-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}>
                            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{label}</p>
                              <p className="text-xs opacity-60 mt-0.5">{desc}</p>
                            </div>
                            {form.contributions.includes(id) && <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                          </button>
                        ))}
                      </div>
                      {errors.contributions && <p className="text-xs text-red-400 mt-2">{errors.contributions}</p>}
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Estimated Funding Amount" hint="If contributing financially (KES)">
                        <input value={form.fundingAmount} onChange={e => set('fundingAmount', e.target.value)}
                          placeholder="e.g. 500,000" className={inputCls} />
                      </Field>
                      <Field label="Partnership Duration">
                        <div className="relative">
                          <select value={form.duration} onChange={e => set('duration', e.target.value)} className={inputCls + ' appearance-none'}>
                            <option value="">Select…</option>
                            {['One-time donation','3 months','6 months','1 year','2+ years','Ongoing / indefinite'].map(d => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                        </div>
                      </Field>
                    </div>

                    <Field label="Preferred Start Timeline">
                      <div className="relative">
                        <select value={form.timeline} onChange={e => set('timeline', e.target.value)} className={inputCls + ' appearance-none'}>
                          <option value="">Select…</option>
                          {['Immediately','Within 1 month','1–3 months','3–6 months','Next financial year'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>

                    <Field label="Specific Needs or Conditions" hint="Any restrictions, requirements, or focus areas for your support">
                      <textarea value={form.specificNeeds} onChange={e => set('specificNeeds', e.target.value)}
                        rows={3} placeholder="e.g. Support limited to flood response only, or must be used in Mombasa county…"
                        className={inputCls + ' resize-none'} />
                    </Field>
                  </>
                )}

                {/* ═══ STEP 3 — Contact ═════════════════════════════════ */}
                {step === 3 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <Field label="Contact Full Name" required>
                        <input value={form.contactName} onChange={e => set('contactName', e.target.value)}
                          placeholder="Dr. Jane Mwangi" className={inputCls} />
                        {errors.contactName && <p className="text-xs text-red-400 mt-1">{errors.contactName}</p>}
                      </Field>
                      <Field label="Job Title / Role" required>
                        <input value={form.contactTitle} onChange={e => set('contactTitle', e.target.value)}
                          placeholder="Director of Partnerships" className={inputCls} />
                        {errors.contactTitle && <p className="text-xs text-red-400 mt-1">{errors.contactTitle}</p>}
                      </Field>
                      <Field label="Work Email" required>
                        <input type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)}
                          placeholder="jane@yourorg.org" className={inputCls} />
                        {errors.contactEmail && <p className="text-xs text-red-400 mt-1">{errors.contactEmail}</p>}
                      </Field>
                      <Field label="Phone Number" required>
                        <input type="tel" value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)}
                          placeholder="+254 7XX XXX XXX" className={inputCls} />
                        {errors.contactPhone && <p className="text-xs text-red-400 mt-1">{errors.contactPhone}</p>}
                      </Field>
                      <Field label="Alt Contact Name">
                        <input value={form.altContactName} onChange={e => set('altContactName', e.target.value)}
                          placeholder="Secondary contact" className={inputCls} />
                      </Field>
                      <Field label="Alt Contact Email">
                        <input type="email" value={form.altContactEmail} onChange={e => set('altContactEmail', e.target.value)}
                          placeholder="alt@yourorg.org" className={inputCls} />
                      </Field>
                    </div>

                    <Field label="How did you hear about CDRS?">
                      <div className="relative">
                        <select value={form.howHeard} onChange={e => set('howHeard', e.target.value)} className={inputCls + ' appearance-none'}>
                          <option value="">Select…</option>
                          {['Social media','News / media','Word of mouth','Government referral','NGO network','Web search','Other'].map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                      </div>
                    </Field>

                    <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      form.agreeTerms ? 'bg-emerald-600/10 border-emerald-600/50 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}>
                      <input type="checkbox" checked={form.agreeTerms} onChange={e => set('agreeTerms', e.target.checked)} className="mt-0.5 accent-emerald-500 w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">I confirm I am authorised to submit this partnership application on behalf of {form.orgName || 'my organisation'}, and I agree to the CDRS Partnership Terms and Privacy Policy.</span>
                    </label>
                    {errors.agreeTerms && <p className="text-xs text-red-400">{errors.agreeTerms}</p>}
                  </>
                )}

                {/* ═══ STEP 4 — Review ══════════════════════════════════ */}
                {step === 4 && (
                  <div className="space-y-5">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-3 text-sm">
                      {[
                        { label:'Organisation',  value: form.orgName },
                        { label:'Type',          value: ORG_TYPES.find(t=>t.id===form.orgType)?.label || '—' },
                        { label:'County',        value: form.county || '—' },
                        { label:'Contributions', value: form.contributions.map(id => CONTRIBUTIONS.find(c=>c.id===id)?.label).filter(Boolean).join(', ') || '—' },
                        { label:'Tier',          value: form.tier || 'Not selected' },
                        { label:'Timeline',      value: form.timeline || '—' },
                        { label:'Duration',      value: form.duration || '—' },
                        { label:'Contact',       value: `${form.contactName} — ${form.contactEmail}` },
                        { label:'Phone',         value: form.contactPhone },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex gap-4">
                          <span className="text-slate-500 w-32 flex-shrink-0 font-medium">{label}</span>
                          <span className="text-slate-300 flex-1">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-amber-950/30 border border-amber-900/50 rounded-xl flex items-start gap-3">
                      <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-300/80">
                        <p className="font-semibold text-amber-300 mb-1">Next Steps</p>
                        <p>Our partnerships team will review your application within 72 hours and send a draft Memorandum of Understanding (MOU) to {form.contactEmail}.</p>
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
                {step < 4 ? (
                  <button onClick={next}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl text-sm transition">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 text-black font-bold rounded-xl text-sm transition">
                    {submitting ? <><Loader className="w-4 h-4 animate-spin text-white" /> Submitting…</> : <><CheckCircle className="w-4 h-4" /> Submit Application</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}