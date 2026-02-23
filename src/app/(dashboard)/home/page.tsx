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
  Heart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import WelcomeModal from '@/components/pledge/WelcomeModal';

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
}

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // State
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

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
        .select('id, total_points, last_contribution, has_completed_onboarding, created_at, role')
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
        });
        
        // Only show welcome modal if user hasn't seen it before (tracked in localStorage)
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        }
        
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

      // Get user rank
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', userData.total_points || 0);

      const rank = (count || 0) + 1;

      // Check if guest has already used their 1-time pledge
      let guestHasPledged = false;
      if (effectiveIsGuest) {
        const { count: contributionCount } = await supabase
          .from('contributions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userData.id);
        
        guestHasPledged = (contributionCount || 0) > 0;
      }

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
      });

      // Show welcome modal for new users who haven't completed onboarding
      // Only if they haven't seen it before (tracked in localStorage)
      if (!userData.has_completed_onboarding) {
        const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
        if (!hasSeenWelcome) {
          setShowWelcome(true);
        }
      }

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status, fetchStats]);

  /**
   * Handle take pledge button
   */
  const handleTakePledge = () => {
    if (stats?.is_new_user || !stats?.has_completed_onboarding) {
      // New user - go to full pledge flow
      router.push('/pledge?new=true');
    } else {
      // Returning user - go to quick pledge (message only)
      router.push('/pledge?quick=true');
    }
  };

  /**
   * Handle welcome modal close
   */
  const handleWelcomeClose = () => {
    // Mark as seen in localStorage so it doesn't show again
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
  };

  /**
   * Handle welcome modal start pledge
   */
  const handleWelcomeStartPledge = () => {
    // Mark as seen in localStorage
    localStorage.setItem('hasSeenWelcome', 'true');
    setShowWelcome(false);
    router.push('/pledge?new=true');
  };

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
      {/* Welcome Modal for New Users */}
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleWelcomeClose}
        onStartPledge={handleWelcomeStartPledge}
        userName={session?.user?.name || undefined}
      />

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

      {/* Plant Visualization Card */}
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

      {/* Take Pledge CTA */}
      {stats?.can_pledge_today ? (
        <Button
          onClick={handleTakePledge}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-7 text-lg font-semibold shadow-lg rounded-2xl"
        >
          <Sparkles className="w-6 h-6 mr-2" />
          {stats?.is_guest ? "Take Your One-Time Pledge" : "Take Today's Pledge"}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      ) : stats?.is_guest && stats?.guest_has_pledged ? (
        // Guest has used their 1-time pledge
        <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800 dark:text-amber-300">
                  Thank You For Your Pledge! 🌱
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Want daily pledges? Sign in with a @umak.edu.ph email
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md bg-green-50 dark:bg-green-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-800/30 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-800 dark:text-green-300">
                  Today&apos;s Pledge Complete! ✨
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Come back tomorrow to continue your streak
                </p>
              </div>
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

      {/* Points System Info - Only show for UMak users who can earn points */}
      {!stats?.is_guest && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <CardContent className="p-4">
            <h4 className="font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Daily Points System
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[1, 2, 3, 4, 5].map((day) => {
                const isActive = (stats?.current_streak || 0) >= day;
                return (
                  <div
                    key={day}
                    className={`p-2 rounded-lg ${
                      isActive 
                        ? 'bg-green-500 text-white' 
                        : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <p className="text-xs">Day {day}</p>
                    <p className="font-bold">{day}pt</p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
              Earn more points as your streak grows! Max 5 pts/day at Day 5+
            </p>
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
    </div>
  );
}
