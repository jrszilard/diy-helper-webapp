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
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white bg-slate-blue hover:bg-slate-blue-dark transition-colors shadow-md"
      >
        {proRequired && (
          <span className="w-2 h-2 bg-terracotta rounded-full animate-pulse" />
        )}
        Get Expert Help
        <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-surface border border-earth-sand rounded-lg shadow-xl z-50 overflow-hidden">
          {options.map(({ label, description, icon: Icon, href, comingSoon }) => {
            if (comingSoon) {
              return (
                <div
                  key={label}
                  className="flex items-start gap-3 px-4 py-3 border-b border-earth-sand/50 opacity-60 cursor-default"
                >
                  <Icon size={18} className="text-earth-brown mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-earth-brown">{description}</p>
                    <span className="text-xs text-[var(--muted)] italic">Coming Soon</span>
                  </div>
                </div>
              );
            }

            if (!isAuthenticated) {
              return (
                <div
                  key={label}
                  className="px-4 py-3 border-b border-earth-sand/50"
                >
                  <div className="flex items-start gap-3">
                    <Icon size={18} className="text-slate-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      <p className="text-xs text-forest-green font-medium mt-0.5">First question free with a new account</p>
                      <a
                        href="/"
                        onClick={() => {
                          localStorage.setItem('expert-callout-referral', 'true');
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-slate-blue hover:text-slate-blue-dark transition-colors"
                      >
                        Sign up to ask
                        <span aria-hidden="true">&rarr;</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <a
                key={label}
                href={href}
                className="flex items-start gap-3 px-4 py-3 border-b border-earth-sand/50 hover:bg-earth-tan/50 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Icon size={18} className="text-slate-blue mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-earth-brown">{description}</p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
