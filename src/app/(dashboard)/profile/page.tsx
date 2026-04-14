'use client';

/**
 * ============================================================================
 * PROFILE PAGE - User Profile & Settings
 * ============================================================================
 * Features:
 * - User profile display with avatar
 * - Promo code redemption input
 * - Badge/achievement showcase
 * - Settings (notifications, theme)
 * - Sign out option
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { 
  User,
  Settings,
  Gift,
  Trophy,
  Flame,
  Star,
  Medal,
  Award,
  Crown,
  Shield,
  LogOut,
  ChevronRight,
  LayoutDashboard,
  Bell,
  Moon,
  Sun,
  Ticket,
  CheckCircle2,
  Loader2,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
}

interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

// Badge icon mapping
const badgeIcons: Record<string, React.ReactNode> = {
  flame: <Flame className="w-6 h-6" />,
  trophy: <Trophy className="w-6 h-6" />,
  star: <Star className="w-6 h-6" />,
  medal: <Medal className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  crown: <Crown className="w-6 h-6" />,
  shield: <Shield className="w-6 h-6" />,
  gift: <Gift className="w-6 h-6" />,
};

// Static badge definitions (can be from database later)
const availableBadges = [
  { id: 'streak-7', name: '7-Day Streak', description: 'Made pledges for 7 consecutive days', icon: 'flame', requirement: 'streak_7' },
  { id: 'streak-30', name: '30-Day Streak', description: 'Made pledges for 30 consecutive days', icon: 'trophy', requirement: 'streak_30' },
  { id: 'first-pledge', name: 'First Step', description: 'Made your first eco pledge', icon: 'star', requirement: 'first_pledge' },
  { id: 'top-10', name: 'Top 10', description: 'Reached top 10 on the leaderboard', icon: 'medal', requirement: 'top_10' },
  { id: 'points-100', name: 'Centurion', description: 'Earned 100 points', icon: 'award', requirement: 'points_100' },
  { id: 'points-500', name: 'Half Thousand', description: 'Earned 500 points', icon: 'crown', requirement: 'points_500' },
];

export default function ProfilePage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  // Check if user has an admin role
  const userRole = (session?.user as any)?.role;
  const isAdmin = ['admin', 'canteen_admin', 'finance_admin', 'sa_admin', 'super_admin'].includes(userRole);

  // State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoCode, setPromoCode] = useState('');
  const [redeemingPromo, setRedeemingPromo] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [rank, setRank] = useState<number | null>(null);
  const [promoResult, setPromoResult] = useState<{ type: 'success' | 'already_redeemed' | 'error'; message: string; points?: number } | null>(null);

  /**
   * Fetch user profile and badges
   */
  const fetchProfile = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      // Get user profile
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', session.user.email)
        .single();

      if (error) throw error;

      setProfile(userData);

      // Calculate earned badges based on achievements
      const badges: string[] = [];
      
      if (userData.current_streak >= 7 || userData.longest_streak >= 7) {
        badges.push('streak-7');
      }
      if (userData.current_streak >= 30 || userData.longest_streak >= 30) {
        badges.push('streak-30');
      }
      if (userData.total_points > 0) {
        badges.push('first-pledge');
      }
      if (userData.total_points >= 100) {
        badges.push('points-100');
      }
      if (userData.total_points >= 500) {
        badges.push('points-500');
      }

      // Get user's rank
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('total_points', userData.total_points);

      setRank((count || 0) + 1);

      if (rank !== null && rank <= 10) {
        badges.push('top-10');
      }

      setEarnedBadges(badges);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, rank]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  /**
   * Redeem promo code
   */
  const handleRedeemPromo = async () => {
    if (!promoCode.trim() || !session?.user?.email) return;

    setRedeemingPromo(true);

    try {
      const response = await fetch('/api/promo-codes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || 'Failed to redeem promo code';
        const isAlreadyRedeemed = errorMsg.toLowerCase().includes('already');
        setPromoResult({
          type: isAlreadyRedeemed ? 'already_redeemed' : 'error',
          message: isAlreadyRedeemed ? 'You have already redeemed this code' : errorMsg,
        });
        return;
      }

      setPromoResult({
        type: 'success',
        message: `You received ${data.pointsGranted} bonus points!`,
        points: data.pointsGranted,
      });

      setPromoCode('');
      fetchProfile(); // Refresh profile to show updated points
    } catch (error) {
      setPromoResult({
        type: 'error',
        message: error instanceof Error ? error.message : "The promo code is invalid or expired",
      });
    } finally {
      setRedeemingPromo(false);
    }
  };

  /**
   * Handle sign out
   */
  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

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
   * Format join date
   */
  const formatJoinDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-24 h-24 sm:w-28 sm:h-28 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Profile Header */}
      <div className="text-center space-y-4">
        {/* Avatar */}
        <div className="relative inline-block">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={profile?.name || 'User'}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-green-500 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
              {profile?.name ? getInitials(profile.name) : <User className="w-10 h-10" />}
            </div>
          )}
          {/* Level badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow">
            {Math.floor((profile?.total_points || 0) / 100) + 1}
          </div>
        </div>

        {/* Name & Email */}
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {profile?.name || session?.user?.name || 'Eco Warrior'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {profile?.email || session?.user?.email}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Member since {profile?.created_at ? formatJoinDate(profile.created_at) : 'recently'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex justify-center gap-6 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {profile?.total_points || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Points</p>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-500">
              {profile?.current_streak || 0}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Streak</p>
          </div>
          <Separator orientation="vertical" className="h-12" />
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">
              #{rank || '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Rank</p>
          </div>
        </div>
      </div>

      {/* Promo Code Section */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-purple-500 to-indigo-600">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Ticket className="w-5 h-5 text-white" />
            <span className="font-semibold text-white">Got a Promo Code?</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code (e.g. UMAK2024)"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="bg-white/20 border-white/30 text-white placeholder:text-white/70 uppercase"
              maxLength={20}
            />
            <Button
              onClick={handleRedeemPromo}
              disabled={!promoCode.trim() || redeemingPromo}
              className="bg-white text-purple-600 hover:bg-white/90 flex-shrink-0"
            >
              {redeemingPromo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Redeem'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Badge Case */}
      <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Badge Case
            </CardTitle>
            <Badge variant="secondary">
              {earnedBadges.length}/{availableBadges.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {availableBadges.map((badge) => {
              const isEarned = earnedBadges.includes(badge.id);
              return (
                <Dialog key={badge.id}>
                  <DialogTrigger asChild>
                    <button
                      className={`
                        p-4 rounded-xl flex flex-col items-center gap-2 transition-all
                        ${isEarned 
                          ? 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 text-yellow-600 dark:text-yellow-400' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600'}
                      `}
                    >
                      <div className={`${isEarned ? '' : 'opacity-30'}`}>
                        {badgeIcons[badge.icon] || <Star className="w-6 h-6" />}
                      </div>
                      <span className={`text-xs font-medium text-center leading-tight ${isEarned ? '' : 'opacity-50'}`}>
                        {badge.name}
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-xs">
                    <DialogHeader>
                      <div className={`
                        w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2
                        ${isEarned 
                          ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}
                      `}>
                        {badgeIcons[badge.icon] || <Star className="w-8 h-8" />}
                      </div>
                      <DialogTitle className="text-center">{badge.name}</DialogTitle>
                      <DialogDescription className="text-center">
                        {badge.description}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="text-center">
                      {isEarned ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Earned
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Not yet earned
                        </Badge>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-gray-500" />
              ) : (
                <Sun className="w-5 h-5 text-yellow-500" />
              )}
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Dark Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Switch app theme</p>
              </div>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <Separator />

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-500" />
              <div>
                <p className="font-medium text-gray-800 dark:text-white">Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Daily reminders</p>
              </div>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
            />
          </div>

          <Separator />

          {/* About */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Info className="w-5 h-5 text-gray-500" />
                  <div className="text-left">
                    <p className="font-medium text-gray-800 dark:text-white">About Laudato Si</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Learn about our mission</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>About Laudato Si</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Laudato Si&apos;</strong> (Praise Be to You) is Pope Francis&apos;s 2015 encyclical 
                  on caring for our common home, Earth.
                </p>
                <p>
                  This app encourages daily eco-pledges aligned with the encyclical&apos;s message. 
                  Take small steps each day to care for creation and earn rewards for your commitment!
                </p>
                <p className="text-xs text-gray-400">
                  Developed for University of Makati • Version 1.0
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Admin Dashboard Access */}
      {isAdmin && (
        <Button
          onClick={() => router.push('/admin')}
          className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md"
        >
          <LayoutDashboard className="w-4 h-4 mr-2" />
          Open Admin Dashboard
          <Badge variant="secondary" className="ml-2 bg-white/20 text-white text-[10px] px-1.5">
            {userRole === 'admin' || userRole === 'super_admin'
              ? 'Super Admin'
              : userRole === 'canteen_admin'
              ? 'Canteen Admin'
              : userRole === 'finance_admin'
              ? 'Finance Admin'
              : userRole === 'sa_admin'
              ? 'SA Admin'
              : userRole}
          </Badge>
        </Button>
      )}

      {/* Sign Out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-900/20">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You can sign back in anytime with your UMak Google account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-red-600 hover:bg-red-700">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Promo Code Result Pop-up */}
      <Dialog open={!!promoResult} onOpenChange={(open) => !open && setPromoResult(null)}>
        <DialogContent className="max-w-xs text-center">
          <DialogHeader>
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2 ${
              promoResult?.type === 'success'
                ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                : promoResult?.type === 'already_redeemed'
                ? 'bg-gradient-to-br from-orange-400 to-amber-500'
                : 'bg-gradient-to-br from-red-400 to-red-500'
            }`}>
              {promoResult?.type === 'success' ? (
                <Gift className="w-8 h-8 text-white" />
              ) : promoResult?.type === 'already_redeemed' ? (
                <CheckCircle2 className="w-8 h-8 text-white" />
              ) : (
                <Ticket className="w-8 h-8 text-white" />
              )}
            </div>
            <DialogTitle className="text-center">
              {promoResult?.type === 'success'
                ? 'Promo Code Redeemed!'
                : promoResult?.type === 'already_redeemed'
                ? 'Code Already Redeemed'
                : 'Redemption Failed'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {promoResult?.message}
            </DialogDescription>
          </DialogHeader>
          {promoResult?.type === 'success' && promoResult.points && (
            <div className="py-2">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                +{promoResult.points} pts
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Added to your balance</p>
            </div>
          )}
          <Button
            onClick={() => setPromoResult(null)}
            className={
              promoResult?.type === 'success'
                ? 'bg-green-600 hover:bg-green-700 w-full'
                : promoResult?.type === 'already_redeemed'
                ? 'bg-orange-500 hover:bg-orange-600 w-full'
                : 'bg-red-600 hover:bg-red-700 w-full'
            }
          >
            {promoResult?.type === 'success' ? 'Awesome!' : promoResult?.type === 'already_redeemed' ? 'Got it' : 'Try Again'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
