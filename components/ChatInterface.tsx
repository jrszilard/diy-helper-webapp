'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { guestStorage, GuestProject, GuestMaterial } from '@/lib/guestStorage';
import ReactMarkdown from 'react-markdown';
import VideoResults from './VideoResults';
import ProgressIndicator, { ProgressStep } from './ProgressIndicator';
import { Package, X, Trash2, Search, FolderPlus, ShoppingCart, Loader2 } from 'lucide-react';

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
    sessionStorage.removeItem(INITIAL_MESSAGE_KEY); // Clear it after reading
  }
  return message;
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
  const [projects, setProjects] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateProjectDialog, setShowCreateProjectDialog] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);
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
  }, []);

  // Save messages to localStorage whenever they change
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
      } catch (e) {
        console.error('Error saving chat history:', e);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (userId) {
      loadProjects();
      setIsGuestMode(false);
    } else {
      // Load guest projects when not authenticated
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
      // Use setTimeout to ensure component is fully mounted
      setTimeout(() => {
        sendMessageWithContent(initialMessage);
      }, 100);
    }
  }, [hasProcessedInitialMessage, isLoading]);

  // Helper to get auth token for API calls
  const getAuthToken = async (): Promise<string | null> => {
    try {
      // getSession returns the current session from storage
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) return session.access_token;

      // Fallback: refresh the session if getSession returned null
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
        detectInventoryUpdate(lastMessage.content);
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

      if (!currentUserId) {
        console.log('No user ID available for loading projects');
        return;
      }

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

  // Detect inventory updates in assistant messages
  const detectInventoryUpdate = (content: string) => {
    const inventoryMatch = content.match(
      /---INVENTORY_UPDATE---\n([\s\S]*?)\n---END_INVENTORY_UPDATE---/
    );

    if (inventoryMatch) {
      try {
        const data = JSON.parse(inventoryMatch[1]);
        if (data.added?.length > 0 || data.existing?.length > 0) {
          setInventoryNotification(data);
          // Auto-dismiss after 5 seconds
          setTimeout(() => setInventoryNotification(null), 5000);
        }
      } catch (e) {
        console.error('Error parsing inventory update:', e);
      }
    }
  };

  const extractMaterialsData = (content: string): ExtractedMaterials | null => {
    const match = content.match(/---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1].trim());
      } catch (e) {
        console.error('Failed to parse materials data:', e);
      }
    }
    return null;
  };

  const cleanMessageContent = (content: string): string => {
    // Remove all data markers from displayed content
    return content
      .replace(/---MATERIALS_DATA---[\s\S]*?---END_MATERIALS_DATA---/g, '')
      .replace(/---INVENTORY_UPDATE---[\s\S]*?---END_INVENTORY_UPDATE---/g, '')
      .replace(/---INVENTORY_DATA---[\s\S]*?---END_INVENTORY_DATA---/g, '')
      .replace(/\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/gs, '')
      .trim();
  };

  const parseVideoResults = (content: string): { found: boolean; videos?: any[]; query?: string } => {
    try {
      // Look for the tool result JSON that contains video data
      const jsonMatch = content.match(/\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/s);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.success && data.videos && Array.isArray(data.videos)) {
          return {
            found: true,
            videos: data.videos,
            query: data.query || 'Project Tutorial'
          };
        }
      }
    } catch (e) {
      console.error('Error parsing video results:', e);
    }

    return { found: false };
  };

  // Function to send a message with specific content (used for initial message from homepage)
  const sendMessageWithContent = async (messageContent: string) => {
    if (!messageContent.trim()) return;

    setLastQuery(messageContent);
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
          streaming: true
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
                  break;

                case 'error':
                  console.error('Stream error:', event.content);
                  accumulatedContent += `\n\n${event.content}`;
                  setStreamingContent(accumulatedContent);
                  break;

                case 'done':
                  setProgressSteps(prev => prev.map(s => ({ ...s, completed: true })));
                  if (accumulatedContent) {
                    // Check for materials data in the accumulated content
                    const materials = extractMaterialsData(accumulatedContent);
                    if (materials && materials.materials && materials.materials.length > 0) {
                      setExtractedMaterials(materials);
                      setShowSaveDialog(true);
                    }

                    setMessages(prev => [...prev, { role: 'assistant', content: accumulatedContent }]);
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
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    await sendMessageWithContent(userMessage);
  };

  const handleGoogleSearch = () => {
    const query = lastQuery || input;
    if (query) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(query + ' DIY')}`, '_blank');
    }
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

  // Auto-extract materials when user clicks Save Materials
  const handleAutoExtractMaterials = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    // Check if materials data markers already exist
    const existingMatch = lastMessage.content.match(
      /---MATERIALS_DATA---([\s\S]*?)---END_MATERIALS_DATA---/
    );

    if (existingMatch) {
      // Materials already extracted - use them
      try {
        const materialsData = JSON.parse(existingMatch[1]);
        setExtractedMaterials(materialsData);
        setShowSaveDialog(true);
        return;
      } catch (e) {
        console.error('Failed to parse existing materials:', e);
      }
    }

    // No markers - need to auto-extract
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
        body: JSON.stringify({
          conversationContext: messages
        })
      });

      const data = await response.json();
      if (data.materials && data.materials.length > 0) {
        setExtractedMaterials(data);
        setShowSaveDialog(true);
      } else {
        // No materials found - show friendly message
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
      // Fallback to old behavior
      setInput("Create a materials list from our conversation");
    } finally {
      setIsAutoExtracting(false);
    }
  };

  const saveToProject = async (targetProjectId: string, isGuestProject: boolean = false) => {
    if (!extractedMaterials) return;

    if (isGuestProject || isGuestMode) {
      // Save to localStorage for guests
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

        // Build success message
        let successMsg = `Saved ${addedMaterials.length} items to your project!`;
        if (extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0) {
          successMsg += ` (${extractedMaterials.owned_items.length} items you already own were excluded)`;
        }
        successMsg += `\n\n**Tip:** Sign in to sync your projects across devices and unlock price comparison features.`;

        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: successMsg }
        ]);
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
      // Only save items that need to be purchased (not owned items)
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

      // Build success message
      let successMsg = `Successfully saved ${extractedMaterials.materials.length} items to your project!`;
      if (extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0) {
        successMsg += ` (${extractedMaterials.owned_items.length} items you already own were not added to the shopping list)`;
      }
      successMsg += ` The shopping list should now appear on the right.`;

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: successMsg }
      ]);
    } catch (err: any) {
      console.error('Error:', err);
      alert('An error occurred while saving materials: ' + err.message);
    }
  };

  const createNewProjectAndSave = async () => {
    if (!extractedMaterials) return;

    // Check if user is logged in
    let currentUserId = userId;
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id;
    }

    if (!currentUserId) {
      // Guest flow - create locally without showing dialog
      const guestProject = guestStorage.saveProject({
        name: extractedMaterials.project_description || 'My DIY Project',
        description: `Created ${new Date().toLocaleDateString()}`,
        materials: [],
      });

      await saveToProject(guestProject.id, true);
      return;
    }

    // Authenticated flow - show dialog
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
      // Generate description from first user message if no extracted materials
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

      // Only save materials if we have extracted materials
      if (extractedMaterials) {
        await saveToProject(newProject.id);
      } else {
        // Just link the project
        setProjectId(newProject.id);
        onProjectLinked?.(newProject.id);
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `Created project "${newProjectName.trim()}"! Your conversation is now linked to this project.` }
        ]);
      }
    } catch (err: any) {
      console.error('Error creating project:', err);
      alert('An error occurred while creating project.');
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F0E6]">
      {/* Inventory Update Notification Toast */}
      {inventoryNotification && (
        <div className="fixed top-20 right-4 bg-[#4A7C59] text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in max-w-sm">
          <Package size={20} className="flex-shrink-0" />
          <div className="flex-1">
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
          </div>
          <button
            onClick={() => setInventoryNotification(null)}
            className="ml-2 hover:bg-[#2D5A3B] p-1 rounded flex-shrink-0"
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
          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear chat history? This cannot be undone.')) {
                  setMessages([]);
                  localStorage.removeItem(CHAT_STORAGE_KEY);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 text-[#7D6B5D] hover:text-[#B8593B] hover:bg-[#FDF3ED] rounded-lg transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline text-sm">Clear</span>
            </button>
          )}
          {/* Save to Project Button - shows when there are messages and no project linked */}
          {messages.length > 0 && !projectId && (
            <button
              onClick={() => {
                // Use guest-aware project creation flow
                if (extractedMaterials) {
                  createNewProjectAndSave();
                } else {
                  // No materials extracted yet, show create dialog for guest or auth
                  if (!userId) {
                    // Guest flow - create project locally
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center text-[#7D6B5D] mt-8">
            <p className="text-lg mb-2">Welcome to DIY Helper!</p>
            <p className="text-sm">Ask me about any home improvement project.</p>
            <p className="text-xs text-[#A89880] mt-2">
              Tip: Mention tools you own (e.g., "I have a drill") and I'll remember them!
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          // Check if this message contains video results
          const videoResults = msg.role === 'assistant' ? parseVideoResults(msg.content) : { found: false };

          return (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-[#C67B5C] text-white p-4'
                    : 'bg-transparent'
                }`}
              >
                {/* Render video results if found */}
                {videoResults.found && (
                  <div className="mb-4">
                    <VideoResults
                      videos={videoResults.videos || []}
                      projectQuery={videoResults.query || 'Project'}
                    />
                  </div>
                )}

                {/* Text content */}
                <div className={msg.role === 'user' ? '' : 'bg-[#FDFBF7] border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4'}>
                  <div className={`prose prose-sm max-w-none ${
                    msg.role === 'user'
                      ? 'prose-invert'
                      : 'prose-stone'
                  }`}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className={`mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className={`list-disc ml-4 mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className={`list-decimal ml-4 mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className={msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}>
                            {children}
                          </li>
                        ),
                        h1: ({ children }) => (
                          <h1 className={`text-xl font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className={`text-lg font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className={`text-md font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </h3>
                        ),
                        strong: ({ children }) => (
                          <strong className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-[#3E2723]'}`}>
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className={`italic ${msg.role === 'user' ? 'text-white' : 'text-[#5C4D42]'}`}>
                            {children}
                          </em>
                        ),
                        code: ({ children }) => (
                          <code className={`px-1 py-0.5 rounded text-sm ${
                            msg.role === 'user'
                              ? 'bg-[#A65D3F] text-white'
                              : 'bg-[#E8DFD0] text-[#3E2723]'
                          }`}>
                            {children}
                          </code>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className={`underline ${
                              msg.role === 'user'
                                ? 'text-white hover:text-[#FFE0D0]'
                                : 'text-[#5D7B93] hover:text-[#4A6275]'
                            }`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className={`border-l-4 pl-4 italic ${
                            msg.role === 'user'
                              ? 'border-[#A65D3F] text-white'
                              : 'border-[#C67B5C] text-[#5C4D42]'
                          }`}>
                            {children}
                          </blockquote>
                        ),
                        // Handle strikethrough for owned items
                        del: ({ children }) => (
                          <del className="text-[#A89880] line-through">
                            {children}
                          </del>
                        ),
                      }}
                    >
                      {cleanMessageContent(msg.content)}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Streaming content with progress indicator */}
        {isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-3xl w-full">
              {/* Progress indicator */}
              {progressSteps.length > 0 && (
                <ProgressIndicator steps={progressSteps} />
              )}

              {/* Streaming text content */}
              {streamingContent && (
                <div className="bg-[#FDFBF7] border border-[#D4C8B8] text-[#3E2723] rounded-lg p-4">
                  <div className="prose prose-sm max-w-none prose-stone">
                    <ReactMarkdown>
                      {cleanMessageContent(streamingContent)}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Loading dots when no content yet */}
              {!streamingContent && progressSteps.length === 0 && (
                <div className="bg-[#FDFBF7] border border-[#D4C8B8] rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#C67B5C] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Google Search Fallback */}
      {showGoogleFallback && isLoading && (
        <div className="px-4 py-2 bg-[#FDF3ED] border-t border-[#E8D5CC]">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-[#B8593B]">Taking too long?</span>
            <button
              onClick={handleGoogleSearch}
              className="inline-flex items-center gap-1 text-sm text-[#C67B5C] hover:text-[#A65D3F] underline font-medium"
            >
              <Search size={14} />
              Search Google instead
            </button>
          </div>
        </div>
      )}

      {/* Materials Detection Banner - Improved UX */}
      {!showSaveDialog && messages.length > 0 &&
       messages[messages.length - 1].role === 'assistant' &&
       hasMaterialsContent(messages[messages.length - 1].content) &&
       !extractedMaterials && (
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-t border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-emerald-800 font-semibold">
                Materials list detected!
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                Save to your project to track purchases and find local prices
              </p>
            </div>
            <button
              onClick={handleAutoExtractMaterials}
              disabled={isAutoExtracting}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700
                         text-sm font-semibold whitespace-nowrap shadow-sm transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
            >
              {isAutoExtracting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Save Materials
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Save to Project Dialog */}
      {showSaveDialog && extractedMaterials && !showCreateProjectDialog && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">Save Materials to Project</h3>
            <p className="text-[#5C4D42] mb-2">
              I found {extractedMaterials.materials.length} items to purchase for "{extractedMaterials.project_description}".
            </p>
            {extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0 && (
              <p className="text-[#4A7C59] text-sm mb-4">
                {extractedMaterials.owned_items.length} items you already own were excluded from the list.
              </p>
            )}
            {extractedMaterials.total_estimate && (
              <p className="text-[#7D6B5D] text-sm mb-4">
                Estimated total: ${extractedMaterials.total_estimate.toFixed(2)}
              </p>
            )}

            {/* Show authenticated user's projects */}
            {!isGuestMode && projects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#5C4D42] mb-2">
                  Select existing project:
                </label>
                <select
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                  onChange={(e) => e.target.value && saveToProject(e.target.value, false)}
                  defaultValue=""
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <div className="text-center text-[#A89880] text-sm my-3">or</div>
              </div>
            )}

            {/* Show guest projects */}
            {isGuestMode && guestProjects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#5C4D42] mb-2">
                  Select existing project:
                </label>
                <select
                  className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] bg-white"
                  onChange={(e) => e.target.value && saveToProject(e.target.value, true)}
                  defaultValue=""
                >
                  <option value="">Choose a project...</option>
                  {guestProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <div className="text-center text-[#A89880] text-sm my-3">or</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={createNewProjectAndSave}
                className="flex-1 bg-[#5D7B93] text-white py-2 px-4 rounded-lg hover:bg-[#4A6275]"
              >
                Create New Project
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setExtractedMaterials(null);
                }}
                className="flex-1 bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Skip for Now
              </button>
            </div>

            {/* Guest mode notice */}
            {isGuestMode && (
              <p className="text-xs text-[#7D6B5D] mt-4 text-center">
                Projects are saved locally. Sign in to sync across devices.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Create New Project Dialog */}
      {showCreateProjectDialog && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">
              {extractedMaterials ? 'Create New Project' : 'Save to New Project'}
            </h3>
            <p className="text-[#5C4D42] mb-4">
              {extractedMaterials
                ? 'Enter a name for your project:'
                : 'Save this conversation to a new project. You can add materials later.'}
            </p>

            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={extractedMaterials?.project_description || 'My DIY Project'}
              className="w-full px-3 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] text-[#3E2723] placeholder-[#A89880] mb-4 bg-white"
              onKeyPress={(e) => e.key === 'Enter' && confirmCreateProject()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={confirmCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 bg-[#C67B5C] text-white py-2 px-4 rounded-lg hover:bg-[#A65D3F] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed"
              >
                {extractedMaterials ? 'Create & Save' : 'Create Project'}
              </button>
              <button
                onClick={() => {
                  setShowCreateProjectDialog(false);
                  setNewProjectName('');
                }}
                className="flex-1 bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Prompt Dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-[#3E2723] bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#FDFBF7] rounded-lg p-6 max-w-md w-full mx-4 border border-[#D4C8B8]">
            <h3 className="text-xl font-bold mb-4 text-[#3E2723]">Sign In Required</h3>
            <p className="text-[#5C4D42] mb-6">
              You need to be signed in to save materials and create projects.
              Create a free account to get started!
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowAuthPrompt(false);
                  setShowSaveDialog(false);
                  setShowCreateProjectDialog(false);
                  // Trigger the auth modal
                  if (onRequestAuth) {
                    onRequestAuth();
                  }
                }}
                className="bg-[#5D7B93] text-white py-3 px-4 rounded-lg hover:bg-[#4A6275] font-semibold"
              >
                Create Account / Sign In
              </button>
              <button
                onClick={() => {
                  setShowAuthPrompt(false);
                  setShowSaveDialog(false);
                  setShowCreateProjectDialog(false);
                  setExtractedMaterials(null);
                }}
                className="bg-[#E8DFD0] text-[#5C4D42] py-2 px-4 rounded-lg hover:bg-[#D4C8B8]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save to Project Banner - shows prominently when there are messages but no project */}
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
                // Use guest-aware project creation flow
                if (extractedMaterials) {
                  createNewProjectAndSave();
                } else {
                  // No materials extracted yet
                  if (!userId) {
                    // Guest flow - create project locally
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

      {/* Input */}
      <div className="bg-[#FDFBF7] border-t border-[#D4C8B8] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Ask me anything about your DIY project..."
            className="flex-1 px-4 py-2 border border-[#D4C8B8] rounded-lg focus:ring-2 focus:ring-[#C67B5C] focus:border-[#C67B5C] text-[#3E2723] placeholder-[#A89880] bg-white"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-[#C67B5C] text-white px-6 py-2 rounded-lg hover:bg-[#A65D3F] disabled:bg-[#D4C8B8] disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
