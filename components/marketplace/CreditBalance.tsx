'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreditBalanceProps {
  className?: string;
  /** If true, shows even when balance is 0 */
  showZero?: boolean;
}

export default function CreditBalance({ className = '', showZero = false }: CreditBalanceProps) {
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function fetchCredits() {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;

        const res = await fetch('/api/qa/credits', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setBalanceCents(data.balanceCents ?? 0);
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    }
    fetchCredits();
  }, []);

  if (!loaded) return null;
  if (balanceCents <= 0 && !showZero) return null;

  return (
    <div className={`flex items-center gap-1.5 text-sm ${className}`}>
      <Wallet size={14} className="text-[#4A7C59]" />
      <span className="text-[#4A7C59] font-medium">
        ${(balanceCents / 100).toFixed(2)} in credits
      </span>
    </div>
  );
}
