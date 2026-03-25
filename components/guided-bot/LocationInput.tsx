'use client';

import { useState } from 'react';

interface LocationInputProps {
  onSubmit: (city: string, state: string) => void;
}

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

export default function LocationInput({ onSubmit }: LocationInputProps) {
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim() && state) {
      onSubmit(city.trim(), state);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/10 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1">City</label>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g., Austin"
          className="w-full px-3 py-2.5 text-sm text-white placeholder-white/40 bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-[#C67B5C]"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-white/60 mb-1">State</label>
        <select
          value={state}
          onChange={(e) => setState(e.target.value)}
          className="w-full px-3 py-2.5 text-sm text-white bg-white/10 border border-white/20 rounded-lg focus:outline-none focus:border-[#C67B5C]"
        >
          <option value="" className="bg-[#4A3F35]">Select a state</option>
          {US_STATES.map(s => (
            <option key={s} value={s} className="bg-[#4A3F35]">{s}</option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={!city.trim() || !state}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          city.trim() && state
            ? 'bg-[#C67B5C] text-white hover:bg-[#A65D3F]'
            : 'bg-white/10 text-white/30 cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </form>
  );
}
