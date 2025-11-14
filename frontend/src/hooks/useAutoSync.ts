import { useEffect, useState } from 'react';
import { useToast } from './use-toast';

export function useAutoSync(userId: string | null, enabled: boolean = true) {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId || !enabled) return;

    const performAutoSync = async () => {
      setSyncing(true);
      try {
        const response = await fetch('http://localhost:3000/api/contexts/smart-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
          credentials: 'include'
        });

        const data = await response.json();

        if (data.success) {
          // Update lastSync whether sync happened or was skipped
          if (data.lastSync) {
            setLastSync(new Date(data.lastSync));
          }

          if (!data.skipped) {
            console.log('Auto-sync completed:', data.stats);

            // Only show toast if we actually synced new data
            if (data.stats && data.stats.total > 0) {
              toast({
                title: 'Auto-sync completed',
                description: `Synced ${data.stats.total} new items from GitHub`,
                duration: 3000
              });
            }
          } else {
            console.log('Auto-sync skipped (recently synced)');
          }
        }
      } catch (error) {
        console.error('Auto-sync failed:', error);
        // Don't show error toast for auto-sync failures to avoid annoying users
      } finally {
        setSyncing(false);
      }
    };

    // Perform initial sync
    performAutoSync();

    // Set up interval for periodic sync (every 5 minutes)
    const interval = setInterval(performAutoSync, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, enabled, toast]);

  return { syncing, lastSync };
}

