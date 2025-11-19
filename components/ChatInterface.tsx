'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, Loader2, Sparkles, User, Bot, Save, FileText, X, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  user?: any;
  selectedProject?: any;
  onProjectSaved?: () => void;
}

const exampleQueries = [
  "What are kitchen outlet requirements?",
  "Calculate wire for 50 foot circuit",
  "Search for GFCI outlets",
  "How many outlets for 15x20 room?",
  "Find me a drill",
  "Deck lumber requirements"
];

export default function ChatInterface({ user, selectedProject, onProjectSaved }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your DIY assistant. I can help you with:\n\n• **Building codes** (NEC, IRC, IPC)\n• **Material recommendations** with pricing\n• **Project calculations** (wire, outlets, tile, etc.)\n• **Step-by-step guidance**\n\nWhat are you working on?"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Project features
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load notes when project is selected
  useEffect(() => {
    if (selectedProject) {
      loadNotes();
      loadProjectConversation();
    }
  }, [selectedProject]);

  const loadNotes = async () => {
    if (!selectedProject) return;

    const { data } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', selectedProject.id)
      .order('created_at', { ascending: false });
    
    if (data) setNotes(data);
  };

  const loadProjectConversation = () => {
    if (!selectedProject) return;

    // Load the saved conversation
    if (selectedProject.query && selectedProject.response) {
      setMessages([
        {
          role: 'assistant',
          content: "👋 Here's your saved conversation. Continue where you left off!"
        },
        {
          role: 'user',
          content: selectedProject.query
        },
        {
          role: 'assistant',
          content: selectedProject.response
        }
      ]);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const userMessage = messageText || input.trim();
    if (!userMessage || loading) return;

    setInput('');
    setLoading(true);

    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage = { role: 'assistant' as const, content: data.response };
      setMessages(prev => [...prev, assistantMessage]);
      setHistory(data.history);

      // If project is selected, auto-save this exchange
      if (selectedProject && user) {
        await saveExchangeToProject(userMessage, data.response);
      }

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Sorry, something went wrong. Please try again.'
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const saveExchangeToProject = async (query: string, response: string) => {
    if (!selectedProject || !user) return;

    try {
      // Update project with latest conversation
      await supabase
        .from('projects')
        .update({
          query: query,
          response: response,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedProject.id);

      // Extract and save any products mentioned
      await extractAndSaveProducts(selectedProject.id, response);

    } catch (error) {
      console.error('Error auto-saving:', error);
    }
  };

  const extractAndSaveProducts = async (projectId: string, response: string) => {
    // Extract products from response
    const productPattern = /\*\*\d+\.\s+([^*]+)\*\*[\s\S]*?Price:\s*\$(\d+\.?\d*)/g;
    const matches = [...response.matchAll(productPattern)];

    if (matches.length === 0) return;

    // Check if products already exist to avoid duplicates
    const { data: existing } = await supabase
      .from('shopping_list_items')
      .select('product_name')
      .eq('project_id', projectId);

    const existingNames = existing?.map(item => item.product_name) || [];

    const newItems = matches
      .map(match => ({
        project_id: projectId,
        product_name: match[1].trim(),
        price: parseFloat(match[2]),
        quantity: 1
      }))
      .filter(item => !existingNames.includes(item.product_name));

    if (newItems.length > 0) {
      await supabase.from('shopping_list_items').insert(newItems);
    }
  };

  const saveNewProject = async () => {
    if (!user || !projectName.trim()) return;

    setSaving(true);
    
    try {
      // Get the last user question and AI response
      const lastUserMsg = messages.filter(m => m.role === 'user').pop();
      const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();

      if (!lastUserMsg || !lastAssistantMsg) {
        alert('No conversation to save yet!');
        return;
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectName,
          description: projectDescription || lastUserMsg.content.substring(0, 100),
          query: lastUserMsg.content,
          response: lastAssistantMsg.content
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Extract and save products
      await extractAndSaveProducts(project.id, lastAssistantMsg.content);

      setShowSaveDialog(false);
      setProjectName('');
      setProjectDescription('');
      
      if (onProjectSaved) onProjectSaved();

      alert('✅ Project saved successfully!');
      
  } catch (error: any) {
    console.error('Error saving:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    alert(`❌ Failed to save project. Error: ${error?.message || 'Unknown error'}`);
  } finally {
    setSaving(false);
  }
  };

  const addNote = async () => {
    if (!selectedProject || !user || !newNote.trim()) return;

    setAddingNote(true);

    try {
      const { error } = await supabase
        .from('project_notes')
        .insert({
          project_id: selectedProject.id,
          user_id: user.id,
          note: newNote
        });

      if (error) throw error;

      setNewNote('');
      loadNotes();
      
    } catch (error) {
      console.error('Error adding note:', error);
      alert('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      await supabase.from('project_notes').delete().eq('id', noteId);
      loadNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage();
  };

  const handleExampleClick = (query: string) => {
    setInput(query);
    sendMessage(query);
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto relative">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Project indicator */}
        {selectedProject && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between">
            <div>
              <div className="font-semibold text-blue-900">{selectedProject.name}</div>
              {selectedProject.description && (
                <div className="text-sm text-blue-700">{selectedProject.description}</div>
              )}
            </div>
            <button
              onClick={() => setShowNotesPanel(!showNotesPanel)}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Notes ({notes.length})
            </button>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Bot className="w-5 h-5 text-white" />
              </div>
            )}

            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-tl-sm shadow-sm'
              }`}
            >
              <div className={msg.role === 'user' ? 'text-white' : 'text-gray-900'}>
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => (
                      <p className="mb-2 last:mb-0" {...props} />
                    ),
                    strong: ({ node, ...props }) => (
                      <strong className="font-semibold" {...props} />
                    ),
                    ul: ({ node, ...props }) => (
                      <ul className="list-disc list-inside space-y-1 my-2" {...props} />
                    ),
                    li: ({ node, ...props }) => (
                      <li {...props} />
                    ),
                    code: ({ node, ...props }) => (
                      <code className={`${msg.role === 'user' ? 'bg-blue-700' : 'bg-gray-100'} px-1.5 py-0.5 rounded text-sm`} {...props} />
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>

            {msg.role === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shadow-sm">
                <User className="w-5 h-5 text-white" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Example Queries */}
      {messages.length === 1 && !selectedProject && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Try asking:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {exampleQueries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(query)}
                className="text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2 rounded-full transition shadow-sm hover:shadow"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Button */}
      {user && !selectedProject && messages.length > 1 && messages[messages.length - 1].role === 'assistant' && !loading && (
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold text-sm shadow-sm mx-auto"
          >
            <Save className="w-4 h-4" />
            Save to My Projects
          </button>
        </div>
      )}

      {/* Prompt for login if not authenticated */}
      {!user && messages.length > 1 && messages[messages.length - 1].role === 'assistant' && !loading && (
        <div className="px-4 pb-2">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <p className="text-sm text-yellow-800 mb-2">
              💡 <strong>Sign in</strong> to save this conversation and build your project shopping list!
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about building codes, materials, or calculations..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2 font-semibold shadow-sm"
            >
              <span className="hidden sm:inline">Send</span>
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Save Project Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold">Save to My Projects</h3>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Save this conversation and automatically build a shopping list from recommended products.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Kitchen Remodel, Deck Build"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Add any notes about this project..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 border-2 border-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-50 font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={saveNewProject}
                disabled={!projectName.trim() || saving}
                className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {saving ? 'Saving...' : 'Save Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notes Panel */}
      {showNotesPanel && selectedProject && (
        <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l shadow-2xl z-40 flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-bold text-lg">Project Notes</h3>
            <button
              onClick={() => setShowNotesPanel(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 group relative">
                <p className="text-sm text-gray-800 pr-6">{note.note}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            ))}

            {notes.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No notes yet</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
            />
            <button
              onClick={addNote}
              disabled={!newNote.trim() || addingNote}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {addingNote ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}