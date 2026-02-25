'use client';

/**
 * ============================================================================
 * REWARDS MARKETPLACE - Grid View with Filters
 * ============================================================================
 * Features:
 * - Grid view of available rewards
 * - Category filters (Food, School Supplies, Digital, etc.)
 * - Redeem flow with confirmation
 * - Points balance display
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Gift,
  Search,
  Filter,
  Star,
  Coins,
  Coffee,
  ShoppingBag,
  Package,
  TicketPercent,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

interface Reward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost?: number;  // For migrations schema
  point_cost?: number;  // For schema-v2
  category: string;
  remaining_quantity: number | null;
  total_quantity: number | null;
  is_active: boolean;
}

// Helper to get the cost from a reward (supports both schema versions)
const getRewardCost = (reward: Reward): number => {
  return reward.cost ?? reward.point_cost ?? 0;
};

// Category configuration — mirrors admin reward categories
const categories = [
  { id: 'all', name: 'All', icon: ShoppingBag },
  { id: 'food', name: 'Food & Beverage', icon: Coffee },
  { id: 'merchandise', name: 'Merchandise', icon: Package },
  { id: 'voucher', name: 'Vouchers', icon: TicketPercent },
  { id: 'experience', name: 'Experiences', icon: Sparkles },
  { id: 'other', name: 'Other', icon: Gift },
];

export default function RewardsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // State
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<{ code: string; reward: Reward } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch rewards and user points
   */
  const fetchData = useCallback(async () => {
    try {
      // Fetch rewards via API route (bypasses RLS) and user points in parallel
      const rewardsPromise = fetch('/api/rewards').then(r => r.json());
      const userPromise = session?.user?.email
        ? supabase.from('users').select('total_points').eq('email', session.user.email).single()
        : Promise.resolve({ data: null });

      const [rewardsJson, userResult] = await Promise.all([rewardsPromise, userPromise]);

      setRewards(rewardsJson.rewards || []);
      setFilteredRewards(rewardsJson.rewards || []);
      setUserPoints(userResult.data?.total_points || 0);
    } catch (error) {
      console.error('Error fetching rewards:', error);
      toast({
        title: "Error",
        description: "Failed to load rewards",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.email, toast]);

  /**
   * Manual refresh handler
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    toast({
      title: "Refreshed",
      description: "Rewards list updated",
    });
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for rewards updates
    const channel = supabase
      .channel('rewards-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'rewards',
        },
        async (payload) => {
          console.log('Reward changed:', payload);
          // Small delay before refetch to let database commit
          await new Promise(resolve => setTimeout(resolve, 300));
          // Refetch data when any reward changes
          fetchData();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  /**
   * Filter rewards by category and search
   */
  useEffect(() => {
    let filtered = [...rewards];

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(r => r.category === selectedCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
      );
    }

    setFilteredRewards(filtered);
  }, [rewards, selectedCategory, searchQuery]);

  /**
   * Handle reward redemption
   */
  const handleRedeem = async () => {
    if (!selectedReward || !session?.user?.email) return;

    setRedeeming(true);

    try {
      const response = await fetch('/api/rewards/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardId: selectedReward.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to redeem reward');
      }

      setRedeemSuccess({ 
        code: data.redemption_code, 
        reward: selectedReward 
      });
      setSelectedReward(null);
      
      // Refresh data
      fetchData();

      toast({
        title: "🎉 Reward Redeemed!",
        description: "Check your wallet for the redemption code",
      });
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setRedeeming(false);
    }
  };

  /**
   * Get category icon component
   */
  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat ? <cat.icon className="w-4 h-4" /> : <Gift className="w-4 h-4" />;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">Rewards</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-4 py-2 rounded-full">
              <Coins className="w-4 h-4" />
              <span className="font-bold">{userPoints.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Redeem your eco points for exclusive rewards
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Search rewards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {categories.map((category) => {
          const Icon = category.icon;
          const isActive = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all flex-shrink-0
                ${isActive 
                  ? 'bg-green-600 text-white shadow-md' 
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{category.name}</span>
            </button>
          );
        })}
      </div>

      {/* Rewards Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-md">
              <CardContent className="p-3">
                <Skeleton className="h-32 w-full rounded-lg mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRewards.length === 0 ? (
        <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
          <CardContent className="py-12 text-center">
            <Gift className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">
              {searchQuery ? 'No results found' : 'No rewards available'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Check back later for new rewards'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredRewards.map((reward) => {
            const rewardCost = getRewardCost(reward);
            const canAfford = userPoints >= rewardCost;
            const isLowStock = (reward.remaining_quantity ?? 0) <= 5;

            return (
              <Card 
                key={reward.id}
                className={`
                  border-0 shadow-md overflow-hidden cursor-pointer transition-all hover:shadow-lg
                  ${canAfford ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}
                `}
                onClick={() => setSelectedReward(reward)}
              >
                <CardContent className="p-3">
                  {/* Image */}
                  <div className="relative aspect-square rounded-lg overflow-hidden mb-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                    {reward.image_url ? (
                      <img
                        src={reward.image_url}
                        alt={reward.name}
                        className="w-full h-full object-cover"
                        onLoad={() => {
                          console.log('✅ Image loaded:', reward.name);
                        }}
                        onError={(e) => {
                          console.error('❌ Image failed to load for', reward.name, ':', reward.image_url);
                          // Fallback to icon if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${reward.image_url ? 'fallback-icon hidden' : ''}`}>
                      {getCategoryIcon(reward.category)}
                    </div>
                    
                    {/* Low stock badge */}
                    {isLowStock && reward.remaining_quantity !== null && (
                      <Badge className="absolute top-2 right-2 bg-red-500 text-white text-xs">
                        {reward.remaining_quantity} left
                      </Badge>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm truncate mb-1">
                    {reward.name}
                  </h3>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3 h-3 text-yellow-500" />
                      <span className={`text-sm font-bold ${canAfford ? 'text-green-600' : 'text-gray-400'}`}>
                        {rewardCost}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(c => c.id === reward.category)?.name || reward.category}
                    </Badge>
                  </div>

                  {!canAfford && (
                    <p className="text-xs text-red-500 mt-2">
                      Need {rewardCost - userPoints} more pts
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reward Detail Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="max-w-sm mx-auto">
          {selectedReward && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReward.name}</DialogTitle>
                <DialogDescription>
                  {selectedReward.description || 'Redeem this reward with your eco points'}
                </DialogDescription>
              </DialogHeader>

              {/* Reward Image */}
              <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30">
                {selectedReward.image_url ? (
                  <img
                    src={selectedReward.image_url}
                    alt={selectedReward.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center ${selectedReward.image_url ? 'fallback-icon hidden' : ''}`}>
                  <Gift className="w-12 h-12 text-green-600" />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cost</span>
                  <div className="flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-500" />
                    <span className="font-bold text-lg text-gray-900 dark:text-white">{getRewardCost(selectedReward)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Your Balance</span>
                  <span className={`font-bold ${userPoints >= getRewardCost(selectedReward) ? 'text-green-600' : 'text-red-500'}`}>
                    {userPoints} pts
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Available</span>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedReward.remaining_quantity ?? 'Unlimited'} left</span>
                </div>
              </div>

              {/* Action */}
              <DialogFooter>
                {userPoints >= getRewardCost(selectedReward) ? (
                  <Button
                    onClick={handleRedeem}
                    disabled={redeeming}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {redeeming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Confirm Redemption
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="w-full text-center">
                    <p className="text-sm text-red-500 flex items-center justify-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4" />
                      You need {getRewardCost(selectedReward) - userPoints} more points
                    </p>
                    <Button variant="secondary" className="w-full" disabled>
                      Not Enough Points
                    </Button>
                  </div>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={!!redeemSuccess} onOpenChange={() => setRedeemSuccess(null)}>
        <DialogContent className="max-w-sm mx-auto text-center">
          <div className="py-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-xl mb-2">Reward Redeemed!</DialogTitle>
            <DialogDescription>
              {redeemSuccess?.reward.name} has been added to your wallet
            </DialogDescription>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Your redemption code:</p>
            <code className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
              {redeemSuccess?.code}
            </code>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              onClick={() => {
                setRedeemSuccess(null);
                router.push('/wallet');
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              View in Wallet
            </Button>
            <Button
              variant="outline"
              onClick={() => setRedeemSuccess(null)}
              className="w-full"
            >
              Continue Shopping
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
