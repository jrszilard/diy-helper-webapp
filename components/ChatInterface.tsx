'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage, GuestProject } from '@/lib/guestStorage';
import { Package, X, Trash2, FolderPlus, MessageSquare } from 'lucide-react';
import ChatMessages, { extractMaterialsData, detectInventoryUpdate, cleanMessageContent } from './ChatMessages';
import ChatInput from './ChatInput';
import SaveMaterialsDialog from './SaveMaterialsDialog';
import ConversationList from './ConversationList';
import { ProgressStep } from './ProgressIndicator';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedMaterials {
  project_description: string;
  materials: Array<{
    name: string;
    quantity: string;
    category: string;
    estimated_price: string;
    required: boolean;
  }>;
  owned_items?: Array<{
    name: string;
    quantity: string;
    category: string;
    ownedAs: string;
  }>;
  total_estimate?: number;
}

const CHAT_STORAGE_KEY = 'diy-helper-chat-messages';
const CONVERSATION_ID_KEY = 'diy-helper-conversation-id';
const INITIAL_MESSAGE_KEY = 'initialChatMessage';

// Helper to load messages from localStorage
const loadMessagesFromStorage = (): Message[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(CHAT_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
  return [];
};

// Helper to check for initial message from homepage
const getInitialMessage = (): string | null => {
  if (typeof window === 'undefined') return null;
  const message = sessionStorage.getItem(INITIAL_MESSAGE_KEY);
  if (message) {
    sessionStorage.removeItem(INITIAL_MESSAGE_KEY);
  }
  return message;
};

// Check if message content contains materials-related content
const hasMaterialsContent = (content: string): boolean => {
  const lowerContent = content.toLowerCase();
  return (
    lowerContent.includes('materials list') ||
    lowerContent.includes('shopping list') ||
    lowerContent.includes('items to purchase') ||
    lowerContent.includes('you\'ll need') ||
    lowerContent.includes('you will need') ||
    lowerContent.includes('materials needed') ||
    lowerContent.includes('supplies needed') ||
    lowerContent.includes('required materials')
  );
};

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [extractedMaterials, setExtractedMaterials] = useState<ExtractedMaterials | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [showConversationList, setShowConversationList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // Inventory notification state
  const [inventoryNotification, setInventoryNotification] = useState<{
    added: string[];
    existing: string[];
    authRequired?: boolean;
  } | null>(null);

  // Guest projects state
  const [guestProjects, setGuestProjects] = useState<GuestProject[]>([]);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [isAutoExtracting, setIsAutoExtracting] = useState(false);

  // Load messages from localStorage on mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = loadMessagesFromStorage();
    if (saved.length > 0) {
      setMessages(saved);
    }
    // Restore conversationId for authenticated users
    const savedConvId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (savedConvId) {
      setConversationId(savedConvId);
    }
  }, []);

  // Debounced save messages to localStorage
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
          console.error('Error saving chat history:', e);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);

  useEffect(() => {
    if (userId) {
      loadProjects();
      setIsGuestMode(false);
    } else {
      setGuestProjects(guestStorage.getProjects());
      setIsGuestMode(true);
    }
  }, [userId]);

  // Check for initial message from homepage and send it automatically
  useEffect(() => {
    if (hasProcessedInitialMessage) return;

    const initialMessage = getInitialMessage();
    if (initialMessage && !isLoading) {
      setHasProcessedInitialMessage(true);
      setTimeout(() => {
        sendMessageWithContent(initialMessage);
      }, 100);
    }
  }, [hasProcessedInitialMessage, isLoading]);

  // Helper to get auth token for API calls
  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;
      const { data: { session: refreshed } } = await supabase.auth.refreshSession();
      return refreshed?.access_token || null;
    } catch {
      return null;
    }
  };

  // Detect inventory updates when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const update = detectInventoryUpdate(lastMessage.content);
        if (update) {
          setInventoryNotification(update);
          setTimeout(() => setInventoryNotification(null), 5000);
        }
      }
    }
  }, [messages]);

  // Show Google fallback after 5 seconds of loading
  useEffect(() => {
    if (isLoading && loadingStartTime) {
      const timer = setTimeout(() => {
        setShowGoogleFallback(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowGoogleFallback(false);
    }
  }, [isLoading, loadingStartTime]);

  const loadProjects = async () => {
    try {
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id;
      }
      if (!currentUserId) return;

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Function to send a message with specific content
  const sendMessageWithContent = useCallback(async (messageContent: string) => {
    if (!messageContent.trim()) return;

    setLastQuery(messageContent);
    setFailedMessage(null);
    setMessages(prev => [...prev, { role: 'user', content: messageContent }]);
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingContent('');
    setProgressSteps([]);
    setLoadingStartTime(Date.now());
    setShowGoogleFallback(false);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageContent,
          history: messages,
          project_id: projectId,
          streaming: true,
          conversationId
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = line.slice(6);
              if (!eventData.trim()) continue;

              const event = JSON.parse(eventData);

              switch (event.type) {
                case 'progress':
                  setProgressSteps(prev => [
                    ...prev.map(s => ({ ...s, completed: true })),
                    {
                      step: event.step,
                      message: event.message,
                      icon: event.icon,
                      completed: false
                    }
                  ]);
                  break;

                case 'text':
                  if (event.content) {
                    accumulatedContent += event.content;
                    setStreamingContent(accumulatedContent);
                  }
                  break;

                case 'tool_result':
                  if (event.toolName === 'inventory_update' && event.result) {
                    const data = event.result;
                    if (data.added?.length > 0 || data.existing?.length > 0) {
                      setInventoryNotification(data);
                      setTimeout(() => setInventoryNotification(null), 5000);
                    }
                  }
                  if (event.toolName === 'inventory_auth_required') {
                    setInventoryNotification({ added: [], existing: [], authRequired: true });
                    setTimeout(() => setInventoryNotification(null), 5000);
                  }
                  break;

                case 'error':
                  console.error('Stream error:', event.content);
                  accumulatedContent += `\n\n${event.content}`;
                  setStreamingContent(accumulatedContent);
                  break;

                case 'done':
                  setProgressSteps(prev => prev.map(s => ({ ...s, completed: true })));
                  if (accumulatedContent) {
                    const materials = extractMaterialsData(accumulatedContent);
                    if (materials && materials.materials && materials.materials.length > 0) {
                      setExtractedMaterials(materials);
                      setShowSaveDialog(true);
                    }

                    setMessages(prev => [...prev, { role: 'assistant', content: accumulatedContent }]);
                  }
                  // Capture conversationId from server for persistence
                  if (event.conversationId) {
                    setConversationId(event.conversationId);
                    localStorage.setItem(CONVERSATION_ID_KEY, event.conversationId);
                  }
                  setStreamingContent('');
                  setIsStreaming(false);
                  break;
              }
            } catch (parseError) {
              console.error('Error parsing SSE event:', parseError, line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setFailedMessage(messageContent);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
      setStreamingContent('');
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setProgressSteps([]);
      setLoadingStartTime(null);
      setShowGoogleFallback(false);
    }
  }, [messages, projectId, conversationId]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setInput('');
    await sendMessageWithContent(userMessage);
  }, [input, sendMessageWithContent]);

  const handleRetry = useCallback(() => {
    if (!failedMessage) return;
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length >= 2 &&
          newMessages[newMessages.length - 1].role === 'assistant' &&
          newMessages[newMessages.length - 2].role === 'user') {
        newMessages.splice(-2, 2);
      }
      return newMessages;
    });
    const retryContent = failedMessage;
    setFailedMessage(null);
    setTimeout(() => sendMessageWithContent(retryContent), 50);
  }, [failedMessage, sendMessageWithContent]);

  const handleGoogleSearch = useCallback(() => {
    const query = lastQuery || input;
    if (query) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query + ' DIY')}`, '_blank');
    }
  }, [lastQuery, input]);

  const handleAutoExtractMaterials = useCallback(async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    const existingMatch = lastMessage.content.match(
      /---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/
    );

    if (existingMatch) {
      try {
        const materialsData = JSON.parse(existingMatch[1]);
        setExtractedMaterials(materialsData);
        setShowSaveDialog(true);
        return;
      } catch (e) {
        console.error('Failed to parse existing materials:', e);
      }
    }

    setIsAutoExtracting(true);
    try {
      const extractToken = await getAuthToken();
      const extractHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      if (extractToken) {
        extractHeaders['Authorization'] = `Bearer ${extractToken}`;
      }

      const response = await fetch('/api/extract-materials', {
        method: 'POST',
        headers: extractHeaders,
        body: JSON.stringify({ conversationContext: messages })
      });

      const data = await response.json();
      if (data.materials && data.materials.length > 0) {
        setExtractedMaterials(data);
        setShowSaveDialog(true);
      } else {
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: "I couldn't find any specific materials in our conversation. Could you describe your project and what materials you need? Then I can help you create a shopping list."
          }
        ]);
      }
    } catch (error) {
      console.error('Auto-extraction failed:', error);
      setInput("Create a materials list from our conversation");
    } finally {
      setIsAutoExtracting(false);
    }
  }, [messages]);

  // Memoize materials banner visibility
  const showMaterialsBanner = useMemo(() => {
    if (showSaveDialog || messages.length === 0 || extractedMaterials) return false;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === 'assistant' && hasMaterialsContent(lastMsg.content);
  }, [showSaveDialog, messages, extractedMaterials]);

  const saveToProject = async (targetProjectId: string, isGuestProject: boolean = false) => {
    if (!extractedMaterials) return;

    if (isGuestProject || isGuestMode) {
      const newMaterials = extractedMaterials.materials.map(mat => ({
        product_name: mat.name,
        quantity: parseInt(mat.quantity) || 1,
        category: mat.category || 'general',
        required: mat.required !== false,
        price: mat.estimated_price ? parseFloat(mat.estimated_price) : null,
      }));

      const addedMaterials = guestStorage.addMaterials(targetProjectId, newMaterials);

      if (addedMaterials.length > 0) {
        setProjectId(targetProjectId);
        setShowSaveDialog(false);
        setExtractedMaterials(null);
        setGuestProjects(guestStorage.getProjects());
        onProjectLinked?.(targetProjectId);

        let successMsg = `Saved ${addedMaterials.length} items to your project!`;
        if (extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0) {
          successMsg += ` (${extractedMaterials.owned_items.length} items you already own were excluded)`;
        }
        successMsg += `\n\n**Tip:** Sign in to sync your projects across devices and unlock price comparison features.`;

        setMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
      }
      return;
    }

    // Authenticated user flow
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }
    if (!currentUserId) {
      setShowSaveDialog(false);
      setShowAuthPrompt(true);
      return;
    }

    try {
      const itemsToInsert = extractedMaterials.materials.map((mat) => ({
        project_id: targetProjectId,
        user_id: currentUserId,
        product_name: mat.name,
        quantity: parseInt(mat.quantity) || 1,
        category: mat.category || 'general',
        required: mat.required !== false,
        price: mat.estimated_price ? parseFloat(mat.estimated_price) : null
      }));

      const { data, error } = await supabase
        .from('shopping_list_items')
        .insert(itemsToInsert)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        alert('Failed to save materials: ' + error.message);
        return;
      }

      setProjectId(targetProjectId);
      setShowSaveDialog(false);
      setExtractedMaterials(null);
      onProjectLinked?.(targetProjectId);

      let successMsg = `Successfully saved ${extractedMaterials.materials.length} items to your project!`;
      if (extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0) {
        successMsg += ` (${extractedMaterials.owned_items.length} items you already own were not added to the shopping list)`;
      }
      successMsg += ` The shopping list should now appear on the right.`;

      setMessages(prev => [...prev, { role: 'assistant', content: successMsg }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error:', message);
      alert('An error occurred while saving materials: ' + message);
    }
  };

  const createNewProjectAndSave = async () => {
    if (!extractedMaterials) return;

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      const guestProject = guestStorage.saveProject({
        name: extractedMaterials.project_description || 'My DIY Project',
        description: `Created ${new Date().toLocaleDateString()}`,
        materials: [],
      });
      await saveToProject(guestProject.id, true);
      return;
    }

    setNewProjectName(extractedMaterials.project_description);
    setShowCreateProjectDialog(true);
  };

  const confirmCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      setShowCreateProjectDialog(false);
      setShowAuthPrompt(true);
      return;
    }

    try {
      const description = extractedMaterials?.project_description ||
        messages.find(m => m.role === 'user')?.content.slice(0, 200) ||
        'DIY Project';

      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: description,
          user_id: currentUserId
        })
        .select()
        .single();

      if (projectError || !newProject) {
        alert('Failed to create project: ' + (projectError?.message || 'Unknown error'));
        return;
      }

      setShowCreateProjectDialog(false);
      setNewProjectName('');
      await loadProjects();

      if (extractedMaterials) {
        await saveToProject(newProject.id);
      } else {
        setProjectId(newProject.id);
        onProjectLinked?.(newProject.id);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Created project "${newProjectName.trim()}"! Your conversation is now linked to this project.` }
        ]);
      }
    } catch (err: unknown) {
      console.error('Error creating project:', err instanceof Error ? err.message : err);
      alert('An error occurred while creating project.');
    }
  };

  const handleNewChat = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setFailedMessage(null);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
    setShowConversationList(false);
  }, []);

  const handleSelectConversation = useCallback((id: string, msgs: Message[]) => {
    setConversationId(id);
    setMessages(msgs);
    localStorage.setItem(CONVERSATION_ID_KEY, id);
    setShowConversationList(false);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6]">
      {/* Inventory Update Notification Toast */}
      {inventoryNotification && (
        <div className={`fixed top-20 right-4 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in max-w-sm ${
          inventoryNotification.authRequired ? 'bg-[#B8593B]' : 'bg-[#4A7C59]'
        }`}>
          <Package size={20} className="flex-shrink-0" />
          <div className="flex-1">
            {inventoryNotification.authRequired ? (
              <p className="font-medium text-sm">
                Sign in to save items to your inventory
              </p>
            ) : (<>
            {inventoryNotification.added.length > 0 && (
              <p className="font-medium text-sm">
                Added to inventory: {inventoryNotification.added.join(', ')}
              </p>
            )}
            {inventoryNotification.existing.length > 0 && (
              <p className="font-medium text-sm">
                Already in inventory: {inventoryNotification.existing.join(', ')}
              </p>
            )}
            </>)}
          </div>
          <button
            onClick={() => setInventoryNotification(null)}
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
              Linked to project: {projects.find(p => p.id === projectId)?.name || 'Unknown'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Conversation History Button - only for authenticated users */}
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
          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear chat history? This cannot be undone.')) {
                  setMessages([]);
                  setConversationId(undefined);
                  setFailedMessage(null);
                  localStorage.removeItem(CHAT_STORAGE_KEY);
                  localStorage.removeItem(CONVERSATION_ID_KEY);
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
          {/* Save to Project Button */}
          {messages.length > 0 && !projectId && (
            <button
              onClick={() => {
                if (extractedMaterials) {
                  createNewProjectAndSave();
                } else {
                  if (!userId) {
                    const guestProject = guestStorage.saveProject({
                      name: messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'My DIY Project',
                      description: `Created ${new Date().toLocaleDateString()}`,
                      materials: [],
                    });
                    setProjectId(guestProject.id);
                    setGuestProjects(guestStorage.getProjects());
                    onProjectLinked?.(guestProject.id);
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: `Project saved! You can now save materials to this project.\n\n**Tip:** Sign in to sync across devices.` }
                    ]);
                  } else {
                    setNewProjectName('');
                    setShowCreateProjectDialog(true);
                  }
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#C67B5C] text-white rounded-lg hover:bg-[#A65D3F] transition-colors shadow-sm"
              title="Save this conversation to a new project"
            >
              <FolderPlus size={18} />
              <span className="hidden sm:inline">Save to Project</span>
            </button>
          )}
          {/* Inventory Button */}
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

      {/* Messages */}
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        progressSteps={progressSteps}
        failedMessage={failedMessage}
        onRetry={handleRetry}
        messagesEndRef={messagesEndRef}
      />

      {/* Input area with banners */}
      <ChatInput
        input={input}
        onInputChange={setInput}
        onSend={sendMessage}
        isLoading={isLoading}
        showGoogleFallback={showGoogleFallback}
        onGoogleSearch={handleGoogleSearch}
        showMaterialsBanner={showMaterialsBanner}
        isAutoExtracting={isAutoExtracting}
        onAutoExtractMaterials={handleAutoExtractMaterials}
      />

      {/* Floating Save to Project Banner */}
      {messages.length > 0 && !projectId && !isLoading && (
        <div className="bg-gradient-to-r from-[#C67B5C] to-[#A65D3F] px-4 py-3 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-white min-w-0">
              <FolderPlus size={20} className="flex-shrink-0" />
              <span className="text-sm font-medium truncate">
                Save this conversation to track your project
              </span>
            </div>
            <button
              onClick={() => {
                if (extractedMaterials) {
                  createNewProjectAndSave();
                } else {
                  if (!userId) {
                    const guestProject = guestStorage.saveProject({
                      name: messages.find(m => m.role === 'user')?.content.slice(0, 50) || 'My DIY Project',
                      description: `Created ${new Date().toLocaleDateString()}`,
                      materials: [],
                    });
                    setProjectId(guestProject.id);
                    setGuestProjects(guestStorage.getProjects());
                    onProjectLinked?.(guestProject.id);
                    setMessages(prev => [
                      ...prev,
                      { role: 'assistant', content: `Project saved! You can now save materials to this project.\n\n**Tip:** Sign in to sync across devices.` }
                    ]);
                  } else {
                    setNewProjectName('');
                    setShowCreateProjectDialog(true);
                  }
                }
              }}
              className="flex-shrink-0 bg-white text-[#C67B5C] px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-[#FDF8F3] transition-colors shadow-sm"
            >
              Save to Project
            </button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <SaveMaterialsDialog
        showSaveDialog={showSaveDialog}
        showCreateProjectDialog={showCreateProjectDialog}
        showAuthPrompt={showAuthPrompt}
        extractedMaterials={extractedMaterials}
        projects={projects}
        guestProjects={guestProjects}
        isGuestMode={isGuestMode}
        newProjectName={newProjectName}
        onNewProjectNameChange={setNewProjectName}
        onSaveToProject={saveToProject}
        onCreateNewProjectAndSave={createNewProjectAndSave}
        onConfirmCreateProject={confirmCreateProject}
        onCloseSaveDialog={() => {
          setShowSaveDialog(false);
          setExtractedMaterials(null);
        }}
        onCloseCreateDialog={() => {
          setShowCreateProjectDialog(false);
          setNewProjectName('');
        }}
        onCloseAuthPrompt={() => {
          setShowAuthPrompt(false);
          setShowSaveDialog(false);
          setShowCreateProjectDialog(false);
          setExtractedMaterials(null);
        }}
        onRequestAuth={onRequestAuth}
      />

      {/* Conversation History Panel */}
      <ConversationList
        userId={userId}
        isOpen={showConversationList}
        onClose={() => setShowConversationList(false)}
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
