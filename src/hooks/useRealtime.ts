import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';

export function useRealtime(
  setup: () => RealtimeChannel,
  deps: React.DependencyList = []
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    channelRef.current = setup();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, deps);

  return channelRef;
}
