import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, logAdminAction } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * POST /api/admin/redemptions/allocate-points
 * Super admin allocates verification points to a canteen admin.
 *
 * Body: { redemption_id: string, canteen_admin_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { success: false, message: adminCheck.error },
        { status: 403 }
      );
    }

    // Only super_admin / admin can allocate to another user
    if (adminCheck.user.role !== 'super_admin' && adminCheck.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only super admins can allocate verification points' },
        { status: 403 }
      );
    }

    const { redemption_id, canteen_admin_id } = await request.json();

    if (!redemption_id || !canteen_admin_id) {
      return NextResponse.json(
        { success: false, message: 'redemption_id and canteen_admin_id are required' },
        { status: 400 }
      );
    }

    // Verify the redemption exists and is verified, fetch cost info
    const { data: redemption } = await supabase
      .from('redemptions')
      .select('id, status, points_spent, rewards(cost)')
      .eq('id', redemption_id)
      .single();

    if (!redemption) {
      return NextResponse.json(
        { success: false, message: 'Redemption not found' },
        { status: 404 }
      );
    }

    if (redemption.status !== 'verified') {
      return NextResponse.json(
        { success: false, message: 'Redemption is not in verified status' },
        { status: 400 }
      );
    }

    // Determine the reward cost (points to award)
    const rewardPoints = redemption.points_spent || (redemption.rewards as any)?.cost || 0;

    if (rewardPoints <= 0) {
      return NextResponse.json(
        { success: false, message: 'Could not determine reward cost for this redemption' },
        { status: 400 }
      );
    }

    // Check that points haven't already been allocated for this redemption
    const { count: existingAlloc } = await supabase
      .from('wallet_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('reference_id', redemption_id)
      .eq('transaction_type', 'verification_earning');

    if (existingAlloc && existingAlloc > 0) {
      return NextResponse.json(
        { success: false, message: 'Verification points already allocated for this redemption' },
        { status: 400 }
      );
    }

    // Verify the target is actually a canteen_admin
    const { data: targetAdmin } = await supabase
      .from('users')
      .select('id, name, email, role, wallet_balance')
      .eq('id', canteen_admin_id)
      .single();

    if (!targetAdmin || targetAdmin.role !== 'canteen_admin') {
      return NextResponse.json(
        { success: false, message: 'Target user is not a canteen admin' },
        { status: 400 }
      );
    }

    // Credit wallet_balance instead of total_points
    await supabase
      .from('users')
      .update({ wallet_balance: (targetAdmin.wallet_balance || 0) + rewardPoints })
      .eq('id', targetAdmin.id);

    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: targetAdmin.id,
        amount: rewardPoints,
        transaction_type: 'verification_earning',
        reference_id: redemption_id,
        description: `Allocated: ${rewardPoints} pts for reward verification`,
        created_by: adminCheck.user.id,
      });

    await logAdminAction(
      adminCheck.user.id,
      'verification_points_allocated',
      'users',
      targetAdmin.id,
      undefined,
      { points: rewardPoints, redemption_id }
    );

    return NextResponse.json({
      success: true,
      message: `+${rewardPoints} pts awarded to ${targetAdmin.name}`,
      points_awarded_to: targetAdmin.name,
    });
  } catch (error) {
    console.error('Error allocating verification points:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to allocate verification points' },
      { status: 500 }
    );
  }
}
