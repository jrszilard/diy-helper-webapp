'use client';

import { useState } from 'react';

interface ScopeInputProps {
  projectType: string;
  onSubmit: (dimensions: string, details: string) => void;
}

const SCOPE_FIELDS: Record<string, { dimensionLabel: string; dimensionPlaceholder: string; detailLabel: string; detailPlaceholder: string }> = {
  electrical: {
    dimensionLabel: 'Location / Room',
    dimensionPlaceholder: 'e.g., Master bedroom, Kitchen',
    detailLabel: 'Additional details',
    detailPlaceholder: 'e.g., Replacing existing fixture, need new wiring run',
  },
  plumbing: {
    dimensionLabel: 'Location / Fixture',
    dimensionPlaceholder: 'e.g., Kitchen sink, Master bathroom',
    detailLabel: 'Current setup',
    detailPlaceholder: 'e.g., Single-handle faucet, copper pipes',
  },
  flooring: {
    dimensionLabel: 'Room & Size',
    dimensionPlaceholder: 'e.g., 10x12 bathroom, 15x20 living room',
    detailLabel: 'Current flooring & subfloor',
    detailPlaceholder: 'e.g., Old vinyl over plywood subfloor',
  },
  outdoor: {
    dimensionLabel: 'Dimensions',
    dimensionPlaceholder: 'e.g., 12x16 feet, 50 linear feet',
    detailLabel: 'Yard / existing setup',
    detailPlaceholder: 'e.g., Flat yard, grass, no existing structure',
  },
  structural: {
    dimensionLabel: 'Area / Size',
    dimensionPlaceholder: 'e.g., 6-inch hole, 4x8 foot section',
    detailLabel: 'Details',
    detailPlaceholder: 'e.g., Damage from doorknob, water damage',
  },
  painting: {
    dimensionLabel: 'Room & Dimensions',
    dimensionPlaceholder: 'e.g., 12x14 bedroom, 8ft ceilings',
    detailLabel: 'Surface conditions',
    detailPlaceholder: 'e.g., Smooth walls, one accent wall, dark existing color',
  },
};

const DEFAULT_FIELDS = {
  dimensionLabel: 'Dimensions / Scope',
  dimensionPlaceholder: 'e.g., Room size, area, or quantity',
  detailLabel: 'Additional details',
  detailPlaceholder: 'Any details that would help plan this project',
};

export default function ScopeInput({ projectType, onSubmit }: ScopeInputProps) {
  const [dimensions, setDimensions] = useState('');
  const [details, setDetails] = useState('');

  const fields = SCOPE_FIELDS[projectType] || DEFAULT_FIELDS;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dimensions.trim()) {
      onSubmit(dimensions.trim(), details.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-[#D4C8B8] rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-medium text-[#5C4D42] mb-1">{fields.dimensionLabel}</label>
        <input
          type="text"
          value={dimensions}
          onChange={(e) => setDimensions(e.target.value)}
          placeholder={fields.dimensionPlaceholder}
          className="w-full px-3 py-2.5 text-sm text-[#3E2723] placeholder-[#7D6B5D] bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg focus:outline-none focus:border-[#C67B5C]"
          autoFocus
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#5C4D42] mb-1">{fields.detailLabel}</label>
        <input
          type="text"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder={fields.detailPlaceholder}
          className="w-full px-3 py-2.5 text-sm text-[#3E2723] placeholder-[#7D6B5D] bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg focus:outline-none focus:border-[#C67B5C]"
        />
      </div>
      <button
        type="submit"
        disabled={!dimensions.trim()}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
          dimensions.trim()
            ? 'bg-[#C67B5C] text-white hover:bg-[#A65D3F]'
            : 'bg-[#E8DFD0] text-[#7D6B5D] cursor-not-allowed'
        }`}
      >
        Continue
      </button>
    </form>
  );
}
