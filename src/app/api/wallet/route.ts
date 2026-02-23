/**
 * ============================================================================
 * WALLET API - User's Redemptions
 * ============================================================================
 * Returns the authenticated user's redemptions with reward details.
 * Uses supabaseAdmin to bypass RLS.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    // Get redemptions with reward details
    const { data: redemptions, error } = await supabaseAdmin
      .from('redemptions')
      .select(`
        id,
        redemption_code,
        points_spent,
        status,
        expires_at,
        created_at,
        verified_at,
        rewards (
          id,
          name,
          description,
          image_url,
          category
        )
      `)
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transform joined data
    const transformed = (redemptions || []).map((item: any) => ({
      ...item,
      reward: item.rewards,
    })).filter((item: any) => item.reward);

    return NextResponse.json({
      success: true,
      redemptions: transformed,
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch redemptions' },
      { status: 500 }
    );
  }
}
