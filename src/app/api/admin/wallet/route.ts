import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * GET /api/admin/wallet
 * Super admin: list all canteen admins with their wallet balances.
 */
export async function GET() {
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
        { success: false, message: 'Only super admins can access this endpoint' },
        { status: 403 }
      );
    }

    const { data: admins, error } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, wallet_balance')
      .eq('role', 'canteen_admin')
      .eq('is_banned', false)
      .order('wallet_balance', { ascending: false });

    if (error) throw error;

    // Calculate total outstanding balance
    const totalOutstanding = (admins || []).reduce(
      (sum, admin) => sum + (admin.wallet_balance || 0),
      0
    );

    return NextResponse.json({
      success: true,
      canteen_admins: admins || [],
      total_outstanding: totalOutstanding,
    });
  } catch (error) {
    console.error('Error fetching canteen admin wallets:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wallet data' },
      { status: 500 }
    );
  }
}
