import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission, logAdminAction } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * POST /api/admin/pledges/[userId]/[pledgeId]/grade
 * Award points (1-50) to a submitted pledge album.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string; pledgeId: string } }
) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json({ success: false, error: adminCheck.error }, { status: 403 });
    }

    if (!hasPermission(adminCheck.user.role, 'pledges')) {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { points } = body;

    // Validate points
    if (!points || !Number.isInteger(points) || points < 1 || points > 50) {
      return NextResponse.json(
        { success: false, error: 'Points must be an integer between 1 and 50' },
        { status: 400 }
      );
    }

    // Fetch pledge and verify it belongs to the specified user
    const { data: pledge } = await supabase
      .from('pledge_albums')
      .select('*')
      .eq('id', params.pledgeId)
      .eq('user_id', params.userId)
      .single();

    if (!pledge) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    if (pledge.status !== 'submitted' && pledge.status !== 'reviewing') {
      return NextResponse.json(
        { success: false, error: 'Can only grade submitted or reviewing pledges' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 1. Update pledge album status to graded
    const { error: pledgeError } = await supabase
      .from('pledge_albums')
      .update({
        status: 'graded',
        points_awarded: points,
        graded_by: adminCheck.user.id,
        graded_at: now,
        updated_at: now,
      })
      .eq('id', params.pledgeId);

    if (pledgeError) throw pledgeError;

    // 2. Get current user points
    const { data: userData } = await supabase
      .from('users')
      .select('total_points')
      .eq('id', params.userId)
      .single();

    // 3. Update user total_points
    const { error: userError } = await supabase
      .from('users')
      .update({
        total_points: (userData?.total_points || 0) + points,
      })
      .eq('id', params.userId);

    if (userError) throw userError;

    // 4. Create point transaction
    const { error: txError } = await supabase
      .from('point_transactions')
      .insert({
        user_id: params.userId,
        amount: points,
        transaction_type: 'pledge_album_reward',
        reference_id: params.pledgeId,
        description: `Pledge Album: ${pledge.title} (+${points} pts)`,
        admin_id: adminCheck.user.id,
      });

    if (txError) throw txError;

    // 5. Audit log
    await logAdminAction(
      adminCheck.user.id,
      'grade_pledge_album',
      'pledge_album',
      params.pledgeId,
      { status: 'submitted', points_awarded: 0 },
      { status: 'graded', points_awarded: points, user_id: params.userId }
    );

    return NextResponse.json({
      success: true,
      message: `${points} points awarded successfully`,
    });
  } catch (error) {
    console.error('Error grading pledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to grade pledge' }, { status: 500 });
  }
}
