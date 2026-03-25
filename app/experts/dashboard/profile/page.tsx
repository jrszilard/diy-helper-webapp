'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SPECIALTIES, SPECIALTY_LABELS } from '@/lib/marketplace/constants';
import type { ExpertProfile, ExpertSpecialty } from '@/lib/marketplace/types';
import { Save, CheckCircle, AlertCircle, Plus, X, Code, Copy, CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';
import SectionHeader from '@/components/ui/SectionHeader';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export default function ExpertProfilePage() {
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [badgeCopied, setBadgeCopied] = useState(false);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(50);
  const [hourlyRate, setHourlyRate] = useState('');
  const [qaRate, setQaRate] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [specialties, setSpecialties] = useState<ExpertSpecialty[]>([]);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/experts/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const p: ExpertProfile = data.profile;
        setProfile(p);
        setDisplayName(p.displayName || '');
        setBio(p.bio || '');
        setCity(p.city || '');
        setState(p.state || '');
        setZipCode(p.zipCode || '');
        setServiceRadiusMiles(p.serviceRadiusMiles);
        setHourlyRate(p.hourlyRateCents != null ? (p.hourlyRateCents / 100).toFixed(2) : '');
        setQaRate(p.qaRateCents != null ? (p.qaRateCents / 100).toFixed(2) : '');
        setIsAvailable(p.isAvailable);
        setSpecialties(p.specialties.length > 0 ? p.specialties : [{ specialty: 'electrical', yearsExperience: null, isPrimary: true }]);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;

      const body: Record<string, unknown> = {
        displayName,
        bio,
        city,
        state,
        zipCode,
        serviceRadiusMiles,
        isAvailable,
        specialties: specialties.map(s => ({
          specialty: s.specialty,
          yearsExperience: s.yearsExperience,
          isPrimary: s.isPrimary,
        })),
      };

      if (hourlyRate) body.hourlyRateCents = Math.round(parseFloat(hourlyRate) * 100);
      else body.hourlyRateCents = null;

      if (qaRate) body.qaRateCents = Math.round(parseFloat(qaRate) * 100);
      else body.qaRateCents = null;

      const res = await fetch('/api/experts/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setToast({ type: 'success', message: 'Profile updated successfully' });
      } else {
        const data = await res.json();
        setToast({ type: 'error', message: data.error || 'Failed to update profile' });
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to update profile' });
    }

    setSaving(false);
    setTimeout(() => setToast(null), 4000);
  };

  const addSpecialty = () => {
    if (specialties.length >= 5) return;
    const used = new Set(specialties.map(s => s.specialty));
    const available = SPECIALTIES.filter(s => !used.has(s));
    if (available.length === 0) return;
    setSpecialties([...specialties, { specialty: available[0], yearsExperience: null, isPrimary: false }]);
  };

  const removeSpecialty = (index: number) => {
    if (specialties.length <= 1) return;
    const updated = specialties.filter((_, i) => i !== index);
    // Ensure at least one primary
    if (!updated.some(s => s.isPrimary) && updated.length > 0) {
      updated[0].isPrimary = true;
    }
    setSpecialties(updated);
  };

  const updateSpecialty = (index: number, field: string, value: unknown) => {
    const updated = [...specialties];
    if (field === 'specialty') updated[index] = { ...updated[index], specialty: value as ExpertSpecialty['specialty'] };
    if (field === 'yearsExperience') updated[index] = { ...updated[index], yearsExperience: value as number | null };
    if (field === 'isPrimary') {
      updated.forEach((s, i) => { updated[i] = { ...s, isPrimary: i === index }; });
    }
    setSpecialties(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-earth-brown">
        <p>Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader size="lg" title="Expert Profile" subtitle="Manage your expert profile and settings" className="mb-6" />

      <div className="bg-surface rounded-2xl border border-earth-sand shadow-sm p-6 space-y-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Display Name</label>
          <TextInput
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            fullWidth
            maxLength={100}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full border border-earth-sand rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-terracotta bg-white resize-none"
            maxLength={500}
            placeholder="Tell DIYers about your experience..."
          />
          <p className="text-xs text-earth-brown-light mt-1">{bio.length}/500</p>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">City</label>
            <TextInput
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              fullWidth
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">State</label>
            <Select
              value={state}
              onChange={(e) => setState(e.target.value)}
              fullWidth
            >
              <option value="">Select...</option>
              {US_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Zip Code</label>
            <TextInput
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              fullWidth
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Service Radius (miles)</label>
            <TextInput
              type="number"
              value={serviceRadiusMiles}
              onChange={(e) => setServiceRadiusMiles(parseInt(e.target.value) || 0)}
              min={1}
              max={500}
              fullWidth
            />
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Hourly Rate ($)</label>
            <TextInput
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              step="0.01"
              min="0"
              placeholder="75.00"
              fullWidth
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-1.5">Q&A Rate ($)</label>
            <TextInput
              type="number"
              value={qaRate}
              onChange={(e) => setQaRate(e.target.value)}
              step="0.01"
              min="0"
              placeholder="10.00"
              fullWidth
            />
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-foreground">Available for Work</p>
            <p className="text-xs text-earth-brown">Toggle off to pause receiving new questions</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAvailable ? 'bg-forest-green' : 'bg-earth-sand'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAvailable ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Specialties */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-2">Specialties</label>
          <div className="space-y-3">
            {specialties.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <Select
                  value={spec.specialty}
                  onChange={(e) => updateSpecialty(index, 'specialty', e.target.value)}
                  className="flex-1"
                >
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>
                  ))}
                </Select>
                <TextInput
                  type="number"
                  value={spec.yearsExperience ?? ''}
                  onChange={(e) => updateSpecialty(index, 'yearsExperience', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Yrs"
                  min={0}
                  max={60}
                  className="w-16 text-center"
                />
                <button
                  type="button"
                  onClick={() => updateSpecialty(index, 'isPrimary', true)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    spec.isPrimary
                      ? 'bg-terracotta text-white'
                      : 'bg-earth-tan text-earth-brown hover:bg-earth-sand'
                  }`}
                  title="Set as primary"
                >
                  Primary
                </button>
                {specialties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecialty(index)}
                    className="p-1.5 text-earth-brown-light hover:text-terracotta transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {specialties.length < 5 && (
            <button
              type="button"
              onClick={addSpecialty}
              className="mt-2 inline-flex items-center gap-1 text-sm text-slate-blue hover:text-slate-blue-dark font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Specialty
            </button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-forest-green/10 text-forest-green'
              : 'bg-terracotta/10 text-terracotta'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-terracotta text-white px-6 py-2.5 rounded-lg hover:bg-terracotta-dark font-semibold disabled:opacity-50 transition"
        >
          {saving ? (
            <Spinner size="sm" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Embeddable Badge */}
      {profile && (
        <div className="bg-surface rounded-2xl border border-earth-sand shadow-sm p-6 mt-6">
          <h2 className="text-lg font-bold text-foreground mb-1 flex items-center gap-2">
            <Code size={18} className="text-slate-blue" />
            Embeddable Badge
          </h2>
          <p className="text-sm text-earth-brown mb-4">
            Add your verified expert badge to your website, portfolio, or social profiles.
          </p>

          {/* Badge preview */}
          <div className="bg-white border border-earth-sand rounded-lg p-4 mb-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/experts/${profile.id}/badge`}
              alt="Expert badge preview"
              width={280}
              height={90}
            />
          </div>

          {/* Embed code */}
          <div className="relative">
            <label className="block text-xs font-semibold text-earth-brown mb-1">HTML Embed Code</label>
            <div className="bg-foreground text-earth-tan rounded-lg p-3 pr-12 text-xs font-mono overflow-x-auto">
              {`<a href="${typeof window !== 'undefined' ? window.location.origin : ''}/experts/${profile.id}" target="_blank" rel="noopener"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/experts/${profile.id}/badge" alt="Verified Expert on DIY Helper" width="280" height="90" /></a>`}
            </div>
            <button
              onClick={() => {
                const origin = window.location.origin;
                const code = `<a href="${origin}/experts/${profile.id}" target="_blank" rel="noopener"><img src="${origin}/api/experts/${profile.id}/badge" alt="Verified Expert on DIY Helper" width="280" height="90" /></a>`;
                navigator.clipboard.writeText(code);
                setBadgeCopied(true);
                setTimeout(() => setBadgeCopied(false), 2000);
              }}
              className="absolute top-7 right-2 p-1.5 rounded hover:bg-white/10 transition-colors"
              title="Copy embed code"
            >
              {badgeCopied ? (
                <CheckCircle2 size={14} className="text-forest-green" />
              ) : (
                <Copy size={14} className="text-earth-tan" />
              )}
            </button>
          </div>

          <p className="text-xs text-muted mt-2">
            Your badge updates automatically as you answer questions and earn reviews.
          </p>
        </div>
      )}
    </div>
  );
}
