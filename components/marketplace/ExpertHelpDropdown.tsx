'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, MessageSquare, Video, Briefcase } from 'lucide-react';

interface ExpertHelpDropdownProps {
  reportId: string;
  proRequired?: boolean;
  totalCost?: number;
  isAuthenticated: boolean;
}

export default function ExpertHelpDropdown({
  reportId,
  proRequired = false,
  isAuthenticated,
}: ExpertHelpDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    {
      label: 'Ask a Quick Question ($5-15)',
      description: 'Get expert advice on your project',
      icon: MessageSquare,
      href: isAuthenticated ? `/marketplace/qa?reportId=${reportId}` : undefined,
      comingSoon: false,
    },
    {
      label: 'Book a Consultation',
      description: 'Video call with an expert',
      icon: Video,
      href: undefined,
      comingSoon: true,
    },
    {
      label: 'Get Contractor Bids (Free)',
      description: 'Receive bids from local contractors',
      icon: Briefcase,
      href: undefined,
      comingSoon: true,
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-[#5D7B93] hover:bg-[#4A6578] transition-colors shadow-md"
      >
        {proRequired && (
          <span className="w-2 h-2 bg-[#C67B5C] rounded-full animate-pulse" />
        )}
        Get Expert Help
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg shadow-xl z-50 overflow-hidden">
          {options.map(({ label, description, icon: Icon, href, comingSoon }) => {
            if (comingSoon) {
              return (
                <div
                  key={label}
                  className="flex items-start gap-3 px-4 py-3 border-b border-[#D4C8B8]/50 opacity-60 cursor-default"
                >
                  <Icon size={18} className="text-[#7D6B5D] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#3E2723]">{label}</p>
                    <p className="text-xs text-[#7D6B5D]">{description}</p>
                    <span className="text-xs text-[#B0A696] italic">Coming Soon</span>
                  </div>
                </div>
              );
            }

            if (!isAuthenticated) {
              return (
                <a
                  key={label}
                  href="/chat"
                  className="flex items-start gap-3 px-4 py-3 border-b border-[#D4C8B8]/50 hover:bg-[#E8DFD0]/50 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon size={18} className="text-[#5D7B93] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-[#3E2723]">{label}</p>
                    <p className="text-xs text-[#7D6B5D]">Sign in required</p>
                  </div>
                </a>
              );
            }

            return (
              <a
                key={label}
                href={href}
                className="flex items-start gap-3 px-4 py-3 border-b border-[#D4C8B8]/50 hover:bg-[#E8DFD0]/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} className="text-[#5D7B93] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#3E2723]">{label}</p>
                  <p className="text-xs text-[#7D6B5D]">{description}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
