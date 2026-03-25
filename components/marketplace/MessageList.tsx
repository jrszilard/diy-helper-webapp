'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

interface Thread {
  id: string;
  contextType?: string;
  otherUserId: string;
  otherUserName: string;
  messageCount: number;
  unreadCount: number;
  lastMessage: {
    content: string;
    createdAt: string;
    attachments?: string[];
  };
}

interface MessageListProps {
  threads: Thread[];
  basePath: string;
}

export default function MessageList({ threads, basePath }: MessageListProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateStr: string) => {
    const diff = currentTime - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  if (threads.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        size="sm"
        description="No messages yet"
        subtext="Your conversations will appear here"
        className="py-12"
      />
    );
  }

  return (
    <div className="divide-y divide-earth-sand">
      {threads.map(thread => {
        const hasAttachments = thread.lastMessage.attachments && thread.lastMessage.attachments.length > 0;
        const preview = thread.lastMessage.content
          ? thread.lastMessage.content
          : hasAttachments
            ? 'Sent an image'
            : '';

        return (
          <Link
            key={thread.id}
            href={`${basePath}/${thread.id}`}
            className="flex items-center gap-3 px-4 py-3 hover:bg-earth-tan/50 transition-colors"
          >
            <div className="w-10 h-10 bg-slate-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-slate-blue">
                {thread.otherUserName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">{thread.otherUserName}</span>
                <span className="text-xs text-[var(--muted)]">{formatTimeAgo(thread.lastMessage.createdAt)}</span>
              </div>
              <p className="text-xs text-earth-brown truncate mt-0.5 flex items-center gap-1">
                {hasAttachments && <Paperclip size={10} className="flex-shrink-0" />}
                {preview}
              </p>
            </div>
            {thread.unreadCount > 0 && (
              <span className="w-5 h-5 bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {thread.unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
