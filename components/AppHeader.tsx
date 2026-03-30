'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Package, HelpCircle, Users, X, ChevronLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import AppLogo from './AppLogo';
import Button from './ui/Button';
import AuthButton from './AuthButton';
import NotificationBell from './NotificationBell';
import ProjectsSidebar from './ProjectsSidebar';
import InventoryPanel from './InventoryPanel';
import QAQuestionList from './marketplace/QAQuestionList';
import ExpertQuickBar from './ExpertQuickBar';
import type { QAQuestion } from '@/lib/marketplace/types';
import type { Project } from '@/types';

interface AppHeaderProps {
  /** Extra buttons in the right area (e.g. shopping cart on the chat page) */
  extraRight?: ReactNode;
  /** Show a ← breadcrumb under the logo */
  showBack?: boolean;
  /** Text for the breadcrumb (default: 'Home') */
  backLabel?: string;
  /** Callback when the breadcrumb is clicked */
  onBack?: () => void;
  /** Custom handler when a project is selected from the Projects drawer */
  onProjectSelect?: (project: Project | null) => void;
  /** Pass the page's project-refresh counter so the drawer sidebar stays in sync */
  projectsRefreshTrigger?: number;
}

export default function AppHeader({
  extraRight,
  showBack,
  backLabel = 'Home',
  onBack,
  onProjectSelect,
  projectsRefreshTrigger,
}: AppHeaderProps) {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [myQuestions, setMyQuestions] = useState<QAQuestion[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const { isExpert, expert, openQueueCount } = useExpertStatus();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user
        ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined }
        : null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user
        ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined }
        : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signIn') === 'true' && !user) setShowAuth(true);
  }, [user]);

  const openQuestionsDrawer = async () => {
    setShowQuestions(true);
    if (questionsLoaded) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) return;
      const res = await fetch('/api/qa?mine=true', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setMyQuestions(data.questions || []);
        setQuestionsLoaded(true);
      }
    } catch { /* ignore */ }
  };

  const handleProjectSelect = (project: Project | null) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    } else if (project) {
      router.push('/chat');
    }
    setShowProjects(false);
  };

  const btnClass = 'text-[var(--earth-sand)] hover:text-white hover:bg-white/10';

  return (
    <>
      {/* Projects drawer */}
      {showProjects && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowProjects(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-80 bg-[#1E1A17] shadow-xl animate-slide-in-left flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--blueprint-grid-major)]">
              <h2 className="font-bold text-lg text-white">My Projects</h2>
              <button onClick={() => setShowProjects(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[var(--earth-sand)]" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <ProjectsSidebar
              user={user}
              onSelectProject={handleProjectSelect}
              isMobile={true}
              refreshTrigger={projectsRefreshTrigger}
            />
          </div>
        </div>
      )}

      {/* My Questions drawer */}
      {showQuestions && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowQuestions(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-md bg-[#1E1A17] shadow-xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--blueprint-grid-major)]">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <HelpCircle size={18} className="text-white/50" />
                My Questions
              </h2>
              <button onClick={() => setShowQuestions(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[var(--earth-sand)]" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <QAQuestionList questions={myQuestions} />
            </div>
          </div>
        </div>
      )}

      {/* Inventory panel */}
      {user && (
        <InventoryPanel userId={user.id} isOpen={showInventory} onClose={() => setShowInventory(false)} />
      )}

      {/* Nav bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--earth-brown-dark)]/95 border-b border-[var(--blueprint-grid-major)]">
        <div className="u-container">
          <div className="flex justify-between items-center h-16">
            <div className="flex flex-col justify-center">
              <AppLogo variant="dark" />
              {showBack && (
                <button
                  onClick={onBack}
                  className="flex items-center gap-0.5 text-[var(--earth-sand)] hover:text-white transition-colors text-xs font-medium mt-0.5"
                >
                  <ChevronLeft size={12} />
                  {backLabel}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <Button variant="ghost" size="sm" leftIcon={FolderOpen} iconSize={18} onClick={() => setShowProjects(true)} className={btnClass}>
                  Projects
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" leftIcon={Package} iconSize={18} onClick={() => setShowInventory(true)} className={btnClass}>
                  My Tools
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" leftIcon={HelpCircle} iconSize={18} onClick={openQuestionsDrawer} className={btnClass}>
                  My Questions
                </Button>
              )}
              <Button variant="ghost" size="sm" leftIcon={Users} iconSize={18} href="/experts" className={btnClass}>
                Find an Expert
              </Button>
              {extraRight}
              <NotificationBell userId={user?.id} />
              <AuthButton user={user} variant="dark" isExpert={isExpert} externalShowAuth={showAuth} onAuthToggle={setShowAuth} />
            </div>
          </div>
        </div>
      </nav>

      {/* Expert quick bar */}
      {isExpert && expert && (
        <ExpertQuickBar displayName={expert.displayName} openQueueCount={openQueueCount} />
      )}
    </>
  );
}
