'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SPECIALTIES, SPECIALTY_LABELS } from '@/lib/marketplace/constants';
import type { ExpertProfile, ExpertSpecialty } from '@/lib/marketplace/types';
import { Loader2, Save, CheckCircle, AlertCircle, Plus, X } from 'lucide-react';

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
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20 text-[#7D6B5D]">
        <p>Unable to load profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-[#3E2723] mb-1">Expert Profile</h1>
      <p className="text-sm text-[#7D6B5D] mb-6">Manage your expert profile and settings</p>

      <div className="bg-[#FDFBF7] rounded-2xl border border-[#D4C8B8] shadow-sm p-6 space-y-5">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
            maxLength={100}
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white resize-none"
            maxLength={500}
            placeholder="Tell DIYers about your experience..."
          />
          <p className="text-xs text-[#A89880] mt-1">{bio.length}/500</p>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">State</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
            >
              <option value="">Select...</option>
              {US_STATES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Zip Code</label>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
              maxLength={10}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Service Radius (miles)</label>
            <input
              type="number"
              value={serviceRadiusMiles}
              onChange={(e) => setServiceRadiusMiles(parseInt(e.target.value) || 0)}
              min={1}
              max={500}
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
            />
          </div>
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Hourly Rate ($)</label>
            <input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              step="0.01"
              min="0"
              placeholder="75.00"
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">Q&A Rate ($)</label>
            <input
              type="number"
              value={qaRate}
              onChange={(e) => setQaRate(e.target.value)}
              step="0.01"
              min="0"
              placeholder="10.00"
              className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
            />
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-semibold text-[#3E2723]">Available for Work</p>
            <p className="text-xs text-[#7D6B5D]">Toggle off to pause receiving new questions</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAvailable ? 'bg-[#4A7C59]' : 'bg-[#D4C8B8]'
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
          <label className="block text-sm font-semibold text-[#3E2723] mb-2">Specialties</label>
          <div className="space-y-3">
            {specialties.map((spec, index) => (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={spec.specialty}
                  onChange={(e) => updateSpecialty(index, 'specialty', e.target.value)}
                  className="flex-1 border border-[#D4C8B8] rounded-lg px-3 py-2 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white"
                >
                  {SPECIALTIES.map(s => (
                    <option key={s} value={s}>{SPECIALTY_LABELS[s]}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={spec.yearsExperience ?? ''}
                  onChange={(e) => updateSpecialty(index, 'yearsExperience', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Yrs"
                  min={0}
                  max={60}
                  className="w-16 border border-[#D4C8B8] rounded-lg px-2 py-2 text-sm text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white text-center"
                />
                <button
                  type="button"
                  onClick={() => updateSpecialty(index, 'isPrimary', true)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    spec.isPrimary
                      ? 'bg-[#C67B5C] text-white'
                      : 'bg-[#E8DFD0] text-[#7D6B5D] hover:bg-[#D4C8B8]'
                  }`}
                  title="Set as primary"
                >
                  Primary
                </button>
                {specialties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSpecialty(index)}
                    className="p-1.5 text-[#A89880] hover:text-[#C67B5C] transition-colors"
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
              className="mt-2 inline-flex items-center gap-1 text-sm text-[#5D7B93] hover:text-[#4A6275] font-medium transition-colors"
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
              ? 'bg-[#4A7C59]/10 text-[#4A7C59]'
              : 'bg-[#C67B5C]/10 text-[#C67B5C]'
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
          className="inline-flex items-center gap-2 bg-[#C67B5C] text-white px-6 py-2.5 rounded-lg hover:bg-[#A65D3F] font-semibold disabled:opacity-50 transition"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
