import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * GET /api/admin/pledges
 * List users who have pledge albums, with counts and search.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 403 });
    }

    if (!hasPermission(adminCheck.user.role, 'pledges')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Get all users who have at least one pledge album
    // First, get distinct user_ids from pledge_albums
    const { data: pledgeData, error: pledgeError } = await supabase
      .from('pledge_albums')
      .select('user_id, status');

    if (pledgeError) throw pledgeError;

    // Aggregate counts per user
    const userCounts: Record<string, { total: number; submitted: number; graded: number }> = {};
    for (const p of pledgeData || []) {
      if (!userCounts[p.user_id]) {
        userCounts[p.user_id] = { total: 0, submitted: 0, graded: 0 };
      }
      userCounts[p.user_id].total++;
      if (p.status === 'submitted') userCounts[p.user_id].submitted++;
      if (p.status === 'graded') userCounts[p.user_id].graded++;
    }

    const userIds = Object.keys(userCounts);
    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        users: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    // Fetch user details
    let query = supabase
      .from('users')
      .select('id, name, email, avatar_url, total_points', { count: 'exact' })
      .in('id', userIds);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Sort users who have submitted (pending) pledges first
    query = query.order('name', { ascending: true });

    const { data: users, error: usersError, count } = await query
      .range(offset, offset + limit - 1);

    if (usersError) throw usersError;

    // Combine user data with pledge counts
    const result = (users || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar_url: u.avatar_url,
      total_points: u.total_points,
      total_pledges: userCounts[u.id]?.total || 0,
      submitted_pledges: userCounts[u.id]?.submitted || 0,
      graded_pledges: userCounts[u.id]?.graded || 0,
    }));

    // Sort: users with submitted pledges first
    result.sort((a: any, b: any) => b.submitted_pledges - a.submitted_pledges);

    return NextResponse.json({
      success: true,
      users: result,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error fetching admin pledges:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pledges' }, { status: 500 });
  }
}
