'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import VideoResults from './VideoResults';
import ProgressIndicator, { ProgressStep } from './ProgressIndicator';
import { Package, X, Trash2, Search } from 'lucide-react';

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
  const [messages, setMessages] = useState<Message[]>(() => loadMessagesFromStorage());
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

  // Save messages to localStorage whenever they change
  useEffect(() => {
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          history: messages,
          project_id: projectId,
          userId: userId,
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

  const saveToProject = async (targetProjectId: string) => {
    if (!extractedMaterials) return;

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
    // Auto-fill the project name with the suggested description
    setNewProjectName(extractedMaterials.project_description);
    setShowCreateProjectDialog(true);
  };

  const confirmCreateProject = async () => {
    if (!extractedMaterials || !newProjectName.trim()) {
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
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: newProjectName.trim(),
          description: extractedMaterials.project_description,
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
      await saveToProject(newProject.id);
    } catch (err: any) {
      console.error('Error creating project:', err);
      alert('An error occurred while creating project.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Inventory Update Notification Toast */}
      {inventoryNotification && (
        <div className="fixed top-20 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-3 animate-slide-in max-w-sm">
          <Package size={20} className="flex-shrink-0" />
          <div className="flex-1">
            {inventoryNotification.added.length > 0 && (
              <p className="font-medium text-sm">
                Added to inventory: {inventoryNotification.added.join(', ')}
              </p>
            )}
            {inventoryNotification.existing.length > 0 && (
              <p className="text-green-100 text-xs mt-1">
                Already owned: {inventoryNotification.existing.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={() => setInventoryNotification(null)}
            className="ml-2 hover:bg-green-700 p-1 rounded flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">DIY Helper Chat</h1>
          {projectId && (
            <p className="text-sm text-gray-600">
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
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={18} />
              <span className="hidden sm:inline text-sm">Clear</span>
            </button>
          )}
          {/* Inventory Button */}
          {onOpenInventory && (
            <button
              onClick={onOpenInventory}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg mb-2">Welcome to DIY Helper!</p>
            <p className="text-sm">Ask me about any home improvement project.</p>
            <p className="text-xs text-gray-400 mt-2">
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
                    ? 'bg-blue-600 text-white p-4'
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
                <div className={msg.role === 'user' ? '' : 'bg-white border border-gray-200 text-gray-900 rounded-lg p-4'}>
                  <div className={`prose prose-sm max-w-none ${
                    msg.role === 'user'
                      ? 'prose-invert'
                      : 'prose-gray'
                  }`}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => (
                          <p className={`mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className={`list-disc ml-4 mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className={`list-decimal ml-4 mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className={msg.role === 'user' ? 'text-white' : 'text-gray-900'}>
                            {children}
                          </li>
                        ),
                        h1: ({ children }) => (
                          <h1 className={`text-xl font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className={`text-lg font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className={`text-md font-bold mb-2 ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </h3>
                        ),
                        strong: ({ children }) => (
                          <strong className={`font-bold ${msg.role === 'user' ? 'text-white' : 'text-gray-900'}`}>
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className={`italic ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                            {children}
                          </em>
                        ),
                        code: ({ children }) => (
                          <code className={`px-1 py-0.5 rounded text-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {children}
                          </code>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className={`underline ${
                              msg.role === 'user'
                                ? 'text-white hover:text-blue-100'
                                : 'text-blue-600 hover:text-blue-800'
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
                              ? 'border-blue-400 text-white'
                              : 'border-gray-300 text-gray-700'
                          }`}>
                            {children}
                          </blockquote>
                        ),
                        // Handle strikethrough for owned items
                        del: ({ children }) => (
                          <del className="text-gray-400 line-through">
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
                <div className="bg-white border border-gray-200 text-gray-900 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none prose-gray">
                    <ReactMarkdown>
                      {cleanMessageContent(streamingContent)}
                    </ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Loading dots when no content yet */}
              {!streamingContent && progressSteps.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-200">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-amber-700">Taking too long?</span>
            <button
              onClick={handleGoogleSearch}
              className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-800 underline font-medium"
            >
              <Search size={14} />
              Search Google instead
            </button>
          </div>
        </div>
      )}

      {/* Manual "Save Materials" Button */}
      {!showSaveDialog && messages.length > 0 && messages[messages.length - 1].role === 'assistant' &&
        (messages[messages.length - 1].content.toLowerCase().includes('materials list') ||
        messages[messages.length - 1].content.toLowerCase().includes('shopping list') ||
        messages[messages.length - 1].content.toLowerCase().includes('items to purchase')) &&
        !extractedMaterials && (
        <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                To save these materials to your project, ask me to:
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                "Call the extract_materials_list tool" or "Save these to my shopping list"
              </p>
            </div>
            <button
              onClick={() => {
                setInput("Call the extract_materials_list tool to save these materials");
              }}
              className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm font-medium whitespace-nowrap"
            >
              Save Materials
            </button>
          </div>
        </div>
      )}

      {/* Save to Project Dialog */}
      {showSaveDialog && extractedMaterials && !showCreateProjectDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Save Materials to Project</h3>
            <p className="text-gray-600 mb-2">
              I found {extractedMaterials.materials.length} items to purchase for "{extractedMaterials.project_description}".
            </p>
            {extractedMaterials.owned_items && extractedMaterials.owned_items.length > 0 && (
              <p className="text-green-600 text-sm mb-4">
                {extractedMaterials.owned_items.length} items you already own were excluded from the list.
              </p>
            )}
            {extractedMaterials.total_estimate && (
              <p className="text-gray-500 text-sm mb-4">
                Estimated total: ${extractedMaterials.total_estimate.toFixed(2)}
              </p>
            )}

            {projects.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select existing project:
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                  onChange={(e) => e.target.value && saveToProject(e.target.value)}
                  defaultValue=""
                >
                  <option value="">Choose a project...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <div className="text-center text-gray-500 text-sm my-3">or</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={createNewProjectAndSave}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
              >
                Create New Project
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setExtractedMaterials(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create New Project Dialog */}
      {showCreateProjectDialog && extractedMaterials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Create New Project</h3>
            <p className="text-gray-600 mb-4">
              Enter a name for your project:
            </p>

            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder={extractedMaterials.project_description}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500 mb-4"
              onKeyPress={(e) => e.key === 'Enter' && confirmCreateProject()}
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={confirmCreateProject}
                disabled={!newProjectName.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Create & Save
              </button>
              <button
                onClick={() => {
                  setShowCreateProjectDialog(false);
                  setNewProjectName('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Prompt Dialog */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-gray-900">Sign In Required</h3>
            <p className="text-gray-600 mb-6">
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
                className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-semibold"
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
                className="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !isLoading && sendMessage()}
            placeholder="Ask me anything about your DIY project..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
