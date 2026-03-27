'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { SPECIALTIES, SPECIALTY_LABELS } from '@/lib/marketplace/constants';
import type { ExpertProfile, ExpertSpecialty } from '@/lib/marketplace/types';
import { Save, Plus, X, Copy, CheckCircle2 } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import TextInput from '@/components/ui/TextInput';
import Textarea from '@/components/ui/Textarea';
import Select from '@/components/ui/Select';
import SectionHeader from '@/components/ui/SectionHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Alert from '@/components/ui/Alert';
import EmptyState from '@/components/ui/EmptyState';
import Toggle from '@/components/ui/Toggle';

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
      <EmptyState
        description="Unable to load profile."
        className="py-20"
      />
    );
  }

  return (
    <div className="max-w-2xl">
      <SectionHeader size="lg" title="Expert Profile" subtitle="Manage your expert profile and settings" className="mb-6" />

      <div className="space-y-5">
        {/* Display Name */}
        <TextInput
          id="profile-display-name"
          label="Display Name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          fullWidth
          maxLength={100}
        />

        {/* Bio */}
        <div>
          <Textarea
            label="Bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Tell DIYers about your experience..."
            resize="none"
            fullWidth
          />
          <p className="text-xs text-earth-brown-light mt-1">{bio.length}/500</p>
        </div>

        {/* Location */}
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            id="profile-city"
            label="City"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            fullWidth
            maxLength={100}
          />
          <Select
            id="profile-state"
            label="State"
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

        <div className="grid grid-cols-2 gap-4">
          <TextInput
            id="profile-zip"
            label="Zip Code"
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            fullWidth
            maxLength={10}
          />
          <TextInput
            id="profile-radius"
            label="Service Radius (miles)"
            type="number"
            value={serviceRadiusMiles}
            onChange={(e) => setServiceRadiusMiles(parseInt(e.target.value) || 0)}
            min={1}
            max={500}
            fullWidth
          />
        </div>

        {/* Rates */}
        <div className="grid grid-cols-2 gap-4">
          <TextInput
            id="profile-hourly-rate"
            label="Hourly Rate ($)"
            type="number"
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
            step="0.01"
            min="0"
            placeholder="75.00"
            fullWidth
          />
          <TextInput
            id="profile-qa-rate"
            label="Q&A Rate ($)"
            type="number"
            value={qaRate}
            onChange={(e) => setQaRate(e.target.value)}
            step="0.01"
            min="0"
            placeholder="10.00"
            fullWidth
          />
        </div>

        {/* Availability */}
        <Toggle
          id="profile-available"
          label="Available for Work"
          description="Toggle off to pause receiving new questions"
          checked={isAvailable}
          onChange={setIsAvailable}
        />

        {/* Specialties */}
        <div>
          <p className="text-sm font-semibold text-[var(--earth-brown-dark)] mb-2">Specialties</p>
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
                <Button
                  type="button"
                  variant={spec.isPrimary ? 'primary' : 'ghost'}
                  size="xs"
                  onClick={() => updateSpecialty(index, 'isPrimary', true)}
                >
                  Primary
                </Button>
                {specialties.length > 1 && (
                  <IconButton
                    icon={X}
                    iconSize={16}
                    label="Remove specialty"
                    onClick={() => removeSpecialty(index)}
                    className="!p-1.5"
                  />
                )}
              </div>
            ))}
          </div>
          {specialties.length < 5 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              leftIcon={Plus}
              onClick={addSpecialty}
              className="mt-2 !text-slate-blue hover:!text-slate-blue-dark"
            >
              Add Specialty
            </Button>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <Alert variant={toast.type === 'success' ? 'success' : 'error'}>
            {toast.message}
          </Alert>
        )}

        {/* Save */}
        <Button
          variant="primary"
          size="md"
          leftIcon={saving ? undefined : Save}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
        </Button>
      </div>

      {/* Embeddable Badge */}
      {profile && (
        <Card surface rounded="2xl" shadow="sm" padding="lg" className="mt-6 space-y-4">
          <SectionHeader
            size="sm"
            title="Embeddable Badge"
            subtitle="Add your verified expert badge to your website, portfolio, or social profiles."
          />

          {/* Badge preview */}
          <div className="bg-white border border-earth-sand rounded-lg p-4 flex items-center justify-center">
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
            <p className="text-xs font-semibold text-earth-brown mb-1">HTML Embed Code</p>
            <div className="bg-[#3E2723] text-earth-tan rounded-lg p-3 pr-12 text-xs font-mono overflow-x-auto">
              {`<a href="${typeof window !== 'undefined' ? window.location.origin : ''}/experts/${profile.id}" target="_blank" rel="noopener"><img src="${typeof window !== 'undefined' ? window.location.origin : ''}/api/experts/${profile.id}/badge" alt="Verified Expert on DIY Helper" width="280" height="90" /></a>`}
            </div>
            <IconButton
              icon={badgeCopied ? CheckCircle2 : Copy}
              iconSize={14}
              label="Copy embed code"
              onClick={() => {
                const origin = window.location.origin;
                const code = `<a href="${origin}/experts/${profile.id}" target="_blank" rel="noopener"><img src="${origin}/api/experts/${profile.id}/badge" alt="Verified Expert on DIY Helper" width="280" height="90" /></a>`;
                navigator.clipboard.writeText(code);
                setBadgeCopied(true);
                setTimeout(() => setBadgeCopied(false), 2000);
              }}
              className="absolute top-7 right-2 !p-1.5 hover:bg-earth-tan"
            />
          </div>

          <p className="text-xs text-muted">
            Your badge updates automatically as you answer questions and earn reviews.
          </p>
        </Card>
      )}
    </div>
  );
}
