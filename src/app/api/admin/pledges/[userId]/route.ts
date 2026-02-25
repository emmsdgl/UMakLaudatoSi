import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * GET /api/admin/pledges/[userId]
 * Fetch all pledge albums for a specific user (admin view).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
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

    // Fetch user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, total_points')
      .eq('id', params.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Fetch pledges with proofs
    const { data: pledges, error } = await supabase
      .from('pledge_albums')
      .select('*, pledge_proofs(*)')
      .eq('user_id', params.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (pledges || []).map((p: any) => ({
      ...p,
      proofs: p.pledge_proofs || [],
      pledge_proofs: undefined,
    }));

    return NextResponse.json({
      success: true,
      user,
      pledges: mapped,
    });
  } catch (error) {
    console.error('Error fetching user pledges:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch user pledges' }, { status: 500 });
  }
}
