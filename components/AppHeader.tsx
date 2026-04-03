'use client';

import { useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Package, HelpCircle, Users, X, ChevronLeft, ShoppingCart, MessageSquarePlus } from 'lucide-react';
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
import ShoppingListView from './ShoppingListView';
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
  /** Number of materials detected — shows badge in header */
  materialsCount?: number;
}

export default function AppHeader({
  extraRight,
  showBack,
  backLabel = 'Home',
  onBack,
  onProjectSelect,
  projectsRefreshTrigger,
  materialsCount,
}: AppHeaderProps) {
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [shoppingProjects, setShoppingProjects] = useState<Project[]>([]);
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

  // Close any open drawer on Escape key
  const closeAllDrawers = useCallback(() => {
    setShowProjects(false);
    setShowInventory(false);
    setShowQuestions(false);
    setShowShoppingList(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAllDrawers();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllDrawers]);

  // Load projects when shopping drawer opens without a selection
  useEffect(() => {
    if (showShoppingList && !selectedProject && user) {
      supabase.from('projects').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setShoppingProjects(data); });
    }
  }, [showShoppingList, selectedProject, user]);

  const openQuestionsDrawer = async () => {
    if (showQuestions) { setShowQuestions(false); return; }
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
    setSelectedProject(project);
    if (onProjectSelect) {
      onProjectSelect(project);
    } else if (project) {
      router.push('/');
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
          <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-80 bg-[var(--earth-brown-dark)] shadow-xl animate-slide-in-left flex flex-col">
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
          <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-md bg-[var(--earth-brown-dark)] shadow-xl animate-slide-in-right flex flex-col">
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

      {showShoppingList && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowShoppingList(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[90vw] max-w-lg bg-[var(--earth-brown-dark)] shadow-xl animate-slide-in-right flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--blueprint-grid-major)]">
              <h2 className="font-bold text-lg text-white flex items-center gap-2">
                <ShoppingCart size={18} className="text-white/50" />
                Shopping List
              </h2>
              <button onClick={() => setShowShoppingList(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-[var(--earth-sand)]" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedProject ? (
                <ShoppingListView project={selectedProject} isMobile={true} />
              ) : !user ? (
                <div className="p-4">
                  <div className="text-center py-8">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-white/30" />
                    <p className="text-sm text-white/60 mb-2">Sign in to save and track your shopping lists</p>
                    <p className="text-sm text-white/40 leading-relaxed mb-4">
                      Get materials lists from your chats, track purchases, and compare local store prices.
                    </p>
                    <button
                      onClick={() => {
                        setShowShoppingList(false);
                        setShowAuth(true);
                      }}
                      className="px-4 py-2 bg-terracotta text-white text-sm font-medium rounded-lg hover:bg-terracotta/90 transition-colors"
                    >
                      Sign in to get started
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-sm text-white/60 mb-3">Select a project to view its shopping list:</p>
                  {shoppingProjects.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                      <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm text-white/60 mb-2">No shopping lists yet</p>
                      <p className="text-sm text-white/40 leading-relaxed">
                        Start a chat and ask for a materials list. When the AI suggests items, click &lsquo;Save Materials&rsquo; to add them here.
                      </p>
                      <button
                        onClick={() => {
                          setShowShoppingList(false);
                          const chatInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder]');
                          if (chatInput) {
                            chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            chatInput.focus();
                          } else {
                            router.push('/');
                          }
                        }}
                        className="mt-4 text-sm text-[var(--earth-sand)] hover:text-white transition-colors underline underline-offset-2"
                      >
                        Go to chat
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shoppingProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setSelectedProject(p)}
                          className="w-full text-left px-3 py-2.5 rounded-lg border border-white/[0.06] hover:border-forest-green/40 hover:bg-white/10 transition-colors"
                        >
                          <div className="text-sm font-medium text-white">{p.name}</div>
                          {p.description && <div className="text-xs text-white/50 mt-0.5 truncate">{p.description}</div>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
                  className="flex items-center gap-1 text-[var(--earth-sand)] hover:text-white hover:bg-white/10 transition-colors text-sm font-medium mt-0.5 px-2 py-1 rounded-md -ml-1.5"
                >
                  <MessageSquarePlus size={14} />
                  New Chat
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              {user && (
                <Button variant="ghost" size="sm" leftIcon={FolderOpen} iconSize={18} onClick={() => setShowProjects(prev => !prev)} className={btnClass}>
                  <span className="text-xs sm:text-sm">Projects</span>
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" leftIcon={Package} iconSize={18} onClick={() => setShowInventory(prev => !prev)} className={btnClass}>
                  <span className="text-xs sm:text-sm">My Tools</span>
                </Button>
              )}
              {user && (
                <Button variant="ghost" size="sm" leftIcon={HelpCircle} iconSize={18} onClick={openQuestionsDrawer} className={btnClass}>
                  <span className="text-xs sm:text-sm">My Questions</span>
                </Button>
              )}
              <button onClick={() => setShowShoppingList(prev => !prev)} className={`${btnClass} relative flex items-center gap-1 px-2 py-1 text-sm rounded-lg hover:bg-white/10 transition-colors`}>
                <ShoppingCart size={18} />
                {materialsCount && materialsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-terracotta text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {materialsCount}
                  </span>
                )}
                <span className="text-xs sm:text-sm ml-1">Shopping</span>
              </button>
              <Button variant="ghost" size="sm" leftIcon={Users} iconSize={18} href="/experts" className={`${btnClass} hidden sm:inline-flex`}>
                Find an Expert
              </Button>
              {!isExpert && (
                <Button variant="ghost" size="sm" href="/experts/register" className={`${btnClass} hidden sm:inline-flex`}>
                  For Pros
                </Button>
              )}
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
