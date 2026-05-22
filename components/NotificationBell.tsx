'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBellProps {
  userId?: string;
  placement?: 'bottom' | 'top';
}

export default function NotificationBell({ userId, placement = 'bottom' }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [now] = useState(() => Date.now());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!userId) return null;

  const handleNotificationClick = (id: string, link: string | null) => {
    markAsRead(id);
    setIsOpen(false);
    if (link) {
      router.push(link);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[var(--earth-sand)] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rust text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className={`absolute left-0 w-80 bg-[var(--earth-brown-dark)] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white/80">Notifications</h3>
            {unreadCount > 0 && (
              <Button variant="ghost" size="xs" onClick={() => markAllAsRead()}>
                Mark all as read
              </Button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} iconSize={24} size="sm" description="No notifications yet" className="px-4 py-8" />
            ) : (
              notifications.slice(0, 10).map(notification => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id, notification.link)}
                  className={`w-full text-left px-4 py-3 border-b border-white/10 hover:bg-white/10 transition-colors ${
                    !notification.isRead ? 'bg-white/8' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-rust rounded-full mt-1.5 flex-shrink-0" />
                    )}
                    <div className={`flex-1 ${notification.isRead ? 'ml-4' : ''}`}>
                      <p className="text-sm font-medium text-white/80 line-clamp-1">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-white/50 mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}
                      <p className="text-xs text-muted mt-1">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
