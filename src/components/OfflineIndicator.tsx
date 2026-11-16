import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 right-4 z-50 glass-surface flex items-center gap-2 rounded-2xl px-3.5 py-2 text-xs font-bold text-[#B7FF00]"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Local ledger active</span>
    </div>
  );
}
