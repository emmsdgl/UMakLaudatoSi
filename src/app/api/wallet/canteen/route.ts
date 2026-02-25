import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

/**
 * GET /api/wallet/canteen
 * Returns the authenticated canteen admin's wallet data:
 * balance, recent transactions, recent payouts, and totals.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions) as Session | null;

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, role, wallet_balance')
      .eq('email', session.user.email)
      .single();

    if (!userData || userData.role !== 'canteen_admin') {
      return NextResponse.json(
        { success: false, message: 'Only canteen admins can access this endpoint' },
        { status: 403 }
      );
    }

    // Fetch recent wallet transactions
    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Fetch recent payouts
    const { data: payouts } = await supabase
      .from('wallet_payouts')
      .select('*, admin:created_by(name, email)')
      .eq('canteen_admin_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    // Calculate totals
    const totalEarned = (transactions || [])
      .filter(t => t.transaction_type === 'verification_earning')
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);

    const totalPaidOut = (payouts || [])
      .filter((p: { status: string }) => p.status === 'completed')
      .reduce((sum: number, p: { amount: number }) => sum + p.amount, 0);

    return NextResponse.json({
      success: true,
      wallet_balance: userData.wallet_balance || 0,
      total_earned: totalEarned,
      total_paid_out: totalPaidOut,
      transactions: transactions || [],
      payouts: payouts || [],
    });
  } catch (error) {
    console.error('Error fetching canteen wallet:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}
