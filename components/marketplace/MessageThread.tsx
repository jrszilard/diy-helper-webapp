'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, X, Loader2, FolderOpen, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Message {
  id: string;
  senderUserId: string;
  senderName?: string;
  content: string;
  attachments?: string[];
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  onSend: (content: string, attachments: string[]) => Promise<void>;
  sending?: boolean;
}

interface PendingImage {
  file: File;
  previewUrl: string;
}

export default function MessageThread({ messages, currentUserId, onSend, sending }: MessageThreadProps) {
  const [newMessage, setNewMessage] = useState('');
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: PendingImage[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newImages.push({
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setPendingImages(prev => [...prev, ...newImages]);

    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadImage = async (file: File): Promise<string> => {
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error('Not authenticated');

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/messages/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content && pendingImages.length === 0) return;
    if (sending || uploading) return;

    try {
      setUploading(true);

      // Upload all pending images
      const attachmentUrls: string[] = [];
      for (const img of pendingImages) {
        const url = await uploadImage(img.file);
        attachmentUrls.push(url);
      }

      // Clear pending images
      pendingImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setPendingImages([]);
      setNewMessage('');

      await onSend(content, attachmentUrls);
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Parse project context from message content
  const parseProjectContext = (content: string): { projectName: string; detailsLink: string; message: string } | null => {
    const match = content.match(/^\[Project: (.+?)\]\nDetails: (\/chat\?id=[^\n]+)\n---\n([\s\S]*)$/);
    if (!match) return null;
    return { projectName: match[1], detailsLink: match[2], message: match[3] };
  };

  const isBusy = sending || uploading;
  const canSend = (newMessage.trim() || pendingImages.length > 0) && !isBusy;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-[#7D6B5D] py-8">No messages yet. Start the conversation!</p>
        )}
        {messages.map(msg => {
          const isCurrentUser = msg.senderUserId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 ${
                  isCurrentUser
                    ? 'bg-[#4A7C59] text-white'
                    : 'bg-[#E8DFD0] text-[#3E2723]'
                }`}
              >
                {!isCurrentUser && msg.senderName && (
                  <p className="text-xs font-semibold text-[#5D7B93] mb-0.5">{msg.senderName}</p>
                )}
                {msg.content && (() => {
                  const project = parseProjectContext(msg.content);
                  if (project) {
                    return (
                      <>
                        <div className={`rounded-md px-2.5 py-2 mb-2 flex items-center gap-2 ${
                          isCurrentUser ? 'bg-white/15' : 'bg-[#5D7B93]/10'
                        }`}>
                          <FolderOpen size={14} className={isCurrentUser ? 'text-white/80' : 'text-[#5D7B93]'} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-[#3E2723]'}`}>
                              {project.projectName}
                            </p>
                          </div>
                          <Link
                            href={project.detailsLink}
                            className={`text-xs flex items-center gap-0.5 flex-shrink-0 ${
                              isCurrentUser ? 'text-white/80 hover:text-white' : 'text-[#5D7B93] hover:text-[#4A6578]'
                            }`}
                            onClick={e => e.stopPropagation()}
                          >
                            View <ExternalLink size={10} />
                          </Link>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{project.message}</p>
                      </>
                    );
                  }
                  return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
                })()}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {msg.attachments.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setLightboxUrl(url)}
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="max-w-[240px] rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                )}
                <p className={`text-xs mt-1 ${
                  isCurrentUser ? 'text-white/70' : 'text-[#B0A696]'
                }`}>
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending image previews */}
      {pendingImages.length > 0 && (
        <div className="border-t border-[#D4C8B8] bg-[#F5F0E6] px-3 py-2">
          <div className="flex gap-2 flex-wrap">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.previewUrl}
                  alt={`Pending ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-[#D4C8B8]"
                />
                <button
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[#B8593B] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[#D4C8B8] p-3 bg-[#FDFBF7]">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isBusy
                ? 'text-[#B0A696] cursor-not-allowed'
                : 'text-[#7D6B5D] hover:bg-[#E8DFD0] hover:text-[#5D7B93]'
            }`}
            aria-label="Attach image"
          >
            <Image size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            disabled={isBusy}
            className="flex-1 px-3 py-2 border border-[#D4C8B8] rounded-lg bg-white text-[#3E2723] text-sm focus:outline-none focus:ring-2 focus:ring-[#5D7B93]/50 resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              canSend
                ? 'bg-[#5D7B93] text-white hover:bg-[#4A6578]'
                : 'bg-[#E8DFD0] text-[#B0A696] cursor-not-allowed'
            }`}
          >
            {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-colors"
            aria-label="Close image"
          >
            <X size={28} />
          </button>
          <img
            src={lightboxUrl}
            alt="Full size"
            className="max-w-full max-h-full rounded-lg"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
