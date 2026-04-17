'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, Package, HelpCircle, ShoppingCart, Users, X, MessageSquare, Mail, ClipboardCheck, LayoutDashboard, Menu } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useExpertStatus } from '@/hooks/useExpertStatus';
import AppLogo from './AppLogo';
import ProjectsSidebar from './ProjectsSidebar';
import InventoryPanel from './InventoryPanel';
import QAQuestionList from './marketplace/QAQuestionList';
import ShoppingListView from './ShoppingListView';
import IconButton from './ui/IconButton';
import AuthButton from './AuthButton';
import NotificationBell from './NotificationBell';
import type { QAQuestion } from '@/lib/marketplace/types';
import type { Project } from '@/types';

type Panel = 'projects' | 'tools' | 'shopping' | 'questions';

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pt-6 pb-1 text-xs font-semibold uppercase tracking-wider text-white/30">
      {label}
    </p>
  );
}

export default function AppSidebar() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string; name?: string } | null>(null);
  const { isExpert, expert } = useExpertStatus();
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [myQuestions, setMyQuestions] = useState<QAQuestion[]>([]);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [materialsCount, setMaterialsCount] = useState(0);

  // Shopping state
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [shoppingProjects, setShoppingProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.user_metadata?.display_name ?? undefined } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setActivePanel(null); setMobileOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Listen for materials count from chat
  useEffect(() => {
    const handler = (e: Event) => setMaterialsCount((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener('diy:materialsCount', handler);
    return () => window.removeEventListener('diy:materialsCount', handler);
  }, []);

  // When a project is selected, pre-select it in the shopping panel
  useEffect(() => {
    const handler = (e: Event) => {
      const project = (e as CustomEvent<Project>).detail;
      if (project) setSelectedProject(project);
    };
    window.addEventListener('diy:projectSelect', handler);
    return () => window.removeEventListener('diy:projectSelect', handler);
  }, []);

  // Load projects when shopping panel opens
  useEffect(() => {
    if (activePanel === 'shopping' && !selectedProject && user) {
      supabase.from('projects').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => { if (data) setShoppingProjects(data); });
    }
  }, [activePanel, selectedProject, user]);

  const toggle = (panel: Panel) => {
    setMobileOpen(false);
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const openQuestions = async () => {
    toggle('questions');
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

  const navItem = (label: string, icon: React.ReactNode, panel: Panel, onClick?: () => void, badge?: number) => {
    const isActive = activePanel === panel;
    return (
      <button
        onClick={onClick ?? (() => toggle(panel))}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors relative ${
          isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
        }`}
      >
        {icon}
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto w-4 h-4 bg-rust text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {badge}
          </span>
        )}
      </button>
    );
  };

  const panelContainer = 'fixed left-0 md:left-64 top-16 bottom-0 w-[85vw] md:w-80 bg-earth-night border-r border-[var(--blueprint-grid-major)] z-30 flex flex-col shadow-xl animate-slide-in-left';
  const panelHeader = 'flex items-center justify-between p-4 border-b border-[var(--blueprint-grid-major)]';

  return (
    <>
      {/* Mobile trigger — self-contained hamburger, only when sidebar is closed */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed top-3 left-3 z-50 md:hidden p-2 rounded-lg bg-[var(--earth-brown-dark)] text-white/60 hover:text-white hover:bg-white/10 transition-colors shadow-md"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`${mobileOpen ? 'flex' : 'hidden'} md:flex fixed left-0 top-0 bottom-0 w-72 md:w-64 bg-[var(--earth-brown-dark)] border-r border-white/[0.06] flex-col z-40`}>
        <div className="px-5 pt-7 pb-8">
          <AppLogo />
        </div>

        {user && (
          <nav className="px-3 flex-1 overflow-y-auto">
            <SectionLabel label="DIY" />
            {navItem('My Projects', <FolderOpen size={16} />, 'projects')}
            {navItem('My Tools', <Package size={16} />, 'tools')}
            {navItem('Shopping', <ShoppingCart size={16} />, 'shopping', undefined, materialsCount)}

            <SectionLabel label="Experts" />
            <button
              onClick={() => { setMobileOpen(false); router.push('/experts'); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-white/50 hover:text-white hover:bg-white/5"
            >
              <Users size={16} />
              Find an Expert
            </button>
            {navItem('My Questions', <HelpCircle size={16} />, 'questions', openQuestions)}

            {isExpert && (
              <>
                <SectionLabel label="Expert" />
                {[
                  { href: '/experts/dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { href: '/experts/dashboard/qa', label: 'Q&A Queue', icon: MessageSquare },
                  { href: '/experts/dashboard/reviews', label: 'Reviews', icon: ClipboardCheck },
                  { href: '/experts/dashboard/messages', label: 'Messages', icon: Mail },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors text-white/50 hover:text-white hover:bg-white/5"
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        )}

        {/* Bottom: notifications + auth */}
        <div className="mt-auto px-2 pb-4 pt-2 border-t border-white/[0.06] flex items-center gap-2">
          <NotificationBell userId={user?.id} placement="top" />
          <div className="flex-1">
            <AuthButton user={user ? { ...user, name: expert?.displayName ?? user.name } : null} variant="dark" isExpert={isExpert} dropdownPlacement="top" />
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {activePanel && (
        <div className="fixed top-16 inset-x-0 bottom-0 z-20 md:left-64" onClick={() => setActivePanel(null)} />
      )}

      {/* Projects panel */}
      {activePanel === 'projects' && user && (
        <div className={panelContainer}>
          <div className={panelHeader}>
            <div>
              <h2 className="font-bold text-lg text-white">My Projects</h2>
              <p className="text-xs text-[var(--earth-sand)]/60 mt-0.5">Saved conversations</p>
            </div>
            <IconButton icon={X} iconSize={18} label="Close" onClick={() => setActivePanel(null)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white" />
          </div>
          <ProjectsSidebar
            user={user}
            onSelectProject={(project: Project | null) => {
              setActivePanel(null);
              if (!project) return;
              if (window.location.pathname !== '/') router.push('/');
              window.dispatchEvent(new CustomEvent('diy:projectSelect', { detail: project }));
            }}
            isMobile={false}
          />
        </div>
      )}

      {/* Tools panel */}
      {user && (
        <InventoryPanel
          userId={user.id}
          isOpen={activePanel === 'tools'}
          onClose={() => setActivePanel(null)}
        />
      )}

      {/* Shopping panel */}
      {activePanel === 'shopping' && (
        <div className={panelContainer}>
          <div className={panelHeader}>
            <div>
              <h2 className="font-bold text-lg text-white">Shopping List</h2>
              <p className="text-xs text-[var(--earth-sand)]/60 mt-0.5">Materials by project</p>
            </div>
            <IconButton icon={X} iconSize={18} label="Close" onClick={() => setActivePanel(null)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white" />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedProject ? (
              <ShoppingListView project={selectedProject} isMobile={true} />
            ) : !user ? (
              <div className="p-6 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-sm text-white/60 mb-1">Sign in to track your shopping lists</p>
                <p className="text-xs text-white/30">Get materials from chats, track purchases, compare prices.</p>
              </div>
            ) : shoppingProjects.length === 0 ? (
              <div className="p-6 text-center">
                <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-white/20" />
                <p className="text-sm text-white/60 mb-1">No shopping lists yet</p>
                <p className="text-xs text-white/30 leading-relaxed">Start a chat, ask for a materials list, then save it to a project.</p>
                <button
                  onClick={() => {
                    setActivePanel(null);
                    const chatInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder]');
                    if (chatInput) { chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' }); chatInput.focus(); }
                    else router.push('/');
                  }}
                  className="mt-4 text-xs text-[var(--earth-sand)] hover:text-white transition-colors underline underline-offset-2"
                >
                  Go to chat
                </button>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {shoppingProjects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProject(p)}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    {p.description && <div className="text-xs text-[var(--earth-sand)]/50 mt-0.5 truncate">{p.description}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Questions panel */}
      {activePanel === 'questions' && user && (
        <div className={panelContainer}>
          <div className={panelHeader}>
            <div>
              <h2 className="font-bold text-lg text-white">My Questions</h2>
              <p className="text-xs text-[var(--earth-sand)]/60 mt-0.5">{myQuestions.length} question{myQuestions.length !== 1 ? 's' : ''}</p>
            </div>
            <IconButton icon={X} iconSize={18} label="Close" onClick={() => setActivePanel(null)} className="text-[var(--earth-sand)] hover:bg-white/10 hover:text-white" />
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <QAQuestionList questions={myQuestions} />
          </div>
        </div>
      )}
    </>
  );
}
