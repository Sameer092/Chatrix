import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { profileService } from '../services/profile.service';
import { useAuthStore } from '../store/authStore';

export function useOnlineStatus() {
  const userId = useAuthStore((s) => s.user?.id);
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const heartbeat = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId) return;

    const goOnline = () => profileService.updateOnlineStatus(userId, true);
    const goOffline = () => profileService.updateOnlineStatus(userId, false);

    goOnline();

    // Heartbeat: refresh last_seen every 45s while the app is foregrounded.
    // Presence is judged by is_online AND a recent last_seen, so this keeps an
    // active user "online" and lets a stale flag expire if the app dies.
    heartbeat.current = setInterval(() => {
      if (AppState.currentState === 'active') goOnline();
    }, 45000);

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        goOnline();
      } else if (nextState.match(/inactive|background/)) {
        goOffline();
      }
      appState.current = nextState;
    });

    return () => {
      goOffline();
      if (heartbeat.current) clearInterval(heartbeat.current);
      subscription.remove();
    };
  }, [userId]);
}
