'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EcoPathPledgeProgress } from '@/types';

export function useEcoPathProgress() {
  const [progress, setProgress] = useState<EcoPathPledgeProgress | null>(null);
  const [canSwitchPath, setCanSwitchPath] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/eco-paths/progress');
      const data = await res.json();
      if (data.success) {
        setProgress(data.progress);
        setCanSwitchPath(data.can_switch_path);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { progress, canSwitchPath, loading, refetch: fetchProgress };
}
