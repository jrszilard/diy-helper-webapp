'use client';

import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface Thread {
  id: string;
  lastMessage: string;
  otherUserName: string;
  unreadCount: number;
  updatedAt: string;
}

interface MessageListProps {
  threads: Thread[];
}

export default function MessageList({ threads }: MessageListProps) {
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
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#D4C8B8]">
      {threads.map(thread => (
        <Link
          key={thread.id}
          href={`/experts/dashboard/messages/${thread.id}`}
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
              <span className="text-xs text-[#B0A696]">{formatTimeAgo(thread.updatedAt)}</span>
            </div>
            <p className="text-xs text-[#7D6B5D] truncate mt-0.5">{thread.lastMessage}</p>
          </div>
          {thread.unreadCount > 0 && (
            <span className="w-5 h-5 bg-[#C67B5C] text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
              {thread.unreadCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
