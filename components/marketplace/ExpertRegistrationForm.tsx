'use client';

import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { supabase } from '@/lib/supabase';
import type { Specialty } from '@/lib/marketplace/types';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';

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
        <h2 className="text-xl font-bold text-foreground mb-2">Registration Complete!</h2>
        <p className="text-sm text-earth-brown">Redirecting to your dashboard...</p>
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
              s <= step ? 'bg-terracotta text-white' : 'bg-earth-tan text-earth-brown'
            }`}>
              {s < step ? <CheckCircle2 size={16} /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 ${s < step ? 'bg-terracotta' : 'bg-earth-tan'}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Basic Information</h2>
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
            <TextInput
              label="State *"
              type="text"
              value={state}
              onChange={e => setState(e.target.value)}
              fullWidth
              maxLength={2}
              placeholder="CA"
            />
          </div>
          <TextInput
            label="Zip Code"
            type="text"
            value={zipCode}
            onChange={e => setZipCode(e.target.value)}
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
          <h2 className="text-lg font-bold text-foreground">Your Specialties</h2>
          <p className="text-sm text-earth-brown">Select all that apply. The first selected will be your primary specialty.</p>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALTIES.map(({ value, label }) => {
              const selected = specialties.find(s => s.specialty === value);
              return (
                <div key={value}>
                  <button
                    onClick={() => toggleSpecialty(value)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      selected
                        ? 'bg-terracotta/10 border-terracotta text-terracotta'
                        : 'bg-white border-earth-sand text-foreground hover:bg-earth-tan'
                    }`}
                  >
                    {label}
                  </button>
                  {selected && (
                    <div className="mt-1 px-1">
                      <label className="text-xs text-earth-brown">Years exp:</label>
                      <TextInput
                        type="number"
                        min={1}
                        max={50}
                        value={selected.yearsExperience}
                        onChange={e => setSpecialtyYears(value, parseInt(e.target.value) || 1)}
                        className="ml-1 w-14 text-xs"
                        inputSize="sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Pricing */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Set Your Rates</h2>
          <p className="text-sm text-earth-brown">These can be updated later from your dashboard.</p>
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
            <p className="text-xs text-earth-brown mt-1">Rate for answering Q&A questions from homeowners.</p>
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground">Review & Submit</h2>
          <div className="bg-white border border-earth-sand rounded-lg p-4 space-y-3">
            <div>
              <span className="text-xs text-earth-brown">Name</span>
              <p className="text-sm font-medium text-foreground">{displayName}</p>
            </div>
            <div>
              <span className="text-xs text-earth-brown">Location</span>
              <p className="text-sm font-medium text-foreground">
                {city}, {state} {zipCode}
              </p>
            </div>
            {bio && (
              <div>
                <span className="text-xs text-earth-brown">Bio</span>
                <p className="text-sm text-foreground">{bio}</p>
              </div>
            )}
            <div>
              <span className="text-xs text-earth-brown">Specialties</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {specialties.map(s => (
                  <span key={s.specialty} className="px-2 py-0.5 text-xs bg-terracotta/10 text-terracotta rounded-full font-medium">
                    {s.specialty.replace('_', ' ')} ({s.yearsExperience}yr)
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-earth-brown">Hourly Rate</span>
                <p className="text-sm font-medium text-foreground">
                  {hourlyRate ? `$${hourlyRate}/hr` : 'Not set'}
                </p>
              </div>
              <div>
                <span className="text-xs text-earth-brown">Q&A Rate</span>
                <p className="text-sm font-medium text-foreground">
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
            className="flex items-center gap-1 px-4 py-2 text-sm text-earth-brown hover:text-foreground transition-colors"
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
                ? 'bg-terracotta hover:bg-terracotta-dark'
                : 'bg-[var(--muted)] cursor-not-allowed'
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
                ? 'bg-[var(--muted)] cursor-not-allowed'
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
