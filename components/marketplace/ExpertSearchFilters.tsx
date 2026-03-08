'use client';

import { Search } from 'lucide-react';

interface Filters {
  specialty: string;
  state: string;
  minRating: number;
}

interface ExpertSearchFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const SPECIALTY_OPTIONS = [
  { value: '', label: 'All Specialties' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'carpentry', label: 'Carpentry' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'roofing', label: 'Roofing' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'drywall', label: 'Drywall' },
  { value: 'painting', label: 'Painting' },
  { value: 'tile', label: 'Tile' },
  { value: 'landscaping', label: 'Landscaping' },
  { value: 'general_contracting', label: 'General Contracting' },
];

export default function ExpertSearchFilters({ filters, onChange }: ExpertSearchFiltersProps) {
  return (
    <div className="bg-white border border-[#D4C8B8] rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search size={16} className="text-[#7D6B5D]" />
        <h3 className="text-sm font-semibold text-[#3E2723]">Filter Experts</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-[#7D6B5D] mb-1">Specialty</label>
          <select
            value={filters.specialty}
            onChange={e => onChange({ ...filters, specialty: e.target.value })}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          >
            {SPECIALTY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#7D6B5D] mb-1">State</label>
          <input
            type="text"
            value={filters.state}
            onChange={e => onChange({ ...filters, state: e.target.value })}
            placeholder="e.g. CA"
            maxLength={2}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          />
        </div>
        <div>
          <label className="block text-xs text-[#7D6B5D] mb-1">Min Rating</label>
          <select
            value={filters.minRating}
            onChange={e => onChange({ ...filters, minRating: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#C67B5C]/50"
          >
            <option value={0}>Any Rating</option>
            <option value={3}>3+ Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={5}>5 Stars</option>
          </select>
        </div>
      </div>
    </div>
  );
}
