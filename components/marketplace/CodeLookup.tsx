'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/lib/supabase';
import { TextInput, Select, Button, Card, Badge, Spinner, Alert } from '@/components/ui';

const US_STATES = [
  '', 'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface CodeResult {
  codes: string;
  disclaimer: string;
  location: string;
  topic: string;
}

export default function CodeLookup() {
  const [topic, setTopic] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic.trim() || !state) return;

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
      <TextInput
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Topic (e.g., electrical panel upgrade)"
        fullWidth
        inputSize="sm"
        maxLength={500}
      />

      <div className="grid grid-cols-2 gap-2">
        <Select
          value={state}
          onChange={(e) => setState(e.target.value)}
          fullWidth
          inputSize="sm"
        >
          <option value="">Select state</option>
          {US_STATES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>

        <TextInput
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City (optional)"
          fullWidth
          inputSize="sm"
          maxLength={100}
        />
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={handleSearch}
        disabled={loading || !topic.trim() || !state}
      >
        {loading ? 'Searching...' : 'Search Codes'}
      </Button>

      {loading && (
        <div className="flex items-center justify-center py-4">
          <Spinner size="sm" color="primary" />
        </div>
      )}

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {result && (
        <div className="space-y-2">
          <Card padding="sm" className="max-h-64 overflow-y-auto">
            <p className="text-[10px] text-[var(--earth-brown-light)] mb-2">
              {result.location} &middot; {result.topic}
            </p>
            <div className="prose prose-sm max-w-none text-xs text-[var(--foreground)] [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_p]:text-xs [&_li]:text-xs [&_a]:text-[var(--slate-blue)]">
              <ReactMarkdown>{result.codes}</ReactMarkdown>
            </div>
          </Card>
          <Badge variant="neutral" size="sm">
            {result.disclaimer}
          </Badge>
        </div>
      )}
    </div>
  );
}
