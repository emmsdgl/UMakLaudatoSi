import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeContributions() {
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const pendingRef = useRef<any[]>([]);

  // Flush pending items into the visible list periodically
  // This gives a ~12s buffer so new pledges appear after ~2 items scroll by
  const flushPending = useCallback(() => {
    if (pendingRef.current.length > 0) {
      const items = [...pendingRef.current];
      pendingRef.current = [];
      setContributions((prev) => [...prev, ...items].slice(-20));
    }
  }, []);

  useEffect(() => {
    const flushInterval = setInterval(flushPending, 12000);
    return () => clearInterval(flushInterval);
  }, [flushPending]);

  useEffect(() => {
    async function fetchContributions() {
      // Fetch pledge messages (user-written pledges)
      const { data: pledges } = await supabase
        .from('pledge_messages')
        .select(`
          id,
          message,
          created_at,
          user_id,
          users (
            name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      const items = (pledges || []).map(p => ({
        ...p,
        pledge_text: p.message,
      }));

      // Reverse so oldest is first, newest at end (new pledges appear at the tail)
      setContributions(items.reverse());
      setLoading(false);
    }

    fetchContributions();

    // Subscribe to new pledge messages
    const pledgeChannel = supabase
      .channel('pledges-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pledge_messages',
        },
        async (payload) => {
          const { data: userData } = await supabase
            .from('users')
            .select('name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const newItem = {
            ...payload.new,
            users: userData,
            pledge_text: payload.new.message,
            _isNew: true,
          };

          // Buffer the new item — it will be flushed after ~12s
          pendingRef.current.push(newItem);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pledgeChannel);
    };
  }, []);

  return { contributions, loading };
}

/**
 * Compute plant stage from total pledge count
 */
function getPlantStage(count: number): 'seed' | 'sprout' | 'plant' | 'tree' {
  if (count >= 500) return 'tree';
  if (count >= 100) return 'plant';
  if (count >= 10) return 'sprout';
  return 'seed';
}

export function useRealtimePlantStats() {
  const [plantStats, setPlantStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch combined growth total from API
    // (pledge count + verified donation tier points)
    async function fetchStats() {
      try {
        const res = await fetch('/api/plant-stats');
        const data = await res.json();
        if (data.plantStats) {
          setPlantStats(data.plantStats);
        }
      } catch (err) {
        console.error('Failed to fetch plant stats:', err);
      }
      setLoading(false);
    }

    fetchStats();

    // Subscribe to new pledge_messages — each pledge adds 1 to growth
    const pledgeChannel = supabase
      .channel('plant-stats-pledges')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pledge_messages' },
        () => {
          setPlantStats((prev: any) => {
            if (!prev) return prev;
            const newTotal = prev.total_contributions + 1;
            return { ...prev, total_contributions: newTotal, current_stage: getPlantStage(newTotal) };
          });
        }
      )
      .subscribe();

    // Subscribe to gcash_donations updates — when status changes to 'verified',
    // re-fetch full stats so donation points are reflected in growth
    const donationChannel = supabase
      .channel('plant-stats-donations')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gcash_donations' },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    // Poll every 15 seconds as fallback — ensures donation verifications
    // are picked up even if real-time subscriptions don't fire
    // (anon client may lack Realtime access to gcash_donations)
    const pollInterval = setInterval(fetchStats, 15000);

    return () => {
      supabase.removeChannel(pledgeChannel);
      supabase.removeChannel(donationChannel);
      clearInterval(pollInterval);
    };
  }, []);

  return { plantStats, loading };
}
