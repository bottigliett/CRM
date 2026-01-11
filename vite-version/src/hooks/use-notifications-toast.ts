import { useEffect, useRef, useState } from 'react';
import { notificationsAPI, type Notification } from '@/lib/notifications-api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Icons map for different notification types
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'EVENT_REMINDER':
      return '🔔';
    case 'EVENT_ASSIGNED':
      return '📅';
    case 'TASK_ASSIGNED':
      return '✅';
    case 'TASK_DUE_SOON':
      return '⏰';
    case 'TASK_OVERDUE':
      return '⚠️';
    case 'SYSTEM':
      return 'ℹ️';
    default:
      return '🔔';
  }
};

export function useNotificationsToast() {
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date());
  const [isEnabled, setIsEnabled] = useState(true);
  const navigate = useNavigate();
  const processedIds = useRef(new Set<number>());

  useEffect(() => {
    if (!isEnabled) return;

    const checkNotifications = async () => {
      try {
        // Get unread notifications
        const response = await notificationsAPI.getNotifications(true);

        if (response.success && response.data.notifications) {
          const newNotifications = response.data.notifications.filter((notification: Notification) => {
            // Only show notifications created after last check and not already processed
            const notifTime = new Date(notification.createdAt);
            return notifTime > lastCheckTime && !processedIds.current.has(notification.id);
          });

          // Show toast for each new notification
          newNotifications.forEach((notification: Notification) => {
            const icon = getNotificationIcon(notification.type);

            toast(`${icon} ${notification.title}`, {
              description: notification.message,
              action: notification.link ? {
                label: 'Visualizza',
                onClick: () => {
                  navigate(notification.link!);
                  // Mark as read when clicking
                  notificationsAPI.markAsRead(notification.id).catch(console.error);
                },
              } : undefined,
              duration: 6000,
            });

            // Mark this notification as processed
            processedIds.current.add(notification.id);
          });

          if (newNotifications.length > 0) {
            setLastCheckTime(new Date());
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error);
      }
    };

    // Check immediately on mount
    checkNotifications();

    // Then check every 30 seconds
    const interval = setInterval(checkNotifications, 30000);

    return () => clearInterval(interval);
  }, [isEnabled, lastCheckTime, navigate]);

  return {
    isEnabled,
    setIsEnabled,
  };
}
