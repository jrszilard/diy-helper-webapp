'use client';

import { useState } from 'react';
import { Search, Loader2, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';

interface CodeLookupProps {
  questionId: string;
}

interface CodeResult {
  codes: string;
  disclaimer: string;
  location: string;
  topic: string;
}

export default function CodeLookup({ questionId }: CodeLookupProps) {
  const [topic, setTopic] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // questionId kept for future use (scoping codes to a question context)
  void questionId;

  const handleSearch = async () => {
    if (!topic.trim() || state.length !== 2) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) {
        setError('Please sign in to use code lookup.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/experts/tools/code-lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: topic.trim(),
          state: state.toUpperCase(),
          city: city.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to look up codes.');
        setLoading(false);
        return;
      }

      const data: CodeResult = await res.json();
      setResult(data);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2">
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Topic (e.g., electrical panel upgrade)"
          className="px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] bg-white focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
          maxLength={500}
        />
        <input
          value={state}
          onChange={e => setState(e.target.value.toUpperCase().slice(0, 2))}
          placeholder="ST"
          className="w-12 px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] bg-white text-center uppercase focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
          maxLength={2}
        />
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="City (optional)"
          className="w-28 px-2 py-1.5 border border-[#D4C8B8] rounded text-xs text-[#3E2723] bg-white focus:outline-none focus:ring-1 focus:ring-[#C67B5C]/50"
          maxLength={100}
        />
      </div>

      <button
        onClick={handleSearch}
        disabled={loading || !topic.trim() || state.length !== 2}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#5D7B93] rounded hover:bg-[#4A6578] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
        {loading ? 'Searching...' : 'Search Codes'}
      </button>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {result && (
        <div className="space-y-2">
          <div className="max-h-64 overflow-y-auto border border-[#D4C8B8] rounded p-3 bg-[#FDFBF7]">
            <p className="text-[10px] text-[#A89880] mb-2">
              {result.location} &middot; {result.topic}
            </p>
            <div className="prose prose-sm max-w-none text-xs text-[#3E2723] [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs [&_a]:text-[#5D7B93]">
              <ReactMarkdown>{result.codes}</ReactMarkdown>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-[10px] text-[#A89880]">
            <AlertTriangle size={10} className="mt-0.5 flex-shrink-0" />
            <span>{result.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
