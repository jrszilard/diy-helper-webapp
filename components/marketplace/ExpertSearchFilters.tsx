'use client';

import { Search } from 'lucide-react';
import TextInput from '@/components/ui/TextInput';
import Select from '@/components/ui/Select';

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
    <div className="bg-white border border-earth-sand rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search size={16} className="text-earth-brown" />
        <h3 className="text-sm font-semibold text-foreground">Filter Experts</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-earth-brown mb-1">Specialty</label>
          <Select
            value={filters.specialty}
            onChange={e => onChange({ ...filters, specialty: e.target.value })}
            fullWidth
          >
            {SPECIALTY_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div>
          <label className="block text-xs text-earth-brown mb-1">State</label>
          <TextInput
            type="text"
            value={filters.state}
            onChange={e => onChange({ ...filters, state: e.target.value })}
            placeholder="e.g. CA"
            maxLength={2}
            fullWidth
          />
        </div>
        <div>
          <label className="block text-xs text-earth-brown mb-1">Min Rating</label>
          <Select
            value={filters.minRating}
            onChange={e => onChange({ ...filters, minRating: parseInt(e.target.value) })}
            fullWidth
          >
            <option value={0}>Any Rating</option>
            <option value={3}>3+ Stars</option>
            <option value={4}>4+ Stars</option>
            <option value={5}>5 Stars</option>
          </Select>
        </div>
      </div>
    </div>
  );
}
