/**
 * ============================================================================
 * LEADERBOARD API
 * ============================================================================
 * Provides ranked user data for points and contribution leaderboards.
 * Supports time-based filtering and category segmentation.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;

// Roles excluded from leaderboard rankings
const EXCLUDED_ROLES = ['canteen_admin'];

/**
 * GET /api/leaderboard
 * Retrieve leaderboard rankings.
 * 
 * Query Parameters:
 * - type: 'points' | 'contributions' | 'streak' (default: 'points')
 * - period: 'all' | 'monthly' | 'weekly' (default: 'all')
 * - limit: number of entries to return (default: 50, max: 100)
 * - offset: pagination offset (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters with defaults
    const type = searchParams.get('type') || 'points';
    const period = searchParams.get('period') || 'all';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let data;
    let error;

    // Determine date filter based on period
    let dateFilter = null;
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateFilter = weekAgo.toISOString();
    } else if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      dateFilter = monthAgo.toISOString();
    }

    if (type === 'points') {
      // Points leaderboard - either all-time or period-based
      if (dateFilter) {
        // Calculate points for the specified period from transactions
        const { data: periodData, error: periodError } = await supabase
          .from('point_transactions')
          .select(`
            user_id,
            users!inner(
              id,
              name,
              email,
              avatar_url,
              role
            )
          `)
          .gte('created_at', dateFilter)
          .eq('transaction_type', 'pledge')
          .order('created_at', { ascending: false });

        if (periodError) throw periodError;

        // Aggregate points by user
        const userPoints = new Map<string, {
          user_id: string;
          name: string;
          avatar_url: string | null;
          role: string;
          total: number;
        }>();

        periodData?.forEach((tx: any) => {
          const userId = tx.user_id;
          // Skip excluded roles
          if (EXCLUDED_ROLES.includes(tx.users.role)) return;
          const existing = userPoints.get(userId);
          // Note: We need to fetch amounts separately, this is simplified
          if (!existing) {
            userPoints.set(userId, {
              user_id: userId,
              name: tx.users.name || 'Anonymous',
              avatar_url: tx.users.avatar_url,
              role: tx.users.role,
              total: 1, // Counting transactions as proxy
            });
          } else {
            existing.total += 1;
          }
        });

        data = Array.from(userPoints.values())
          .sort((a, b) => b.total - a.total)
          .slice(offset, offset + limit)
          .map((entry, index) => ({
            rank: offset + index + 1,
            ...entry,
          }));

      } else {
        // All-time points leaderboard - use total_points from users table
        let allTimeQuery = supabase
          .from('users')
          .select('id, name, avatar_url, total_points, role')
          .eq('is_banned', false);

        for (const role of EXCLUDED_ROLES) {
          allTimeQuery = allTimeQuery.neq('role', role);
        }

        const { data: allTimeData, error: allTimeError } = await allTimeQuery
          .order('total_points', { ascending: false })
          .range(offset, offset + limit - 1);

        if (allTimeError) throw allTimeError;

        data = allTimeData?.map((user, index) => ({
          rank: offset + index + 1,
          user_id: user.id,
          name: user.name || 'Anonymous',
          avatar_url: user.avatar_url,
          role: user.role,
          total: user.total_points || 0,
        }));
      }

    } else if (type === 'contributions') {
      // Contributions leaderboard - count total pledges
      let query = supabase
        .from('contributions')
        .select(`
          user_id,
          users!inner(
            id,
            name,
            avatar_url,
            role,
            is_banned
          )
        `)
        .eq('users.is_banned', false);

      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: contribData, error: contribError } = await query;

      if (contribError) throw contribError;

      // Aggregate by user
      const userContribs = new Map<string, {
        user_id: string;
        name: string;
        avatar_url: string | null;
        role: string;
        total: number;
      }>();

      contribData?.forEach((contrib: any) => {
        const userId = contrib.user_id;
        // Skip excluded roles
        if (EXCLUDED_ROLES.includes(contrib.users.role)) return;
        const existing = userContribs.get(userId);
        if (!existing) {
          userContribs.set(userId, {
            user_id: userId,
            name: contrib.users.name || 'Anonymous',
            avatar_url: contrib.users.avatar_url,
            role: contrib.users.role,
            total: 1,
          });
        } else {
          existing.total += 1;
        }
      });

      data = Array.from(userContribs.values())
        .sort((a, b) => b.total - a.total)
        .slice(offset, offset + limit)
        .map((entry, index) => ({
          rank: offset + index + 1,
          ...entry,
        }));

    } else if (type === 'streak') {
      // Streak leaderboard - highest current streaks
      const { data: streakData, error: streakError } = await supabase
        .from('streaks')
        .select(`
          current_streak,
          longest_streak,
          users!inner(
            id,
            name,
            avatar_url,
            role,
            is_banned
          )
        `)
        .eq('users.is_banned', false)
        .order('current_streak', { ascending: false })
        .range(offset, offset + limit - 1);

      if (streakError) throw streakError;

      data = streakData
        ?.filter((streak: any) => !EXCLUDED_ROLES.includes(streak.users.role))
        .map((streak: any, index) => ({
          rank: offset + index + 1,
          user_id: streak.users.id,
          name: streak.users.name || 'Anonymous',
          avatar_url: streak.users.avatar_url,
          role: streak.users.role,
          total: streak.current_streak,
          longest: streak.longest_streak,
        }));

    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid leaderboard type' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      type,
      period,
      data: data || [],
      pagination: {
        offset,
        limit,
        hasMore: (data?.length || 0) === limit,
      },
    });

  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
