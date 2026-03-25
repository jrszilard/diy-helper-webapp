'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationBellProps {
  userId?: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!userId) return null;

  const handleNotificationClick = (id: string, link: string | null) => {
    markAsRead(id);
    if (link) {
      window.location.assign(link);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = currentTime - new Date(dateStr).getTime();
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
        className="relative p-2 text-earth-brown hover:text-foreground hover:bg-earth-tan rounded-lg transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-terracotta text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-earth-sand rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-earth-sand">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-slate-blue hover:text-slate-blue-dark font-medium"
              >
                Mark all as read
              </button>
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
                  className={`w-full text-left px-4 py-3 border-b border-earth-sand/50 hover:bg-earth-tan/50 transition-colors ${
                    !notification.isRead ? 'bg-earth-tan/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!notification.isRead && (
                      <span className="w-2 h-2 bg-terracotta rounded-full mt-1.5 flex-shrink-0" />
                    )}
                    <div className={`flex-1 ${notification.isRead ? 'ml-4' : ''}`}>
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="text-xs text-earth-brown mt-0.5 line-clamp-2">
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
