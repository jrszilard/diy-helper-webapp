'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';
import VideoResults from './VideoResults';

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
}

export default function ChatInterface({ 
  projectId: initialProjectId,
  onProjectLinked,
  userId
}: { 
  projectId?: string;
  onProjectLinked?: (projectId: string) => void;
  userId?: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      loadProjects();
    }
  }, [userId]);

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
  }, [messages]);

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
    // Remove both materials data and video data markers
    return content
      .replace(/---MATERIALS_DATA---[\s\S]*?---END_MATERIALS_DATA---/g, '')
      .replace(/\{[^{}]*"success":\s*true[^{}]*"videos":\s*\[[^\]]*\][^{}]*\}/gs, '')
      .trim();
  };
  
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages,
          project_id: projectId
        })
      });

      const data = await response.json();

      if (data.response) {
        const materials = extractMaterialsData(data.response);
        
        if (materials) {
          setExtractedMaterials(materials);
          setShowSaveDialog(true);
        }

        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.response }
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }
      ]);
    } finally {
      setIsLoading(false);
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
      alert('You must be logged in to save materials');
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
        price: null
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
      onProjectLinked?.(targetProjectId);

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `✅ Successfully saved ${extractedMaterials.materials.length} items to your project! The shopping list should now appear on the right.`
        }
      ]);
    } catch (err: any) {
      console.error('Error:', err);
      alert('An error occurred while saving materials: ' + err.message);
    }
  };

  const createNewProjectAndSave = async () => {
    if (!extractedMaterials) return;
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
      alert('You must be logged in to create a project');
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold text-gray-900">DIY Helper Chat</h1>
        {projectId && (
          <p className="text-sm text-gray-600">
            💼 Linked to project: {projects.find(p => p.id === projectId)?.name || 'Unknown'}
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          // ✅ NEW: Check if this message contains video results
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
                    : 'bg-transparent'  // ✅ CHANGED: was 'bg-white border...'
                }`}
              >
                {/* ✅ NEW: Render video results if found */}
                {videoResults.found && (
                  <div className="mb-4">
                    <VideoResults 
                      videos={videoResults.videos || []} 
                      projectQuery={videoResults.query || 'Project'}
                    />
                  </div>
                )}

                {/* ✅ NEW: Separate div for text content */}
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

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Manual "Save Materials" Button */}
      {!showSaveDialog && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && 
        (messages[messages.length - 1].content.toLowerCase().includes('materials list') || 
        messages[messages.length - 1].content.toLowerCase().includes('shopping list')) &&
        !extractedMaterials && (
        <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm text-yellow-800 font-medium">
                💡 To save these materials to your project, ask me to:
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
            <p className="text-gray-600 mb-4">
              I found {extractedMaterials.materials.length} materials for "{extractedMaterials.project_description}". 
              Would you like to save them to a project?
            </p>

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
                onClick={() => setShowSaveDialog(false)}
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