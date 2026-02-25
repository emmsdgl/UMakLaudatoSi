import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEcoPath } from '@/lib/constants/eco-paths';
import type { EcoPathId } from '@/types';

const supabase = supabaseAdmin;

/**
 * GET /api/eco-paths/progress
 * Returns eco-path pledge progress for the current user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Fetch all eco-path pledges for this user
    const { data: ecoPathPledges, error } = await supabase
      .from('pledge_albums')
      .select('eco_path_id, status')
      .eq('user_id', userData.id)
      .eq('is_eco_path_pledge', true);

    if (error) throw error;

    if (!ecoPathPledges || ecoPathPledges.length === 0) {
      return NextResponse.json({
        success: true,
        progress: null,
        can_switch_path: true,
      });
    }

    // Group by eco_path_id — in practice there should be one active set at a time
    // Use the most common eco_path_id (the active set)
    const counts: Record<string, { total: number; graded: number }> = {};
    for (const pledge of ecoPathPledges) {
      const pid = pledge.eco_path_id as string;
      if (!counts[pid]) counts[pid] = { total: 0, graded: 0 };
      counts[pid].total++;
      if (pledge.status === 'graded') counts[pid].graded++;
    }

    // Find the set with un-graded pledges (active set), or fall back to most recent
    let activePathId: string | null = null;
    for (const pid of Object.keys(counts)) {
      if (counts[pid].total > counts[pid].graded) {
        activePathId = pid;
        break;
      }
    }
    // If all sets are fully graded, pick the one with most pledges (latest set)
    if (!activePathId) {
      activePathId = Object.keys(counts).reduce((a, b) =>
        counts[a].total >= counts[b].total ? a : b
      );
    }

    const stats = counts[activePathId];
    const ecoPath = getEcoPath(activePathId as EcoPathId);
    const pending = stats.total - stats.graded;

    // can_switch_path: true only if ALL eco-path pledges across ALL paths are graded
    const totalUngraded = ecoPathPledges.filter(p => p.status !== 'graded').length;

    return NextResponse.json({
      success: true,
      progress: {
        eco_path_id: activePathId,
        eco_path_name: ecoPath?.name || activePathId,
        total: stats.total,
        graded: stats.graded,
        pending,
        all_graded: pending === 0,
      },
      can_switch_path: totalUngraded === 0,
    });
  } catch (error) {
    console.error('Error fetching eco-path progress:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch progress' }, { status: 500 });
  }
}
