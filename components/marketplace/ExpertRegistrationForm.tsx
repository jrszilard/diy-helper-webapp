'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import type { Specialty } from '@/lib/marketplace/types';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';

const US_STATES: { value: string; label: string }[] = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'Washington, D.C.' },
];

const SPECIALTIES: { value: Specialty; label: string }[] = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'painting', label: 'Painting' },
  { value: 'tile', label: 'Tile' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'general_contracting', label: 'General Contracting' },
  { value: 'other', label: 'Other' },
];

interface SpecialtyEntry {
  specialty: Specialty;
  yearsExperience: number;
}

export default function ExpertRegistrationForm() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basic Info
  const [displayName, setDisplayName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [bio, setBio] = useState('');

  // Step 2: Specialties
  const [specialties, setSpecialties] = useState<SpecialtyEntry[]>([]);

  // Step 3: Pricing
  const [hourlyRate, setHourlyRate] = useState('');
  const [qaRate, setQaRate] = useState('');

  const toggleSpecialty = (spec: Specialty) => {
    setSpecialties(prev => {
      const exists = prev.find(s => s.specialty === spec);
      if (exists) return prev.filter(s => s.specialty !== spec);
      return [...prev, { specialty: spec, yearsExperience: 1 }];
    });
  };

  const setSpecialtyYears = (spec: Specialty, years: number) => {
    setSpecialties(prev =>
      prev.map(s => s.specialty === spec ? { ...s, yearsExperience: years } : s)
    );
  };

  const setPrimarySpecialty = (spec: Specialty) => {
    setSpecialties(prev => {
      const idx = prev.findIndex(s => s.specialty === spec);
      if (idx <= 0) return prev;
      const updated = [...prev];
      const [item] = updated.splice(idx, 1);
      return [item, ...updated];
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return displayName.trim() && city.trim() && state.trim();
      case 2: return specialties.length > 0;
      case 3: return true;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to register.');
        setSubmitting(false);
        return;
      }

      const payload: Record<string, unknown> = {
        displayName,
        city,
        state,
        zipCode,
        bio,
        specialties: specialties.map(s => ({
          specialty: s.specialty,
          yearsExperience: s.yearsExperience,
          isPrimary: specialties.indexOf(s) === 0,
        })),
      };
      if (hourlyRate) payload.hourlyRateCents = Math.round(parseFloat(hourlyRate) * 100);
      if (qaRate) payload.qaRateCents = Math.round(parseFloat(qaRate) * 100);

      const res = await fetch('/api/experts/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Registration failed.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/experts/dashboard';
      }, 2000);
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <CheckCircle2 size={48} className="mx-auto text-forest-green mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Registration Complete!</h2>
        <p className="text-sm text-white/50">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              s <= step ? 'bg-rust text-white' : 'bg-white/10 text-white/40'
            }`}>
              {s < step ? <CheckCircle2 size={16} /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 ${s < step ? 'bg-rust' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/40 border border-red-500/40 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Basic Information</h2>
          <TextInput
            label="Display Name *"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            fullWidth
            placeholder="Your professional name"
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="City *"
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              fullWidth
            />
            <Select
              label="State *"
              id="state"
              value={state}
              onChange={e => setState(e.target.value)}
              fullWidth
            >
              <option value="">Select state</option>
              {US_STATES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>
          <TextInput
            label="Zip Code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={zipCode}
            onChange={e => setZipCode(e.target.value.replace(/\D/g, ''))}
            fullWidth
            maxLength={5}
          />
          <Textarea
            label="Bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            rows={4}
            fullWidth
            resize="none"
            placeholder="Tell homeowners about your experience..."
          />
        </div>
      )}

      {/* Step 2: Specialties */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Your Specialties</h2>
          <p className="text-sm text-white/50">Select up to 5.</p>
          <div className="space-y-1.5">
            {SPECIALTIES.map(({ value, label }) => {
              const entry = specialties.find(s => s.specialty === value);
              const isSelected = !!entry;
              const isPrimary = isSelected && specialties[0].specialty === value;
              const atMax = specialties.length >= 5 && !isSelected;
              return isSelected ? (
                <div key={value} className="border border-rust/30 bg-rust/10 rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="flex-1 text-sm font-medium text-rust">{label}</span>
                    <button
                      onClick={() => toggleSpecialty(value)}
                      aria-label={`Remove ${label}`}
                      className="text-lg leading-none text-white/20 hover:text-white/50 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-3 pb-3 pt-1 border-t border-rust/20">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/40">Years of experience</span>
                      <TextInput
                        type="number"
                        min={1}
                        max={50}
                        value={entry.yearsExperience}
                        onChange={e => setSpecialtyYears(value, parseInt(e.target.value) || 1)}
                        className="w-16"
                        inputSize="sm"
                      />
                    </div>
                    {isPrimary ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rust/20 text-rust">
                        Primary
                      </span>
                    ) : (
                      <button
                        onClick={() => setPrimarySpecialty(value)}
                        className="text-xs text-white/30 hover:text-white/60 transition-colors"
                      >
                        Set as primary
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  key={value}
                  onClick={() => !atMax && toggleSpecialty(value)}
                  disabled={atMax}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    atMax
                      ? 'bg-white/5 border-white/[0.06] text-white/20 cursor-not-allowed'
                      : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Set Your Rates</h2>
          <p className="text-sm text-white/50">These can be updated later from your dashboard.</p>
          <TextInput
            label="Hourly Rate ($)"
            type="number"
            min={0}
            step={0.01}
            value={hourlyRate}
            onChange={e => setHourlyRate(e.target.value)}
            fullWidth
            placeholder="75.00"
          />
          <div>
            <TextInput
              label="Q&A Rate ($)"
              type="number"
              min={0}
              step={0.01}
              value={qaRate}
              onChange={e => setQaRate(e.target.value)}
              fullWidth
              placeholder="10.00"
            />
            <p className="text-xs text-white/40 mt-1">Rate for answering Q&A questions from homeowners.</p>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Review & Submit</h2>
          <div className="bg-white/5 border border-white/[0.08] rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-white/40">Name</span>
              <p className="text-sm font-medium text-white">{displayName}</p>
            </div>
            <div>
              <span className="text-xs text-white/40">Location</span>
              <p className="text-sm font-medium text-white">
                {city}, {state} {zipCode}
              </p>
            </div>
            {bio && (
              <div>
                <span className="text-xs text-white/40">Bio</span>
                <p className="text-sm text-white/70">{bio}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-white/40">Specialties</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {specialties.map((s, idx) => (
                  <span key={s.specialty} className="px-2 py-0.5 text-xs bg-rust/20 text-rust rounded-full font-medium">
                    {SPECIALTIES.find(sp => sp.value === s.specialty)?.label} ({s.yearsExperience}yr){idx === 0 ? ' · Primary' : ''}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-white/40">Hourly Rate</span>
                <p className="text-sm font-medium text-white">
                  {hourlyRate ? `$${hourlyRate}/hr` : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-xs text-white/40">Q&A Rate</span>
                <p className="text-sm font-medium text-white">
                  {qaRate ? `$${qaRate}` : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        {step > 1 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1 px-4 py-2 text-sm text-white/40 hover:text-white transition-colors"
          >
            <ChevronLeft size={16} />
            Back
          </button>
        ) : (
          <div />
        )}
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className={`flex items-center gap-1 px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
              canProceed()
                ? 'bg-rust hover:bg-copper'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold text-white transition-colors ${
              submitting
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-forest-green hover:bg-forest-green-dark'
            }`}
          >
            {submitting && <Spinner size="sm" />}
            {submitting ? 'Submitting...' : 'Submit Registration'}
          </button>
        )}
      </div>
    </div>
  );
}
