'use client';

/**
 * ============================================================================
 * DASHBOARD HOME PAGE - Improved UX Flow
 * ============================================================================
 * Main dashboard for authenticated UMak users featuring:
 * - Personalized greeting with time-based message
 * - Interactive plant visualization (gamification)
 * - "Take Pledge" button (not inline form - cleaner UX)
 * - Stats at a glance (Points, Streak, Rank)
 * - Welcome modal for new users
 * 
 * FLOW:
 * - New user: Welcome modal -> Pledge page -> Return here
 * - Returning user: Dashboard with "Take Pledge" button -> Pledge page -> Return
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Star,
  TrendingUp,
  Leaf,
  Gift,
  Trophy,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Heart,
  Megaphone,
  Sprout,
  Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { BookOpen, Calculator, Wallet } from 'lucide-react';
import { useCarbonFootprint } from '@/hooks/useCarbonFootprint';
import { getEcoPath } from '@/lib/constants/eco-paths';
import dynamic from 'next/dynamic';

// Dynamically import ThreePlant to avoid SSR issues
const ThreePlant = dynamic(
  () => import('@/components/plant/ThreePlant').then((mod) => mod.ThreePlant),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-64 bg-gradient-to-b from-green-100 to-emerald-200 dark:from-green-900/30 dark:to-emerald-900/30 rounded-3xl animate-pulse flex items-center justify-center">
        <Leaf className="w-12 h-12 text-green-400 animate-bounce" />
      </div>
    ),
  }
);

/**
 * Check if email is UMak domain
 */
function isUMakEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase().endsWith('@umak.edu.ph') || false;
}

/**
 * Get real-world season based on current month
 */
function getRealSeason(): "Spring" | "Summer" | "Autumn" | "Winter" {
  const month = new Date().getMonth(); // 0-11
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

interface UserStats {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  rank: number;
  last_contribution: string | null;
  can_pledge_today: boolean;
  has_completed_onboarding: boolean;
  is_new_user: boolean;
  is_guest: boolean; // Non-UMak users
  guest_has_pledged: boolean; // Guest already used their 1-time pledge
  role: string; // admin, student, employee, guest, user
  wallet_balance: number;
  has_public_pledge: boolean;
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { summary: cfSummary } = useCarbonFootprint();
  const [pledgeModalOpen, setPledgeModalOpen] = useState(false);
  const [pledgeMessage, setPledgeMessage] = useState('');
  const [pledgeSubmitting, setPledgeSubmitting] = useState(false);
  const [seedStreak, setSeedStreak] = useState({ current: 0, longest: 0, total: 0 });
  const [weeklyWins, setWeeklyWins] = useState<string[]>([]);

  /**
   * Get time-based greeting message
   */
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  /**
   * Get first name from full name
   */
  const getFirstName = () => {
    const name = session?.user?.name || 'Friend';
    return name.split(' ')[0];
  };

  /**
   * Fetch user stats from database
   */
  const fetchStats = useCallback(async () => {
    if (!session?.user?.email) return;

    const userEmail = session.user.email;
    const isGuest = !isUMakEmail(userEmail);

    try {
      // Get user data including role
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, total_points, wallet_balance, last_contribution, has_completed_onboarding, created_at, role')
        .eq('email', userEmail)
        .single();

      if (userError) {
        // User might not exist yet - they're new
        setStats({
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          rank: 0,
          last_contribution: null,
          can_pledge_today: true,
          has_completed_onboarding: false,
          is_new_user: true,
          is_guest: isGuest,
          guest_has_pledged: false,
          role: isGuest ? 'guest' : 'user',
          wallet_balance: 0,
          has_public_pledge: false,
        });
        setLoading(false);
        return;
      }

      const isAdmin = userData.role === 'admin';
      const effectiveIsGuest = isGuest && !isAdmin; // Admins aren't treated as guests

      // Get streak data
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', userData.id)
        .single();

      // Get user rank (based on seed leaderboard - longest_seed_streak, matching /ranks page)
      let rank = 0;
      const { data: userSeedData } = await supabase
        .from('wordle_seeds')
        .select('longest_seed_streak')
        .eq('user_id', userData.id)
        .single();

      const userBestStreak = userSeedData?.longest_seed_streak || 0;

      // Count how many non-banned, non-excluded users have a longer streak
      const { data: allSeeds } = await supabase
        .from('wordle_seeds')
        .select('user_id, longest_seed_streak')
        .gt('longest_seed_streak', userBestStreak);

      if (allSeeds) {
        // Filter out banned users and excluded roles (matching leaderboard API logic)
        const seedUserIds = allSeeds.map((s: any) => s.user_id);
        if (seedUserIds.length > 0) {
          const { data: seedUsers } = await supabase
            .from('users')
            .select('id, role, is_banned')
            .in('id', seedUserIds);

          const validCount = (seedUsers || []).filter(
            (u: any) => !u.is_banned && u.role !== 'canteen_admin'
          ).length;
          rank = validCount + 1;
        } else {
          rank = 1;
        }
      } else {
        rank = 1;
      }

      // Check if guest has already used their 1-time pledge
      let guestHasPledged = false;
      if (effectiveIsGuest) {
        const { count: pledgeCount } = await supabase
          .from('pledge_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id);

        guestHasPledged = (pledgeCount || 0) > 0;
      }

      // Check if user already has a public pledge
      const { count: publicPledgeCount } = await supabase
        .from('pledge_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id);
      const hasPublicPledge = (publicPledgeCount || 0) > 0;

      // Check if user can pledge today
      const today = new Date().toDateString();
      const lastContrib = userData.last_contribution 
        ? new Date(userData.last_contribution).toDateString()
        : null;
      
      // Guests: can only pledge if they haven't pledged before
      // UMak users & admins: can pledge once per day
      const canPledgeToday = effectiveIsGuest 
        ? !guestHasPledged 
        : lastContrib !== today;

      // Check if new user (created within last hour and hasn't completed onboarding)
      const createdAt = new Date(userData.created_at);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const isNewUser = createdAt > oneHourAgo && !userData.has_completed_onboarding;

      setStats({
        total_points: userData.total_points || 0,
        current_streak: streakData?.current_streak || 0,
        longest_streak: streakData?.longest_streak || 0,
        rank,
        last_contribution: userData.last_contribution,
        can_pledge_today: canPledgeToday,
        has_completed_onboarding: userData.has_completed_onboarding || false,
        is_new_user: isNewUser,
        is_guest: effectiveIsGuest,
        guest_has_pledged: guestHasPledged,
        role: userData.role || (isGuest ? 'guest' : 'user'),
        wallet_balance: userData.wallet_balance || 0,
        has_public_pledge: hasPublicPledge,
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
      // Fetch seed streak data for the streak indicator
      fetch('/api/wordle')
        .then(res => res.json())
        .then(json => {
          if (json.success && json.data) {
            const seedStats = json.data.seed_stats;
            if (seedStats) {
              setSeedStreak({
                current: seedStats.current_seed_streak || 0,
                longest: seedStats.longest_seed_streak || 0,
                total: seedStats.total_seeds_earned || 0,
              });
            }
            if (json.data.weekly_wins) {
              setWeeklyWins(json.data.weekly_wins);
            }
          }
        })
        .catch(() => {}); // Silently fail - streak just shows 0
    }
  }, [status, fetchStats]);

  /**
   * Calculate plant growth stage based on streak
   */
  const getPlantStage = (): 'seed' | 'sprout' | 'plant' | 'tree' => {
    const streak = stats?.current_streak || 0;
    if (streak === 0) return 'seed';
    if (streak < 7) return 'sprout';
    if (streak < 14) return 'plant';
    return 'tree';
  };

  /**
   * Get plant status message
   */
  const getPlantMessage = () => {
    const streak = stats?.current_streak || 0;
    if (streak === 0) return "Plant a seed with your first pledge! 🌱";
    if (streak < 3) return "Your seedling is sprouting! Keep it up!";
    if (streak < 7) return "Your plant is growing stronger! 🌿";
    if (streak < 14) return "Look at those leaves! You're doing great! 🍃";
    if (streak < 30) return "Your plant is thriving beautifully! 🌳";
    return "A magnificent tree! You're an eco-champion! 🌲✨";
  };

  /**
   * Handle public pledge submission
   */
  const handlePublicPledge = async () => {
    if (!pledgeMessage.trim() || pledgeSubmitting) return;

    setPledgeSubmitting(true);
    try {
      const res = await fetch('/api/public-pledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: pledgeMessage.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Pledge Published!',
          description: `Your public pledge is now live! +${data.points_earned} points earned.`,
        });
        setPledgeModalOpen(false);
        setPledgeMessage('');
        // Update local state
        setStats(prev => prev ? {
          ...prev,
          has_public_pledge: true,
          total_points: prev.total_points + (data.points_earned || 20),
        } : prev);
      } else {
        toast({
          title: 'Unable to submit',
          description: data.message || 'Something went wrong.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit your pledge. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setPledgeSubmitting(false);
    }
  };

  // Loading skeleton
  if (loading || status === 'loading') {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
        <Skeleton className="h-64 md:h-80 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Skeleton className="h-24 sm:h-28 rounded-xl" />
          <Skeleton className="h-24 sm:h-28 rounded-xl" />
          <Skeleton className="h-24 sm:h-28 rounded-xl" />
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Hero Section */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {getGreeting()}, <span className="text-green-600 dark:text-green-400">{getFirstName()}</span>! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {stats?.is_guest && stats?.guest_has_pledged
            ? "Thanks for your pledge! Sign in with @umak.edu.ph for full access."
            : stats?.can_pledge_today 
              ? "Ready to make today's eco-pledge?" 
              : "Great job pledging today! See you tomorrow."}
        </p>
        {stats?.is_guest && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Guest Account • 1 Pledge Available
          </Badge>
        )}
      </div>

      {/* Canteen Admin Wallet Card */}
      {stats?.role === 'canteen_admin' && (
        <Card
          className="border-0 shadow-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => router.push('/wallet')}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-7 h-7 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 dark:text-gray-400">Wallet Balance</p>
              <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats.wallet_balance} pts
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Plant Visualization Card - Only for non-canteen roles */}
      {stats?.role !== 'canteen_admin' && (
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-b from-white to-green-50 dark:from-gray-800 dark:to-green-900/20">
        <CardContent className="p-0">
          {/* Plant Canvas */}
          <div className="relative h-64 overflow-hidden">
            <ThreePlant
              stage={getPlantStage()}
              contributors={[]}
              contributions={stats?.total_points || 0}
              season={getRealSeason()}
            />
            
            {/* Streak Badge */}
            {(stats?.current_streak || 0) > 0 && (
              <div className="absolute top-4 right-4">
                <Badge className="bg-orange-500 text-white px-3 py-1 text-sm font-bold shadow-lg">
                  <Flame className="w-4 h-4 mr-1" />
                  {stats?.current_streak} Day Streak
                </Badge>
              </div>
            )}
          </div>

          {/* Plant Status */}
          <div className="p-4 text-center border-t border-green-100 dark:border-green-800/30">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              {getPlantMessage()}
            </p>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Pledges CTA - Only for non-canteen roles */}
      {stats?.role !== 'canteen_admin' && (
      <Button
        onClick={() => router.push('/pledges')}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-7 text-lg font-semibold shadow-lg rounded-2xl"
      >
        <BookOpen className="w-6 h-6 mr-2" />
        My Pledges
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
      )}

      {/* Make a Public Pledge CTA — only for eligible users who haven't pledged yet */}
      {stats?.role !== 'canteen_admin' && !stats?.is_guest && !stats?.has_public_pledge && (
        <Card
          className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setPledgeModalOpen(true)}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
              <Megaphone className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 dark:text-white text-sm">
                Make a Public Pledge
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share your eco-commitment and earn 20 points!
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-amber-500 flex-shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Public Pledge Modal */}
      <Dialog open={pledgeModalOpen} onOpenChange={setPledgeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              Make a Public Pledge
            </DialogTitle>
            <DialogDescription>
              Your pledge will be displayed publicly on the main page for everyone visiting the site to see. You can only make one public pledge, so make it count!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <Textarea
              placeholder="I pledge to..."
              value={pledgeMessage}
              onChange={(e) => setPledgeMessage(e.target.value.slice(0, 500))}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-gray-400 text-right">
              {pledgeMessage.length}/500
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPledgeModalOpen(false)}
              disabled={pledgeSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePublicPledge}
              disabled={!pledgeMessage.trim() || pledgeSubmitting}
              className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
            >
              {pledgeSubmitting ? 'Submitting...' : 'Publish Pledge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carbon Footprint CTA */}
      {stats?.role !== 'canteen_admin' && (
      <>
      {cfSummary && !cfSummary.has_result && cfSummary.can_retake !== false && (
        <Card
          className="border-0 shadow-lg bg-gradient-to-r from-teal-50 to-green-50 dark:from-teal-900/20 dark:to-green-900/20 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => router.push('/calculator')}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
              <Calculator className="w-6 h-6 text-teal-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 dark:text-white text-sm">
                Discover Your Carbon Footprint
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Take a quick 8-question quiz and find your eco-path
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-teal-500 flex-shrink-0" />
          </CardContent>
        </Card>
      )}

      {/* Carbon Footprint Summary */}
      {cfSummary?.has_result && cfSummary.result && (
        <Card
          className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => router.push(cfSummary.can_retake !== false ? '/calculator' : '/eco-paths')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-800 dark:text-white text-sm">
                  Your Footprint: {Math.round(cfSummary.result.co2_total)} kg CO₂/month
                </p>
                {cfSummary.active_eco_path && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Active Path: {getEcoPath(cfSummary.active_eco_path)?.name}
                  </p>
                )}
                {!cfSummary.active_eco_path && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Choose an eco-path to start your journey
                  </p>
                )}
              </div>
              <ArrowRight className="w-5 h-5 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <Star className="w-6 h-6 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats?.total_points || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Points</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <Flame className="w-6 h-6 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats?.current_streak || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-800 dark:text-white">
              #{stats?.rank || '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rank</p>
          </CardContent>
        </Card>
      </div>

      {/* Seed Streak Card - Weekly view with clickable redirect to Wordle */}
      {!stats?.is_guest && (
        <Card
          className="border-0 shadow-md bg-white dark:bg-gray-800 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => router.push('/wordle')}
        >
          <CardContent className="p-5">
            {/* Header row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-gray-800 dark:text-white">Streak</span>
              </div>
              <span className="text-xs text-gray-400 flex items-center gap-1">
                View Details <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Current streak number */}
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold text-gray-800 dark:text-white">
                {seedStreak.current}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                day{seedStreak.current !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Weekly day circles: M T W T F S S */}
            <div className="flex items-center justify-between mb-4">
              {(['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const).map((dayLabel, idx) => {
                // Calculate the date for this day of the week (Mon=0, Sun=6)
                const now = new Date();
                const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
                const currentDay = phNow.getDay(); // 0=Sun
                const diffToMon = currentDay === 0 ? 6 : currentDay - 1;
                const monday = new Date(phNow);
                monday.setDate(phNow.getDate() - diffToMon);
                const targetDate = new Date(monday);
                targetDate.setDate(monday.getDate() + idx);
                const dateStr = targetDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
                const isWon = weeklyWins.includes(dateStr);

                return (
                  <div key={idx} className="flex flex-col items-center gap-1.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        isWon
                          ? 'bg-green-500'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      {isWon ? (
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-500" />
                      )}
                    </div>
                    <span className={`text-xs font-medium ${
                      isWon ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {dayLabel}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom stats */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Longest Streak</p>
                <p className="font-bold text-gray-800 dark:text-white">{seedStreak.longest} day{seedStreak.longest !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 dark:text-gray-500">Total Seeds</p>
                <p className="font-bold text-gray-800 dark:text-white">{seedStreak.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guest Info Card - Only show for guests */}
      {stats?.is_guest && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <CardContent className="p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-500" />
              Guest Access
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              You can make one pledge to contribute to our campus plant. For daily pledges, 
              points, streaks, and rewards, sign in with your <strong>@umak.edu.ph</strong> email.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Leaf className="w-4 h-4" />
              <span>Thank you for supporting our eco-initiative!</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          className="flex-1 py-6 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/20"
          onClick={() => router.push('/rewards')}
        >
          <Gift className="w-5 h-5 mr-2 text-green-600" />
          Rewards
        </Button>
        <Button
          variant="outline"
          className="flex-1 py-6 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
          onClick={() => router.push('/ranks')}
        >
          <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
          Rankings
        </Button>

        <Button
          variant="outline"
          className="flex-1 py-6 border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          onClick={() => router.push('/donate')}
        >
          <Heart className="w-5 h-5 mr-2 text-red-600" />
          Donations
        </Button>
      </div>

      {/* Time Until Next Pledge */}
      {!stats?.can_pledge_today && (
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Next pledge available at midnight
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
    </div>
  );
}
