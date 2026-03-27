'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import DIYerHeader from '@/components/DIYerHeader';
import { ArrowLeft, Save } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import TextInput from '@/components/ui/TextInput';
import Alert from '@/components/ui/Alert';

interface UserProfile {
  email: string | null;
  displayName: string | null;
  phone: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        redirectToSignIn(router, '/profile');
        return;
      }
      setUser({ id: user.id, email: user.email ?? undefined });

      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        const res = await fetch('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data.profile);
          setDisplayName(data.profile.displayName || '');
          setPhone(data.profile.phone || '');
        }
      } catch {
        // ignore
      }
      setLoading(false);
    }
    init();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName, phone }),
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

  if (loading) {
    return (
      <div className="min-h-screen bg-earth-brown-dark flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-brown-dark">
      <DIYerHeader />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--earth-sand)] hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">My Profile</h2>
          <p className="text-sm text-[var(--earth-sand)] mt-0.5">Manage your account information</p>
        </div>

        <div className="space-y-5">
          <TextInput
            id="profile-display-name"
            label="Display Name"
            labelClassName="text-white"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            fullWidth
            maxLength={100}
          />

          <div>
            <TextInput
              id="profile-email"
              label="Email"
              labelClassName="text-white"
              type="email"
              value={profile?.email || ''}
              readOnly
              fullWidth
              className="cursor-not-allowed opacity-60"
            />
            <p className="text-xs text-[var(--earth-sand)]/70 mt-1">Email cannot be changed here</p>
          </div>

          <TextInput
            id="profile-phone"
            label="Phone"
            labelClassName="text-white"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            fullWidth
            maxLength={20}
          />

          <TextInput
            id="profile-created"
            label="Account Created"
            labelClassName="text-white"
            type="text"
            value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
            readOnly
            fullWidth
            className="cursor-not-allowed opacity-60"
          />

          {toast && (
            <Alert variant={toast.type === 'success' ? 'success' : 'error'}>
              {toast.message}
            </Alert>
          )}

          <Button variant="primary" onClick={handleSave} disabled={saving} leftIcon={saving ? undefined : Save} iconSize={16}>
            {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
