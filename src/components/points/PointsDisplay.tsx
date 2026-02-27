'use client';

/**
 * ============================================================================
 * POINTS DISPLAY COMPONENT
 * ============================================================================
 * Shows user's current points, streak, and quick stats.
 * Used in the main interface for authenticated users.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { Flame, TrendingUp, Gift, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { supabase } from '@/lib/supabase';

interface UserStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  total_contributions: number;
}

interface PointsDisplayProps {
  /** Compact mode for smaller layouts */
  compact?: boolean;
  /** Show rewards link */
  showRewardsLink?: boolean;
}

export default function PointsDisplay({ 
  compact = false, 
  showRewardsLink = true 
}: PointsDisplayProps) {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user stats
  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      try {
        // Get user data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, total_points')
          .eq('email', session.user.email)
          .single();

        if (userError || !userData) {
          setLoading(false);
          return;
        }

        // Get streak data
        const { data: streakData } = await supabase
          .from('streaks')
          .select('current_streak, longest_streak')
          .eq('user_id', userData.id)
          .single();

        // Get pledge count
        const { count: contribCount } = await supabase
          .from('pledge_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id);

        setStats({
          total_points: userData.total_points || 0,
          current_streak: streakData?.current_streak || 0,
          longest_streak: streakData?.longest_streak || 0,
          total_contributions: contribCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    // Set up real-time subscription for point updates
    const channel = supabase
      .channel('user-points')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: `email=eq.${session.user.email}`,
        },
        (payload: any) => {
          if (payload.new) {
            setStats((prev) =>
              prev
                ? { ...prev, total_points: payload.new.total_points || 0 }
                : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, status]);

  // Not logged in
  if (!session) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <Card className={compact ? '' : 'w-full max-w-md'}>
        <CardContent className={compact ? 'p-3' : 'p-6'}>
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-16 mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Compact version for headers/sidebars
  if (compact) {
    return (
      <div className="flex items-center gap-4 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
        {/* Points */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-lg text-green-700 dark:text-green-300">
            {stats?.total_points.toLocaleString() || 0}
          </span>
          <span className="text-xs text-gray-500">pts</span>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-1">
          <Flame className="w-5 h-5 text-orange-500" />
          <span className="font-medium text-orange-600 dark:text-orange-400">
            {stats?.current_streak || 0}
          </span>
        </div>

        {/* Rewards Link */}
        {showRewardsLink && (
          <Link href="/rewards">
            <Button size="sm" variant="outline" className="ml-auto">
              <Gift className="w-4 h-4 mr-1" />
              Rewards
            </Button>
          </Link>
        )}
      </div>
    );
  }

  // Full version
  return (
    <Card className="w-full max-w-md overflow-hidden">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Your Points</p>
            <p className="text-4xl font-bold">
              {stats?.total_points.toLocaleString() || 0}
            </p>
          </div>
          <Sparkles className="w-12 h-12 text-green-200" />
        </div>
      </div>

      <CardContent className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Current Streak */}
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <Flame className="w-6 h-6 text-orange-500 mx-auto" />
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              {stats?.current_streak || 0}
            </p>
            <p className="text-xs text-gray-500">Day Streak</p>
          </div>

          {/* Total Pledges */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-500 mx-auto" />
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {stats?.total_contributions || 0}
            </p>
            <p className="text-xs text-gray-500">Pledges</p>
          </div>

          {/* Best Streak */}
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Sparkles className="w-6 h-6 text-purple-500 mx-auto" />
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
              {stats?.longest_streak || 0}
            </p>
            <p className="text-xs text-gray-500">Best Streak</p>
          </div>
        </div>

        {/* Streak Bonus Info */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-center text-sm">
          {stats?.current_streak === 0 ? (
            <p className="text-gray-500">
              Make a pledge today to start your streak! 🌱
            </p>
          ) : stats?.current_streak && stats.current_streak >= 5 ? (
            <p className="text-green-600 dark:text-green-400 font-medium">
              🔥 You&apos;re on fire! Max streak bonus active (+5 pts per pledge)
            </p>
          ) : (
            <p className="text-gray-500">
              {5 - (stats?.current_streak || 0)} more days to max streak bonus!
            </p>
          )}
        </div>

        {/* Actions */}
        {showRewardsLink && (
          <div className="flex gap-2 mt-4">
            <Link href="/rewards" className="flex-1">
              <Button className="w-full" variant="default">
                <Gift className="w-4 h-4 mr-2" />
                Browse Rewards
              </Button>
            </Link>
            <Link href="/leaderboard" className="flex-1">
              <Button className="w-full" variant="outline">
                <TrendingUp className="w-4 h-4 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
