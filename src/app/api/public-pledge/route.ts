import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

const PUBLIC_PLEDGE_POINTS = 20;

/**
 * POST /api/public-pledge
 * Submit a one-time public pledge message displayed on the main page.
 * Awards 20 points to the user.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { message } = await request.json();

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Pledge message is required' },
        { status: 400 }
      );
    }

    if (message.trim().length > 500) {
      return NextResponse.json(
        { success: false, message: 'Pledge message must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, total_points, is_banned')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (userData.is_banned) {
      return NextResponse.json(
        { success: false, message: 'Account is suspended' },
        { status: 403 }
      );
    }

    // Check if user already has a public pledge
    const { count } = await supabase
      .from('pledge_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id);

    if ((count || 0) > 0) {
      return NextResponse.json(
        { success: false, message: 'You have already made a public pledge' },
        { status: 409 }
      );
    }

    // Insert the pledge message
    const { error: pledgeError } = await supabase
      .from('pledge_messages')
      .insert({
        user_id: userData.id,
        message: message.trim(),
        points_earned: PUBLIC_PLEDGE_POINTS,
        is_displayed: true,
      });

    if (pledgeError) throw pledgeError;

    // Credit points to user
    const { error: pointsError } = await supabase
      .from('users')
      .update({
        total_points: (userData.total_points || 0) + PUBLIC_PLEDGE_POINTS,
      })
      .eq('id', userData.id);

    if (pointsError) throw pointsError;

    // Record the point transaction
    await supabase
      .from('point_transactions')
      .insert({
        user_id: userData.id,
        amount: PUBLIC_PLEDGE_POINTS,
        transaction_type: 'pledge_reward',
        description: `Public pledge (+${PUBLIC_PLEDGE_POINTS} pts)`,
      });

    return NextResponse.json({
      success: true,
      message: 'Public pledge submitted successfully!',
      points_earned: PUBLIC_PLEDGE_POINTS,
    });
  } catch (error) {
    console.error('Public pledge error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit pledge' },
      { status: 500 }
    );
  }
}
