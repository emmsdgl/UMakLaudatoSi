import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VALID_ECO_PATH_IDS } from '@/lib/constants/eco-paths';

const supabase = supabaseAdmin;

/**
 * POST /api/eco-paths/select
 * User chooses an eco-path to focus on.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { eco_path_id } = body;

    if (!eco_path_id || !VALID_ECO_PATH_IDS.includes(eco_path_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid eco-path. Must be one of: ' + VALID_ECO_PATH_IDS.join(', ') },
        { status: 400 }
      );
    }

    // Check for un-graded eco-path pledges (lock path switching)
    const { count: ungradedCount } = await supabase
      .from('pledge_albums')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id)
      .eq('is_eco_path_pledge', true)
      .neq('status', 'graded');

    if (ungradedCount && ungradedCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Complete your current eco-path pledges before switching paths.' },
        { status: 400 }
      );
    }

    // Deactivate any existing active path
    await supabase
      .from('user_eco_paths')
      .update({ is_active: false })
      .eq('user_id', userData.id)
      .eq('is_active', true);

    // Insert new active path
    const { data: ecoPath, error } = await supabase
      .from('user_eco_paths')
      .insert({
        user_id: userData.id,
        eco_path_id,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      eco_path: ecoPath,
    });
  } catch (error) {
    console.error('Error selecting eco-path:', error);
    return NextResponse.json({ success: false, error: 'Failed to select eco-path' }, { status: 500 });
  }
}
