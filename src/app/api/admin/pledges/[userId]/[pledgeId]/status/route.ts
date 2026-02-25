import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission, logAdminAction } from '@/lib/adminAuth';

const supabase = supabaseAdmin;

/**
 * PUT /api/admin/pledges/[userId]/[pledgeId]/status
 * Update pledge status (e.g. submitted → reviewing).
 */
export async function PUT(
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
    const { status } = body;

    if (!status || !['reviewing'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Allowed: reviewing' },
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

    // Only submitted pledges can be moved to reviewing
    if (status === 'reviewing' && pledge.status !== 'submitted') {
      return NextResponse.json(
        { success: false, error: 'Can only review submitted pledges' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('pledge_albums')
      .update({
        status,
        updated_at: now,
      })
      .eq('id', params.pledgeId);

    if (error) throw error;

    // Audit log
    await logAdminAction(
      adminCheck.user.id,
      'update_pledge_status',
      'pledge_album',
      params.pledgeId,
      { status: pledge.status },
      { status, user_id: params.userId }
    );

    return NextResponse.json({
      success: true,
      message: `Pledge status updated to ${status}`,
    });
  } catch (error) {
    console.error('Error updating pledge status:', error);
    return NextResponse.json({ success: false, error: 'Failed to update pledge status' }, { status: 500 });
  }
}
