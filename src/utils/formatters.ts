export function formatDistanceToNow(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Derives a presence label. A user is only "online" if is_online is set AND
 * last_seen is recent (within 90s). This prevents a stale is_online=true
 * (e.g. after a force-quit) from showing someone online for hours.
 */
export function formatPresence(
  isOnline: boolean | undefined,
  lastSeen: string | null | undefined
): { text: string; online: boolean } {
  if (!lastSeen) {
    return { text: isOnline ? 'Online' : 'Offline', online: !!isOnline };
  }
  const secondsAgo = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  const reallyOnline = !!isOnline && secondsAgo < 90;
  if (reallyOnline) return { text: 'Online', online: true };
  return { text: `Last seen ${formatDistanceToNow(lastSeen)}`, online: false };
}
