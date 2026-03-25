'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { redirectToSignIn } from '@/lib/auth-redirect';
import AuthButton from '@/components/AuthButton';
import NotificationBell from '@/components/NotificationBell';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import { Wrench, ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import TextInput from '@/components/ui/TextInput';
import SectionHeader from '@/components/ui/SectionHeader';

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
  const { isExpert } = useExpertStatus();

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
      <div className="min-h-screen bg-earth-cream flex items-center justify-center">
        <Spinner size="lg" className="text-terracotta" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-earth-cream">
      {/* Header */}
      <header className="bg-surface border-b border-earth-sand shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-terracotta to-terracotta-dark p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground">DIY Helper</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user?.id} />
            <AuthButton user={user} isExpert={isExpert} />
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          href="/chat"
          className="inline-flex items-center gap-1.5 text-sm text-earth-brown hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div className="bg-surface rounded-2xl border border-earth-sand shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-earth-tan">
            <SectionHeader size="lg" title="My Profile" subtitle="Manage your account information" />
          </div>

          <div className="p-6 space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Display Name
              </label>
              <TextInput
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                fullWidth
                maxLength={100}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Email
              </label>
              <TextInput
                type="email"
                value={profile?.email || ''}
                readOnly
                fullWidth
                className="border-earth-tan text-earth-brown bg-earth-cream cursor-not-allowed"
              />
              <p className="text-xs text-earth-brown-light mt-1">Email cannot be changed here</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Phone
              </label>
              <TextInput
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                fullWidth
                maxLength={20}
              />
            </div>

            {/* Account Created (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">
                Account Created
              </label>
              <TextInput
                type="text"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                readOnly
                fullWidth
                className="border-earth-tan text-earth-brown bg-earth-cream cursor-not-allowed"
              />
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

            {/* Save button */}
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
        </div>
      </div>
    </div>
  );
}
