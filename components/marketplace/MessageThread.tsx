'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, X, FolderOpen, ExternalLink } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';
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
  const parseProjectContext = (content: string): { projectName: string; description?: string; detailsLink: string; message: string } | null => {
    // Match: [Project: Name]\n(optional description)\nDetails: /chat?...\n---\n(message)
    const match = content.match(/^\[Project: (.+?)\]\n([\s\S]*?)Details: (\/chat\?[^\n]+)\n---\n([\s\S]*)$/);
    if (!match) return null;
    const description = match[2].trim() || undefined;
    return { projectName: match[1], description, detailsLink: match[3], message: match[4] };
  };

  const isBusy = sending || uploading;
  const canSend = (newMessage.trim() || pendingImages.length > 0) && !isBusy;

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <EmptyState description="No messages yet. Start the conversation!" className="py-8" />
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
                    ? 'bg-forest-green text-white'
                    : 'bg-earth-tan text-foreground'
                }`}
              >
                {!isCurrentUser && msg.senderName && (
                  <p className="text-xs font-semibold text-slate-blue mb-0.5">{msg.senderName}</p>
                )}
                {msg.content && (() => {
                  const project = parseProjectContext(msg.content);
                  if (project) {
                    return (
                      <>
                        <div className={`rounded-md px-2.5 py-2 mb-2 flex items-center gap-2 ${
                          isCurrentUser ? 'bg-white/15' : 'bg-slate-blue/10'
                        }`}>
                          <FolderOpen size={14} className={isCurrentUser ? 'text-white/80' : 'text-slate-blue'} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isCurrentUser ? 'text-white' : 'text-foreground'}`}>
                              {project.projectName}
                            </p>
                            {project.description && (
                              <p className={`text-xs truncate mt-0.5 ${isCurrentUser ? 'text-white/70' : 'text-earth-brown'}`}>
                                {project.description}
                              </p>
                            )}
                          </div>
                          <Link
                            href={project.detailsLink}
                            className={`text-xs flex items-center gap-0.5 flex-shrink-0 ${
                              isCurrentUser ? 'text-white/80 hover:text-white' : 'text-slate-blue hover:text-slate-blue-dark'
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
                  isCurrentUser ? 'text-white/70' : 'text-[var(--muted)]'
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
        <div className="border-t border-earth-sand bg-earth-cream px-3 py-2">
          <div className="flex gap-2 flex-wrap">
            {pendingImages.map((img, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={img.previewUrl}
                  alt={`Pending ${idx + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border border-earth-sand"
                />
                <button
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rust text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
      <div className="border-t border-earth-sand p-3 bg-surface">
        <div className="flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              isBusy
                ? 'text-[var(--muted)] cursor-not-allowed'
                : 'text-earth-brown hover:bg-earth-tan hover:text-slate-blue'
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
            className="flex-1 px-3 py-2 border border-earth-sand rounded-lg bg-white text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-slate-blue/50 resize-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              canSend
                ? 'bg-slate-blue text-white hover:bg-slate-blue-dark'
                : 'bg-earth-tan text-[var(--muted)] cursor-not-allowed'
            }`}
          >
            {isBusy ? <Spinner /> : <Send size={18} />}
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
