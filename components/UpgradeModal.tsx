'use client';

import { useState } from 'react';
import { Zap, FileText, MessageSquare, Shield, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: string;
}

const PRO_BENEFITS = [
  { icon: FileText, text: 'Unlimited project reports' },
  { icon: MessageSquare, text: 'Unlimited chat messages' },
  { icon: Shield, text: 'Priority expert matching' },
  { icon: Star, text: 'Advanced AI recommendations' },
];

export default function UpgradeModal({ isOpen, onClose, feature }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to upgrade.');
        setLoading(false);
        return;
      }
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to create checkout session.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-[#C67B5C]/10 rounded-full mb-3">
            <Zap size={24} className="text-[#C67B5C]" />
          </div>
          <h2 className="text-xl font-bold text-[#3E2723]">Upgrade to Pro</h2>
          {feature && (
            <p className="text-sm text-[#7D6B5D] mt-1">
              Unlock {feature} and more with Pro
            </p>
          )}
        </div>

        <ul className="space-y-3 mb-6">
          {PRO_BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#4A7C59]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-[#4A7C59]" />
              </div>
              <span className="text-sm text-[#3E2723]">{text}</span>
            </li>
          ))}
        </ul>

        <div className="text-center mb-4">
          <span className="text-3xl font-bold text-[#3E2723]">$9.99</span>
          <span className="text-sm text-[#7D6B5D]">/month</span>
        </div>

        {error && (
          <p className="text-sm text-red-600 text-center mb-3">{error}</p>
        )}

        <Button variant="primary" fullWidth onClick={handleUpgrade} disabled={loading}>
          {loading ? 'Redirecting...' : 'Upgrade Now'}
        </Button>

        <p className="text-xs text-center text-[#7D6B5D] mt-3">
          Cancel anytime. Secure checkout via Stripe.
        </p>
    </Modal>
  );
}
