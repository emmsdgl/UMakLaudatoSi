'use client';

/**
 * ============================================================================
 * ADMIN DASHBOARD PAGE
 * ============================================================================
 * Main admin dashboard with statistics overview and quick actions.
 * Displays data based on admin role permissions.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { 
  Users, 
  Gift, 
  TrendingUp, 
  Heart, 
  Zap, 
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  users?: {
    total: number;
    byRole: Record<string, number>;
    newThisWeek: number;
    activeToday: number;
  };
  points?: {
    totalInCirculation: number;
    earnedThisWeek: number;
    averageStreak: string | number;
  };
  rewards?: {
    activeRewards: number;
    pendingRedemptions: number;
    redemptionsThisWeek: number;
    lowStockItems: Array<{ id: string; name: string; stock_quantity: number }>;
  };
  donations?: {
    activeCampaigns: number;
    pendingGcashVerifications: number;
    totalGcashVerified: number;
  };
  contributions: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (data.success) {
          setStats(data.stats);
        } else {
          setError(data.message);
        }
      } catch (err) {
        setError('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Error Loading Dashboard
          </h2>
          <p className="text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Overview of the Laudato Si&apos; Eco-Pledge platform
        </p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Pledges */}
        <StatCard
          title="Today's Pledges"
          value={stats?.contributions?.today || 0}
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          description="Eco-pledges submitted today"
          trend={(stats?.contributions?.today ?? 0) > 0 ? 'up' : undefined}
        />

        {/* Weekly Activity */}
        <StatCard
          title="This Week"
          value={stats?.contributions?.thisWeek || 0}
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          description="Pledges in the last 7 days"
        />

        {/* Points in Circulation (if has permission) */}
        {stats?.points && (
          <StatCard
            title="Total Points"
            value={stats.points.totalInCirculation.toLocaleString()}
            icon={<Zap className="w-5 h-5 text-yellow-600" />}
            description="Points in circulation"
          />
        )}

        {/* Pending Redemptions (if has permission) */}
        {stats?.rewards && (
          <StatCard
            title="Pending Claims"
            value={stats.rewards.pendingRedemptions}
            icon={<Gift className="w-5 h-5 text-purple-600" />}
            description="Rewards awaiting verification"
            highlight={stats.rewards.pendingRedemptions > 0}
          />
        )}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Statistics */}
        {stats?.users && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Users</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.users.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">New This Week</span>
                  <span className="font-semibold text-green-600">
                    +{stats.users.newThisWeek}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Today</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.users.activeToday}</span>
                </div>
                <hr className="dark:border-gray-700" />
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">By Role</p>
                  {Object.entries(stats.users.byRole).map(([role, count]) => (
                    <div key={role} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                      <span className="capitalize">{role.replace('_', ' ')}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Points & Streaks */}
        {stats?.points && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Points & Streaks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Earned This Week</span>
                  <span className="font-semibold text-green-600">
                    +{stats.points.earnedThisWeek.toLocaleString()} pts
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Average Streak</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {stats.points.averageStreak} days
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Donations Overview */}
        {stats?.donations && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Campaigns</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{stats.donations.activeCampaigns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">GCash Verified</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ₱{stats.donations.totalGcashVerified.toLocaleString()}
                  </span>
                </div>
                {stats.donations.pendingGcashVerifications > 0 && (
                  <div className="flex justify-between text-orange-600">
                    <span>Pending GCash</span>
                    <span className="font-semibold">
                      {stats.donations.pendingGcashVerifications} awaiting
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Alerts Section */}
      {stats?.rewards?.lowStockItems && stats.rewards.lowStockItems.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Low Stock Alerts
            </CardTitle>
            <CardDescription>
              These rewards are running low on inventory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.rewards.lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded"
                >
                  <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                  <span className="text-orange-600 font-semibold">
                    {item.stock_quantity} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Stat Card Component for dashboard metrics
 */
interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down';
  highlight?: boolean;
}

function StatCard({ title, value, icon, description, trend, highlight }: StatCardProps) {
  return (
    <Card className={highlight ? 'border-orange-300 dark:border-orange-700' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${
            highlight 
              ? 'bg-orange-100 dark:bg-orange-900/30' 
              : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for dashboard
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16 mt-2" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
