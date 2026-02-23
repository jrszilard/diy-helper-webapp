'use client';

import { useState, useCallback } from 'react';
import { Package, X, Trash2, FolderPlus, MessageSquare, Sparkles } from 'lucide-react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import SaveMaterialsDialog from './SaveMaterialsDialog';
import ConversationList from './ConversationList';
import ProjectPlanner from './ProjectPlanner';
import { useChat } from '@/hooks/useChat';
import { useProjectActions } from '@/hooks/useProjectActions';
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
    <div className="flex flex-col h-full bg-[#F5F0E6]">
      {/* Inventory Update Notification Toast */}
      {chat.inventoryNotification && (
        <div className={`fixed top-20 right-4 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in max-w-sm ${
          chat.inventoryNotification.authRequired ? 'bg-[#B8593B]' : 'bg-[#4A7C59]'
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
            className="ml-2 hover:bg-[#2D5A3B] p-1 rounded flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#FDFBF7] border-b border-[#D4C8B8] p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#3E2723]">DIY Helper Chat</h1>
          {projectId && (
            <p className="text-sm text-[#7D6B5D]">
              Linked to project: {projectActions.projects.find(p => p.id === projectId)?.name || 'Unknown'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {userId && (
            <button
              onClick={() => setShowConversationList(true)}
              className="flex items-center gap-2 px-3 py-2 text-[#7D6B5D] hover:text-[#5D7B93] hover:bg-[#E8F0F5] rounded-lg transition-colors"
              aria-label="Conversation history"
              title="Conversation history"
            >
              <MessageSquare size={18} />
              <span className="hidden sm:inline text-sm">History</span>
            </button>
          )}
          {chat.messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear chat history? This cannot be undone.')) {
                  chat.handleNewChat();
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-[#7D6B5D] hover:text-[#B8593B] hover:bg-[#FDF3ED] rounded-lg transition-colors"
              aria-label="Clear chat history"
              title="Clear chat history"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline text-sm">Clear</span>
            </button>
          )}
          {chat.messages.length > 0 && !projectId && (
            <button
              onClick={handleSaveToProjectButton}
              className="flex items-center gap-2 px-4 py-2 bg-[#C67B5C] text-white rounded-lg hover:bg-[#A65D3F] transition-colors shadow-sm"
              title="Save this conversation to a new project"
            >
              <FolderPlus size={18} />
              <span className="hidden sm:inline">Save to Project</span>
            </button>
          )}
          <button
            onClick={() => planner.handleOpenIntake(chat.input)}
            className="flex items-center gap-2 px-4 py-2 bg-[#5D7B93] text-white rounded-lg hover:bg-[#4A6578] transition-colors shadow-sm"
            title="AI agents will research, design, and price your project"
          >
            <Sparkles size={18} />
            <span className="hidden sm:inline">Plan My Project</span>
          </button>
          {onOpenInventory && (
            <button
              onClick={onOpenInventory}
              className="flex items-center gap-2 px-4 py-2 bg-[#4A7C59] text-white rounded-lg hover:bg-[#2D5A3B] transition-colors"
              title="View your tool inventory"
            >
              <Package size={18} />
              <span className="hidden sm:inline">My Tools</span>
            </button>
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
          />

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
        <div className="bg-gradient-to-r from-[#C67B5C] to-[#A65D3F] px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white min-w-0">
              <FolderPlus size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                Save this conversation to track your project
              </span>
            </div>
            <button
              onClick={handleSaveToProjectButton}
              className="flex-shrink-0 bg-white text-[#C67B5C] px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-[#FDF8F3] transition-colors shadow-sm"
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
