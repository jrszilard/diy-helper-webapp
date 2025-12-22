'use client';

import { ShieldCheck, MessageSquare, Clock, ArrowRight } from 'lucide-react';

interface ExpertCTAProps {
  projectCategory?: string;
  projectDescription?: string;
  variant?: 'inline' | 'card' | 'banner';
}

// Category to expert type mapping
const categoryExperts: Record<string, { type: string; title: string }> = {
  electrical: { type: 'electrician', title: 'Licensed Electrician' },
  plumbing: { type: 'plumber', title: 'Licensed Plumber' },
  structural: { type: 'contractor', title: 'General Contractor' },
  flooring: { type: 'flooring', title: 'Flooring Specialist' },
  painting: { type: 'painter', title: 'Professional Painter' },
  outdoor: { type: 'contractor', title: 'Licensed Contractor' },
  other: { type: 'contractor', title: 'Home Improvement Expert' }
};

export default function ExpertCTA({
  projectCategory = 'other',
  projectDescription,
  variant = 'card'
}: ExpertCTAProps) {
  const expert = categoryExperts[projectCategory] || categoryExperts.other;

  const handleExpertClick = () => {
    // For now, show a coming soon message
    alert('Expert consultation feature coming soon! This will connect you with licensed professionals who can review your DIY plans for safety and code compliance.');
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={handleExpertClick}
        className="inline-flex items-center gap-2 text-amber-600 hover:text-amber-700 font-medium text-sm transition-colors"
      >
        <ShieldCheck className="w-4 h-4" />
        Get expert review
        <ArrowRight className="w-3 h-3" />
      </button>
    );
  }

  if (variant === 'banner') {
    return (
      <div
        onClick={handleExpertClick}
        className="cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6" />
            <div>
              <p className="font-semibold">Need a Pro to Review Your Plan?</p>
              <p className="text-sm text-amber-100">Get expert verification for safety & code compliance</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5" />
        </div>
      </div>
    );
  }

  // Default card variant
  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-200 mt-4">
      <div className="flex items-start gap-4">
        <div className="bg-amber-100 p-3 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-stone-800 text-lg">
            Want a Pro to Double-Check Your Plan?
          </h4>
          <p className="text-sm text-stone-600 mt-1 mb-4">
            A {expert.title} can review your project for safety and code compliance
            before you start. Perfect for electrical, plumbing, or structural work.
          </p>

          <div className="flex flex-wrap gap-4 text-sm text-stone-500 mb-4">
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>Video or chat consultation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Response within 24 hours</span>
            </div>
          </div>

          <button
            onClick={handleExpertClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-all shadow-sm hover:shadow-md"
          >
            Get Expert Review
            <span className="text-amber-200 text-sm font-normal">Starting at $25</span>
          </button>
        </div>
      </div>
    </div>
  );
}
