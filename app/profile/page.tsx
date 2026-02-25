'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import AuthButton from '@/components/AuthButton';
import NotificationBell from '@/components/NotificationBell';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import { Wrench, ArrowLeft, Loader2, Save, CheckCircle, AlertCircle } from 'lucide-react';

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
        router.push('/');
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
      <div className="min-h-screen bg-[#F5F0E6] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#C67B5C]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E6]">
      {/* Header */}
      <header className="bg-[#FDFBF7] border-b border-[#D4C8B8] shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-[#C67B5C] to-[#A65D3F] p-1.5 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#3E2723]">DIY Helper</span>
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
          className="inline-flex items-center gap-1.5 text-sm text-[#7D6B5D] hover:text-[#3E2723] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div className="bg-[#FDFBF7] rounded-2xl border border-[#D4C8B8] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E8DFD0]">
            <h1 className="text-xl font-bold text-[#3E2723]">My Profile</h1>
            <p className="text-sm text-[#7D6B5D] mt-1">Manage your account information</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Display Name */}
            <div>
              <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
                maxLength={100}
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={profile?.email || ''}
                readOnly
                className="w-full border border-[#E8DFD0] rounded-lg px-4 py-2.5 text-[#7D6B5D] bg-[#F5F0E6] cursor-not-allowed"
              />
              <p className="text-xs text-[#A89880] mt-1">Email cannot be changed here</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full border border-[#D4C8B8] rounded-lg px-4 py-2.5 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#C67B5C] bg-white placeholder-[#A89880]"
                maxLength={20}
              />
            </div>

            {/* Account Created (read-only) */}
            <div>
              <label className="block text-sm font-semibold text-[#3E2723] mb-1.5">
                Account Created
              </label>
              <input
                type="text"
                value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}
                readOnly
                className="w-full border border-[#E8DFD0] rounded-lg px-4 py-2.5 text-[#7D6B5D] bg-[#F5F0E6] cursor-not-allowed"
              />
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

            {/* Save button */}
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
      </div>
    </div>
  );
}
