import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, logAdminAction } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * POST /api/admin/wallet/payout
 * Super admin initiates a payout to a canteen admin.
 *
 * Body: { canteen_admin_id, amount, gcash_reference, proof_image_url, notes? }
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

    if (adminCheck.user.role !== 'super_admin' && adminCheck.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only super admins can initiate payouts' },
        { status: 403 }
      );
    }

    const { canteen_admin_id, amount, gcash_reference, proof_image_url, notes } =
      await request.json();

    if (!canteen_admin_id || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'canteen_admin_id and a positive amount are required' },
        { status: 400 }
      );
    }

    if (!gcash_reference) {
      return NextResponse.json(
        { success: false, message: 'GCash reference number is required' },
        { status: 400 }
      );
    }

    // Fetch canteen admin and validate
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

    const currentBalance = targetAdmin.wallet_balance || 0;

    if (amount > currentBalance) {
      return NextResponse.json(
        { success: false, message: `Payout amount (${amount}) exceeds wallet balance (${currentBalance})` },
        { status: 400 }
      );
    }

    // Deduct from wallet_balance
    await supabase
      .from('users')
      .update({ wallet_balance: currentBalance - amount })
      .eq('id', targetAdmin.id);

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('wallet_payouts')
      .insert({
        canteen_admin_id: targetAdmin.id,
        amount,
        gcash_reference: gcash_reference || null,
        proof_image_url: proof_image_url || null,
        status: 'completed',
        created_by: adminCheck.user.id,
        notes: notes || null,
      })
      .select()
      .single();

    if (payoutError) throw payoutError;

    // Create wallet transaction (negative = payout)
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: targetAdmin.id,
        amount: -amount,
        transaction_type: 'payout',
        reference_id: payout.id,
        description: `Payout: ${amount} pts (GCash: ${gcash_reference})`,
        created_by: adminCheck.user.id,
      });

    await logAdminAction(
      adminCheck.user.id,
      'wallet_payout',
      'wallet_payouts',
      payout.id,
      undefined,
      { canteen_admin: targetAdmin.name, amount, gcash_reference }
    );

    return NextResponse.json({
      success: true,
      message: `Payout of ${amount} pts to ${targetAdmin.name} completed`,
      payout: {
        id: payout.id,
        amount,
        gcash_reference,
        canteen_admin: targetAdmin.name,
        new_balance: currentBalance - amount,
      },
    });
  } catch (error) {
    console.error('Error processing payout:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process payout' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/wallet/payout
 * Returns payout history. Optional filter: ?canteen_admin_id=
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

    if (adminCheck.user.role !== 'super_admin' && adminCheck.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Only super admins can view payout history' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const canteenAdminId = searchParams.get('canteen_admin_id');

    let query = supabase
      .from('wallet_payouts')
      .select('*, canteen_admin:canteen_admin_id(name, email, avatar_url), admin:created_by(name, email)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (canteenAdminId) {
      query = query.eq('canteen_admin_id', canteenAdminId);
    }

    const { data: payouts, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      payouts: payouts || [],
    });
  } catch (error) {
    console.error('Error fetching payout history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payout history' },
      { status: 500 }
    );
  }
}
