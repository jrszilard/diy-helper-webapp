'use client';

import { MessageSquare, Paperclip } from 'lucide-react';
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
  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
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
      <div className="text-center py-12">
        <MessageSquare size={32} className="mx-auto text-[#D4C8B8] mb-3" />
        <p className="text-sm text-[#7D6B5D]">No messages yet</p>
        <p className="text-xs text-[#B0A696] mt-1">Your conversations will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#D4C8B8]">
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
            className="flex items-center gap-3 px-4 py-3 hover:bg-[#E8DFD0]/50 transition-colors"
          >
            <div className="w-10 h-10 bg-[#5D7B93]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-[#5D7B93]">
                {thread.otherUserName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#3E2723]">{thread.otherUserName}</span>
                <span className="text-xs text-[#B0A696]">{formatTimeAgo(thread.lastMessage.createdAt)}</span>
              </div>
              <p className="text-xs text-[#7D6B5D] truncate mt-0.5 flex items-center gap-1">
                {hasAttachments && <Paperclip size={10} className="flex-shrink-0" />}
                {preview}
              </p>
            </div>
            {thread.unreadCount > 0 && (
              <span className="w-5 h-5 bg-[#C67B5C] text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                {thread.unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
