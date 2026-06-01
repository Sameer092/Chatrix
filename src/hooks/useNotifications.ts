import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { notificationService } from '../services/notification.service';
import { profileService } from '../services/profile.service';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';

export function useNotifications() {
  const userId = useAuthStore((s) => s.user?.id);
  const { addNotification, setUnreadCount } = useNotificationStore();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!userId) return;

    const setup = async () => {
      const token = await notificationService.registerForPushNotifications();
      if (token) {
        await profileService.updatePushToken(userId, token);
      }

      const count = await notificationService.getUnreadCount(userId);
      setUnreadCount(count);
    };

    setup();

    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    const channel = notificationService.subscribeToNotifications(userId, (notification) => {
      addNotification(notification);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      channel.unsubscribe();
    };
  }, [userId]);
}
