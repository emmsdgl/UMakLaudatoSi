'use client';

/**
 * ============================================================================
 * LEADERBOARD / RANKS PAGE
 * ============================================================================
 * Features:
 * - Top eco warriors ranking
 * - Current user's position highlighted
 * - Weekly/Monthly/All-time filters
 * - Animated rank display
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Trophy,
  Crown,
  Medal,
  Award,
  TrendingUp,
  Flame,
  Star,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  total_points: number;
  current_streak: number;
  rank: number;
  trend?: 'up' | 'down' | 'same';
}

type TimeFilter = 'weekly' | 'monthly' | 'alltime';

export default function RanksPage() {
  const { data: session } = useSession();

  // State
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('alltime');

  /**
   * Fetch leaderboard data
   */
  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    try {
      // Map time filter to API period param
      const periodMap: Record<TimeFilter, string> = {
        weekly: 'weekly',
        monthly: 'monthly',
        alltime: 'all',
      };

      // Fetch leaderboard via API route (bypasses RLS)
      const res = await fetch(`/api/leaderboard?type=points&period=${periodMap[timeFilter]}&limit=100`);
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      const rankedUsers = (json.data || []).map((user: any) => ({
        id: user.user_id,
        name: user.name,
        email: '',
        image: user.avatar_url,
        total_points: user.total,
        current_streak: 0,
        rank: user.rank,
        trend: 'same' as const,
      }));

      setLeaderboard(rankedUsers);

      // Find current user's position using direct query (SELECT works with anon key)
      if (session?.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, email, avatar_url, total_points')
          .eq('email', session.user.email)
          .single();

        if (userData) {
          // Check if user is already in the leaderboard
          const existingPos = rankedUsers.find((u: any) => u.id === userData.id);
          if (existingPos) {
            setCurrentUser(existingPos);
          } else {
            const { count } = await supabase
              .from('users')
              .select('*', { count: 'exact', head: true })
              .gt('total_points', userData.total_points || 0);

            setCurrentUser({
              ...userData,
              image: userData.avatar_url,
              current_streak: 0,
              rank: (count || 0) + 1,
              trend: 'same',
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, timeFilter]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  /**
   * Get initials from name
   */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Get rank badge configuration
   */
  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
    if (rank === 3) return { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    return null;
  };

  /**
   * Get trend icon
   */
  const getTrendIcon = (trend?: 'up' | 'down' | 'same') => {
    switch (trend) {
      case 'up':
        return <ChevronUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ChevronDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Top eco warriors at UMak
        </p>
      </div>

      {/* Time Filter */}
      <Tabs value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="alltime">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Current User Position */}
      {currentUser && (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 border-2 border-white/50">
                  <AvatarImage src={session?.user?.image || ''} />
                  <AvatarFallback className="bg-white/20 text-white">
                    {currentUser.name ? getInitials(currentUser.name) : 'ME'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white text-green-600 flex items-center justify-center text-xs font-bold">
                  {currentUser.rank}
                </div>
              </div>

              <div className="flex-1">
                <p className="text-white/80 text-sm">Your Position</p>
                <p className="text-xl font-bold">Rank #{currentUser.rank}</p>
              </div>

              <div className="text-right">
                <p className="text-2xl font-bold">{currentUser.total_points}</p>
                <p className="text-white/80 text-sm">points</p>
              </div>
            </div>

            {currentUser.rank > 1 && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <p className="text-sm text-white/80">
                  🎯 {currentUser.rank <= 10 
                    ? `${(leaderboard[currentUser.rank - 2]?.total_points || 0) - currentUser.total_points + 1} points to rank up!`
                    : `Keep going! You're doing great!`}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {!loading && leaderboard.length >= 3 && (
        <div className="flex items-end justify-center gap-3 py-4">
          {/* 2nd Place */}
          <div className="flex flex-col items-center">
            <Avatar className="w-14 h-14 border-4 border-gray-300">
              <AvatarImage src={leaderboard[1]?.image || ''} />
              <AvatarFallback className="bg-gray-200 text-gray-600">
                {leaderboard[1]?.name ? getInitials(leaderboard[1].name) : '2'}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-t-lg w-20 h-16 flex flex-col items-center justify-center">
              <Medal className="w-5 h-5 text-gray-400 mb-1" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                {leaderboard[1]?.total_points}
              </span>
            </div>
          </div>

          {/* 1st Place */}
          <div className="flex flex-col items-center">
            <Avatar className="w-16 h-16 border-4 border-yellow-400 ring-4 ring-yellow-200">
              <AvatarImage src={leaderboard[0]?.image || ''} />
              <AvatarFallback className="bg-yellow-100 text-yellow-600">
                {leaderboard[0]?.name ? getInitials(leaderboard[0].name) : '1'}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 bg-gradient-to-t from-yellow-400 to-amber-300 rounded-t-lg w-24 h-24 flex flex-col items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-700 mb-1" />
              <span className="text-sm font-bold text-yellow-800">
                {leaderboard[0]?.total_points}
              </span>
            </div>
          </div>

          {/* 3rd Place */}
          <div className="flex flex-col items-center">
            <Avatar className="w-14 h-14 border-4 border-amber-500">
              <AvatarImage src={leaderboard[2]?.image || ''} />
              <AvatarFallback className="bg-amber-100 text-amber-600">
                {leaderboard[2]?.name ? getInitials(leaderboard[2].name) : '3'}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg w-20 h-12 flex flex-col items-center justify-center">
              <Award className="w-5 h-5 text-amber-700 mb-1" />
              <span className="text-xs font-bold text-amber-800">
                {leaderboard[2]?.total_points}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Rankings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rankings yet</p>
              <p className="text-sm text-gray-400">Be the first to earn points!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 20).map((user, index) => {
                const isCurrentUser = user.email === session?.user?.email;
                const rankBadge = getRankBadge(user.rank);

                return (
                  <div
                    key={user.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl transition-all
                      ${isCurrentUser 
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                    `}
                  >
                    {/* Rank */}
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${rankBadge ? rankBadge.bg : 'bg-gray-100 dark:bg-gray-700'}
                    `}>
                      {rankBadge ? (
                        <rankBadge.icon className={`w-4 h-4 ${rankBadge.color}`} />
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">{user.rank}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user.image || ''} />
                      <AvatarFallback className="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                        {user.name ? getInitials(user.name) : '?'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Streak */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentUser ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>
                        {user.name || 'Anonymous'}
                        {isCurrentUser && ' (You)'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {user.current_streak} day streak
                      </div>
                    </div>

                    {/* Trend */}
                    {getTrendIcon(user.trend)}

                    {/* Points */}
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">
                        {user.total_points.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">pts</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivation */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-green-800 dark:text-green-300">
            🌱 Every pledge counts! Keep making daily commitments to climb the ranks.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
