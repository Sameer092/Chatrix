import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { authService } from '../services/auth.service';
import { profileService } from '../services/profile.service';
import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const {
    user, session, profile, isAuthenticated, isLoading,
    setUser, setSession, setProfile, setLoading, clearAuth,
  } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const currentSession = await authService.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          const prof = await profileService.getProfile(currentSession.user.id);
          setProfile(prof);
        }
      } catch {
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' && currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        try {
          const prof = await profileService.getProfile(currentSession.user.id);
          setProfile(prof);
        } catch {}
      } else if (event === 'SIGNED_OUT') {
        clearAuth();
      } else if (event === 'TOKEN_REFRESHED' && currentSession) {
        setSession(currentSession);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return { user, session, profile, isAuthenticated, isLoading };
}
