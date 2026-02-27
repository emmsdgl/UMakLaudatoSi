/**
 * ============================================================================
 * ADMIN DASHBOARD STATS API
 * ============================================================================
 * Provides aggregated statistics for the admin dashboard.
 * Returns key metrics based on admin role permissions.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission } from '@/lib/adminAuth';

/**
 * GET /api/admin/stats
 * Retrieve dashboard statistics.
 * Returns different data based on admin role.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);
    
    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { success: false, message: adminCheck.error },
        { status: 403 }
      );
    }

    const stats: Record<string, any> = {};
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // User stats (for SA Admin and Super Admin)
    if (hasPermission(adminCheck.user.role, 'users')) {
      // Total users
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Users by role
      const { data: roleBreakdown } = await supabase
        .from('users')
        .select('role');

      const roles: Record<string, number> = {};
      roleBreakdown?.forEach(u => {
        roles[u.role] = (roles[u.role] || 0) + 1;
      });

      // New users this week
      const { count: newUsersWeek } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Active users today (made a pledge)
      const { count: activeToday } = await supabase
        .from('pledge_messages')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', today);

      stats.users = {
        total: totalUsers || 0,
        byRole: roles,
        newThisWeek: newUsersWeek || 0,
        activeToday: activeToday || 0,
      };
    }

    // Points stats (for SA Admin and Super Admin)
    if (hasPermission(adminCheck.user.role, 'points')) {
      // Total points in circulation
      const { data: pointsData } = await supabase
        .from('users')
        .select('total_points');

      const totalPoints = pointsData?.reduce((sum, u) => sum + (u.total_points || 0), 0) || 0;

      // Points earned this week
      const { data: weekPointsData } = await supabase
        .from('point_transactions')
        .select('amount')
        .gte('created_at', weekAgo)
        .gt('amount', 0);

      const weekPoints = weekPointsData?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Average streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak');

      const avgStreak = streakData?.length
        ? (streakData.reduce((sum, s) => sum + s.current_streak, 0) / streakData.length).toFixed(1)
        : 0;

      stats.points = {
        totalInCirculation: totalPoints,
        earnedThisWeek: weekPoints,
        averageStreak: avgStreak,
      };
    }

    // Rewards stats (for Canteen Admin, SA Admin, Super Admin)
    if (hasPermission(adminCheck.user.role, 'rewards')) {
      // Active rewards
      const { count: activeRewards } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Pending redemptions
      const { count: pendingRedemptions } = await supabase
        .from('reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Redemptions this week
      const { count: weekRedemptions } = await supabase
        .from('reward_redemptions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo);

      // Low stock rewards (stock <= 5)
      const { data: lowStock } = await supabase
        .from('rewards')
        .select('id, name, stock_quantity')
        .eq('is_active', true)
        .not('stock_quantity', 'is', null)
        .lte('stock_quantity', 5);

      stats.rewards = {
        activeRewards: activeRewards || 0,
        pendingRedemptions: pendingRedemptions || 0,
        redemptionsThisWeek: weekRedemptions || 0,
        lowStockItems: lowStock || [],
      };
    }

    // Donation stats (for Finance Admin, SA Admin, Super Admin)
    if (hasPermission(adminCheck.user.role, 'donations')) {
      // Active campaigns
      const { count: activeCampaigns } = await supabase
        .from('donation_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Pending GCash verifications
      const { count: pendingGcash } = await supabase
        .from('gcash_donations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Total GCash (verified only)
      const { data: gcashData } = await supabase
        .from('gcash_donations')
        .select('amount_php')
        .eq('status', 'verified');

      const totalGcash = gcashData?.reduce((sum, d) => sum + (Number(d.amount_php) || 0), 0) || 0;

      stats.donations = {
        activeCampaigns: activeCampaigns || 0,
        pendingGcashVerifications: pendingGcash || 0,
        totalGcashVerified: totalGcash,
      };
    }

    // Pledge stats (available to all admins)
    // Today's pledges
    const { count: todayPledges } = await supabase
      .from('pledge_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // This week's pledges
    const { count: weekPledges } = await supabase
      .from('pledge_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // This month's pledges
    const { count: monthPledges } = await supabase
      .from('pledge_messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo);

    stats.contributions = {
      today: todayPledges || 0,
      thisWeek: weekPledges || 0,
      thisMonth: monthPledges || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      adminRole: adminCheck.user.role,
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}
