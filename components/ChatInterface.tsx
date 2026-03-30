'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Package, X, Trash2, FolderPlus, MessageSquare, Sparkles } from 'lucide-react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import GuestExpertCallout from './GuestExpertCallout';
import SaveMaterialsDialog from './SaveMaterialsDialog';
import ConversationList from './ConversationList';
import ProjectPlanner from './ProjectPlanner';
import Button from '@/components/ui/Button';
import { useChat } from '@/hooks/useChat';
import { useProjectActions } from '@/hooks/useProjectActions';
import { analyzeTerminology } from '@/lib/intelligence/trade-terminology';
import type { Message } from '@/hooks/useChat';

export default function ChatInterface({
  projectId: initialProjectId,
  onProjectLinked,
  userId,
  onOpenInventory,
  onRequestAuth
}: {
  projectId?: string;
  onProjectLinked?: (projectId: string) => void;
  userId?: string;
  onOpenInventory?: () => void;
  onRequestAuth?: () => void;
}) {
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);

  const chat = useChat({ projectId, conversationId: undefined });
  const projectActions = useProjectActions({ userId });

  // Hydrate chat state from sessionStorage (set by landing page redirect)
  useEffect(() => {
    const resumeId = sessionStorage.getItem('diy-helper-resume-conversation-id');
    sessionStorage.removeItem('diy-helper-resume-conversation-id');

    try {
      const storedConvId = sessionStorage.getItem('diy-helper-conversation-id');
      const storedMessages = sessionStorage.getItem('diy-helper-chat-messages');
      if (storedConvId && storedMessages) {
        const parsed = JSON.parse(storedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          chat.handleSelectConversation(storedConvId, parsed);
        }
      }
      sessionStorage.removeItem('diy-helper-conversation-id');
      sessionStorage.removeItem('diy-helper-chat-messages');
    } catch {
      // ignore parse errors
    }

    // Resume a conversation from history (ID only — fetch messages from API)
    if (resumeId) {
      fetch(`/api/conversations/${resumeId}/messages`)
        .then(r => r.ok ? r.json() : null)
        .then((msgs: Array<{ role: string; content: string }> | null) => {
          if (msgs && msgs.length > 0) {
            chat.handleSelectConversation(resumeId, msgs as Message[]);
          }
        })
        .catch(() => {/* ignore */});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Detect the dominant trade domain from conversation content
  const conversationDomain = useMemo(() => {
    if (chat.messages.length === 0) return 'general';
    const allContent = chat.messages.map(m => m.content).join(' ');
    const analyses = analyzeTerminology(allContent);
    const best = analyses.reduce((top, cur) =>
      cur.advancedTermCount > top.advancedTermCount ? cur : top
    );
    return best.advancedTermCount > 0 ? best.domain : 'general';
  }, [chat.messages]);

  const planner = ProjectPlanner({
    userId,
    onProjectCreated: (id) => {
      setProjectId(id);
      onProjectLinked?.(id);
    },
  });

  const saveToProject = useCallback(async (targetProjectId: string, isGuestProject: boolean = false) => {
    if (!chat.extractedMaterials) return;

    try {
      const count = await projectActions.saveMaterials(
        targetProjectId,
        chat.extractedMaterials.materials,
        isGuestProject || projectActions.isGuestMode
      );

      if (count > 0) {
        setProjectId(targetProjectId);
        chat.setShowSaveDialog(false);
        chat.setExtractedMaterials(null);
        onProjectLinked?.(targetProjectId);

        let successMsg = `Saved ${count} items to your project!`;
        if (chat.extractedMaterials.owned_items && chat.extractedMaterials.owned_items.length > 0) {
          successMsg += ` (${chat.extractedMaterials.owned_items.length} items you already own were excluded)`;
        }
        if (isGuestProject || projectActions.isGuestMode) {
          successMsg += `\n\n**Tip:** Sign in to sync your projects across devices and unlock price comparison features.`;
        } else {
          successMsg += ` The shopping list should now appear on the right.`;
        }
        chat.setMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error:', message);
      alert('An error occurred while saving materials: ' + message);
    }
  }, [chat.extractedMaterials, projectActions, onProjectLinked]);

  const createNewProjectAndSave = useCallback(async () => {
    if (!chat.extractedMaterials) return;

    if (projectActions.isGuestMode) {
      const project = await projectActions.createProject(
        chat.extractedMaterials.project_description || 'My DIY Project',
        `Created ${new Date().toLocaleDateString()}`
      );
      if (project) await saveToProject(project.id, true);
      return;
    }

    setNewProjectName(chat.extractedMaterials.project_description);
    setShowCreateProjectDialog(true);
  }, [chat.extractedMaterials, projectActions, saveToProject]);

  const confirmCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    if (!userId && !projectActions.isGuestMode) {
      setShowCreateProjectDialog(false);
      setShowAuthPrompt(true);
      return;
    }

    const description = chat.extractedMaterials?.project_description ||
      chat.messages.find(m => m.role === 'user')?.content.slice(0, 200) ||
      'DIY Project';

    const project = await projectActions.createProject(newProjectName.trim(), description);
    if (!project) {
      alert('Failed to create project');
      return;
    }

    setShowCreateProjectDialog(false);
    setNewProjectName('');

    if (chat.extractedMaterials) {
      await saveToProject(project.id);
    } else {
      setProjectId(project.id);
      onProjectLinked?.(project.id);
      chat.setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Created project "${newProjectName.trim()}"! Your conversation is now linked to this project.` }
      ]);
    }
  }, [newProjectName, userId, projectActions, chat.extractedMaterials, chat.messages, saveToProject, onProjectLinked]);

  const handleSaveToProjectButton = useCallback(() => {
    if (chat.extractedMaterials) {
      createNewProjectAndSave();
    } else if (!userId) {
      const project = projectActions.createProject(
        chat.messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'My DIY Project',
        `Created ${new Date().toLocaleDateString()}`
      );
      project.then(p => {
        if (p) {
          setProjectId(p.id);
          onProjectLinked?.(p.id);
          chat.setMessages(prev => [
            ...prev,
            { role: 'assistant', content: `Project saved! You can now save materials to this project.\n\n**Tip:** Sign in to sync across devices.` }
          ]);
        }
      });
    } else {
      setNewProjectName('');
      setShowCreateProjectDialog(true);
    }
  }, [chat.extractedMaterials, chat.messages, userId, projectActions, createNewProjectAndSave, onProjectLinked]);

  const handleNewChat = useCallback(() => {
    chat.handleNewChat();
    setShowConversationList(false);
  }, [chat.handleNewChat]);

  const handleSelectConversation = useCallback((id: string, msgs: Message[]) => {
    chat.handleSelectConversation(id, msgs);
    setShowConversationList(false);
  }, [chat.handleSelectConversation]);

  return (
    <div className="flex flex-col h-full bg-earth-cream">
      {/* Inventory Update Notification Toast */}
      {chat.inventoryNotification && (
        <div className={`fixed top-20 right-4 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in max-w-sm ${
          chat.inventoryNotification.authRequired ? 'bg-rust' : 'bg-forest-green'
        }`}>
          <Package size={20} className="flex-shrink-0" />
          <div className="flex-1">
            {chat.inventoryNotification.authRequired ? (
              <p className="font-medium text-sm">
                Sign in to save items to your inventory
              </p>
            ) : (<>
            {chat.inventoryNotification.added.length > 0 && (
              <p className="font-medium text-sm">
                Added to inventory: {chat.inventoryNotification.added.join(', ')}
              </p>
            )}
            {chat.inventoryNotification.existing.length > 0 && (
              <p className="font-medium text-sm">
                Already in inventory: {chat.inventoryNotification.existing.join(', ')}
              </p>
            )}
            </>)}
          </div>
          <button
            onClick={() => chat.setInventoryNotification(null)}
            className="ml-2 hover:bg-forest-green-dark p-1 rounded flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface border-b border-earth-sand p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">DIY Helper Chat</h1>
          {projectId && (
            <p className="text-sm text-earth-brown">
              Linked to project: {projectActions.projects.find(p => p.id === projectId)?.name || 'Unknown'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {userId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowConversationList(true)}
              leftIcon={MessageSquare}
              iconSize={18}
              aria-label="Conversation history"
              title="Conversation history"
            >
              <span className="hidden sm:inline">History</span>
            </Button>
          )}
          {chat.messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm('Clear chat history? This cannot be undone.')) {
                  chat.handleNewChat();
                }
              }}
              leftIcon={Trash2}
              iconSize={18}
              className="hover:text-rust hover:bg-[var(--status-progress-bg)]"
              aria-label="Clear chat history"
              title="Clear chat history"
            >
              <span className="hidden sm:inline">Clear</span>
            </Button>
          )}
          {chat.messages.length > 0 && !projectId && (
            <Button
              variant="primary"
              onClick={handleSaveToProjectButton}
              leftIcon={FolderPlus}
              iconSize={18}
              title="Save this conversation to a new project"
            >
              <span className="hidden sm:inline">Save to Project</span>
            </Button>
          )}
          <Button
            variant="tertiary"
            onClick={() => planner.handleOpenIntake(chat.input)}
            leftIcon={Sparkles}
            iconSize={18}
            title="AI agents will research, design, and price your project"
          >
            <span className="hidden sm:inline">Plan My Project</span>
          </Button>
          {onOpenInventory && (
            <Button
              variant="secondary"
              onClick={onOpenInventory}
              leftIcon={Package}
              iconSize={18}
              title="View your tool inventory"
            >
              <span className="hidden sm:inline">My Tools</span>
            </Button>
          )}
        </div>
      </div>

      {/* Planner views (progress/report) replace the chat area when active */}
      {planner.view === 'progress' || planner.view === 'report' ? (
        planner.renderPlanner()
      ) : (
        <>
          {/* Messages */}
          <ChatMessages
            messages={chat.messages}
            streamingContent={chat.streamingContent}
            isStreaming={chat.isStreaming}
            progressSteps={chat.progressSteps}
            failedMessage={chat.failedMessage}
            onRetry={chat.handleRetry}
            messagesEndRef={chat.messagesEndRef}
            conversationDomain={conversationDomain}
            user={userId ? { id: userId } : null}
          />

          {/* Guest expert upsell */}
          {!userId && (
            <GuestExpertCallout
              messageCount={chat.messages.length}
              onRequestAuth={onRequestAuth}
            />
          )}

          {/* Input area with banners */}
          <ChatInput
            input={chat.input}
            onInputChange={chat.setInput}
            onSend={chat.sendMessage}
            isLoading={chat.isLoading}
            showGoogleFallback={chat.showGoogleFallback}
            onGoogleSearch={chat.handleGoogleSearch}
            showMaterialsBanner={chat.showMaterialsBanner}
            isAutoExtracting={chat.isAutoExtracting}
            onAutoExtractMaterials={chat.handleAutoExtractMaterials}
          />
        </>
      )}

      {/* Floating Save to Project Banner */}
      {chat.messages.length > 0 && !projectId && !chat.isLoading && planner.view === 'idle' && (
        <div className="bg-gradient-to-r from-terracotta to-terracotta-dark px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white min-w-0">
              <FolderPlus size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                Save this conversation to track your project
              </span>
            </div>
            <button
              onClick={handleSaveToProjectButton}
              className="flex-shrink-0 bg-white text-terracotta px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-[#FDF8F3] transition-colors shadow-sm"
            >
              Save to Project
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SaveMaterialsDialog
        showSaveDialog={chat.showSaveDialog}
        showCreateProjectDialog={showCreateProjectDialog}
        showAuthPrompt={showAuthPrompt}
        extractedMaterials={chat.extractedMaterials}
        projects={projectActions.projects}
        guestProjects={projectActions.guestProjects}
        isGuestMode={projectActions.isGuestMode}
        newProjectName={newProjectName}
        onNewProjectNameChange={setNewProjectName}
        onSaveToProject={saveToProject}
        onCreateNewProjectAndSave={createNewProjectAndSave}
        onConfirmCreateProject={confirmCreateProject}
        onCloseSaveDialog={() => {
          chat.setShowSaveDialog(false);
          chat.setExtractedMaterials(null);
        }}
        onCloseCreateDialog={() => {
          setShowCreateProjectDialog(false);
          setNewProjectName('');
        }}
        onCloseAuthPrompt={() => {
          setShowAuthPrompt(false);
          chat.setShowSaveDialog(false);
          setShowCreateProjectDialog(false);
          chat.setExtractedMaterials(null);
        }}
        onRequestAuth={onRequestAuth}
      />

      {/* Conversation History Panel */}
      <ConversationList
        userId={userId}
        isOpen={showConversationList}
        onClose={() => setShowConversationList(false)}
        currentConversationId={chat.conversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* Agent Intake Form Modal (only renders when view is 'intake') */}
      {planner.view === 'intake' && planner.renderPlanner()}
    </div>
  );
}
