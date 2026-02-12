'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { extractMaterialsData, detectInventoryUpdate } from '@/components/ChatMessages';
import { ProgressStep } from '@/components/ProgressIndicator';
import { classifyError, getUserMessage } from '@/lib/api-retry';

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
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error loading chat history:', e);
  }
  return [];
};

// Check for initial message from homepage
const getInitialMessage = (): string | null => {
  if (typeof window === 'undefined') return null;
  const message = sessionStorage.getItem(INITIAL_MESSAGE_KEY);
  if (message) sessionStorage.removeItem(INITIAL_MESSAGE_KEY);
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

interface UseChatOptions {
  projectId?: string;
  conversationId?: string;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>(options.conversationId);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  const [hasProcessedInitialMessage, setHasProcessedInitialMessage] = useState(false);

  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const [showGoogleFallback, setShowGoogleFallback] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // Materials state
  const [extractedMaterials, setExtractedMaterials] = useState<ExtractedMaterials | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isAutoExtracting, setIsAutoExtracting] = useState(false);

  // Inventory notification state
  const [inventoryNotification, setInventoryNotification] = useState<{
    added: string[];
    existing: string[];
    authRequired?: boolean;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = loadMessagesFromStorage();
    if (saved.length > 0) setMessages(saved);
    const savedConvId = localStorage.getItem(CONVERSATION_ID_KEY);
    if (savedConvId) setConversationId(savedConvId);
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
          const toStore = messages.length > 50 ? messages.slice(-50) : messages;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(toStore));
        } catch (e) {
          console.error('Error saving chat history:', e);
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [messages]);

  // Check for initial message from homepage
  useEffect(() => {
    if (hasProcessedInitialMessage) return;
    const initialMessage = getInitialMessage();
    if (initialMessage && !isLoading) {
      setHasProcessedInitialMessage(true);
      setTimeout(() => sendMessageWithContent(initialMessage), 100);
    }
  }, [hasProcessedInitialMessage, isLoading]);

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
      const timer = setTimeout(() => setShowGoogleFallback(true), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowGoogleFallback(false);
    }
  }, [isLoading, loadingStartTime]);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Helper to get auth token
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
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: messageContent,
          history: messages,
          project_id: options.projectId,
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

      if (!reader) throw new Error('No response body reader available');

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
                    { step: event.step, message: event.message, icon: event.icon, completed: false }
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
                case 'warning':
                  accumulatedContent += `\n\n> **Note:** ${event.content}`;
                  setStreamingContent(accumulatedContent);
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
      const errorType = classifyError(error);
      const errorMsg = getUserMessage(errorType);
      setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }]);
      setStreamingContent('');
      setIsStreaming(false);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setProgressSteps([]);
      setLoadingStartTime(null);
      setShowGoogleFallback(false);
    }
  }, [messages, options.projectId, conversationId]);

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
      if (extractToken) extractHeaders['Authorization'] = `Bearer ${extractToken}`;

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

  const showMaterialsBanner = useMemo(() => {
    if (showSaveDialog || messages.length === 0 || extractedMaterials) return false;
    const lastMsg = messages[messages.length - 1];
    return lastMsg.role === 'assistant' && hasMaterialsContent(lastMsg.content);
  }, [showSaveDialog, messages, extractedMaterials]);

  const handleNewChat = useCallback(() => {
    setConversationId(undefined);
    setMessages([]);
    setFailedMessage(null);
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(CONVERSATION_ID_KEY);
  }, []);

  const handleSelectConversation = useCallback((id: string, msgs: Message[]) => {
    setConversationId(id);
    setMessages(msgs);
    localStorage.setItem(CONVERSATION_ID_KEY, id);
  }, []);

  return {
    // State
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    isStreaming,
    streamingContent,
    progressSteps,
    failedMessage,
    showGoogleFallback,
    lastQuery,
    conversationId,
    messagesEndRef,

    // Materials
    extractedMaterials,
    setExtractedMaterials,
    showSaveDialog,
    setShowSaveDialog,
    showMaterialsBanner,
    isAutoExtracting,

    // Inventory
    inventoryNotification,
    setInventoryNotification,

    // Actions
    sendMessage,
    sendMessageWithContent,
    handleRetry,
    handleGoogleSearch,
    handleAutoExtractMaterials,
    handleNewChat,
    handleSelectConversation,
    getAuthToken,
  };
}

export type { Message, ExtractedMaterials };
