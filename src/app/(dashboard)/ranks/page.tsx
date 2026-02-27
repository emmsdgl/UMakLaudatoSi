'use client';

/**
 * ============================================================================
 * LEADERBOARD / RANKS PAGE
 * ============================================================================
 * Seeds-only leaderboard ranked by longest (best) streak.
 * Position is based on all-time best streak — missing a day resets
 * current streak but does NOT drop the user's rank.
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
  Sprout,
  Star,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

interface LeaderboardUser {
  id: string;
  name: string;
  image: string | null;
  best_streak: number;
  current_streak: number;
  total_seeds: number;
  rank: number;
}

export default function RanksPage() {
  const { data: session } = useSession();

  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/leaderboard?type=seeds&limit=100');
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      const rankedUsers: LeaderboardUser[] = (json.data || []).map((user: any) => ({
        id: user.user_id,
        name: user.name,
        image: user.avatar_url,
        best_streak: user.total,
        current_streak: user.current_streak || 0,
        total_seeds: user.total_seeds || 0,
        rank: user.rank,
      }));

      setLeaderboard(rankedUsers);

      // Find current user's position
      if (session?.user?.email) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .eq('email', session.user.email)
          .single();

        if (userData) {
          const existingPos = rankedUsers.find((u) => u.id === userData.id);
          if (existingPos) {
            setCurrentUser(existingPos);
          } else {
            // User hasn't played Wordle yet
            setCurrentUser({
              id: userData.id,
              name: userData.name,
              image: userData.avatar_url,
              best_streak: 0,
              current_streak: 0,
              total_seeds: 0,
              rank: rankedUsers.length + 1,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
    if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' };
    if (rank === 3) return { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    return null;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
          <Sprout className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Seed Leaderboard</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Ranked by longest Wordle streak
        </p>
      </div>

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
                <p className="text-2xl font-bold">{currentUser.best_streak}</p>
                <p className="text-white/80 text-sm">best streak</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm text-white/80">
                <Sprout className="w-4 h-4" />
                Current streak: {currentUser.current_streak}
              </div>
              <div className="text-sm text-white/80">
                Total seeds: {currentUser.total_seeds}
              </div>
            </div>
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
                {leaderboard[1]?.best_streak} seeds
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
                {leaderboard[0]?.best_streak} seeds
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
                {leaderboard[2]?.best_streak} seeds
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
              <Sprout className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No rankings yet</p>
              <p className="text-sm text-gray-400">Play Wordle daily to start your streak!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(0, 20).map((user) => {
                const isCurrentUser = currentUser?.id === user.id;
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

                    {/* Name & Current Streak */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${isCurrentUser ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'}`}>
                        {user.name || 'Anonymous'}
                        {isCurrentUser && ' (You)'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Sprout className="w-3 h-3 text-green-500" />
                        {user.current_streak > 0
                          ? `${user.current_streak} active streak`
                          : 'No active streak'}
                      </div>
                    </div>

                    {/* Best Streak */}
                    <div className="text-right">
                      <p className="font-bold text-gray-800 dark:text-white">
                        {user.best_streak}
                      </p>
                      <p className="text-xs text-gray-500">best</p>
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
            Play Eco-Wordle daily to grow your seed streak and climb the ranks!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
