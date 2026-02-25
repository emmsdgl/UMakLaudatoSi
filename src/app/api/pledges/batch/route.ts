import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VALID_ECO_PATH_IDS, getEcoPath } from '@/lib/constants/eco-paths';

const supabase = supabaseAdmin;

/**
 * POST /api/pledges/batch
 * Batch-create pledge albums from eco-path suggested actions.
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
    const { eco_path_id, actions } = body;

    // Validate eco_path_id
    if (!eco_path_id || !VALID_ECO_PATH_IDS.includes(eco_path_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid eco-path.' },
        { status: 400 }
      );
    }

    // Validate actions array
    if (!Array.isArray(actions) || actions.length === 0 || actions.length > 6) {
      return NextResponse.json(
        { success: false, error: 'Select between 1 and 6 actions.' },
        { status: 400 }
      );
    }

    // Validate each action exists in the eco-path's suggested actions
    const ecoPath = getEcoPath(eco_path_id);
    if (!ecoPath) {
      return NextResponse.json(
        { success: false, error: 'Eco-path not found.' },
        { status: 400 }
      );
    }

    for (const action of actions) {
      if (typeof action !== 'string' || !ecoPath.suggested_actions.includes(action)) {
        return NextResponse.json(
          { success: false, error: 'Invalid action selected.' },
          { status: 400 }
        );
      }
    }

    // Check user has no un-graded eco-path pledges
    const { count: ungraded } = await supabase
      .from('pledge_albums')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id)
      .eq('is_eco_path_pledge', true)
      .neq('status', 'graded');

    if (ungraded && ungraded > 0) {
      return NextResponse.json(
        { success: false, error: 'Complete your current eco-path pledges before creating new ones.' },
        { status: 400 }
      );
    }

    // Build insert rows
    const now = new Date().toISOString();
    const rows = actions.map((action: string) => ({
      user_id: userData.id,
      title: action,
      description: null,
      eco_path_id,
      is_eco_path_pledge: true,
      status: 'draft',
      points_awarded: 0,
      created_at: now,
      updated_at: now,
    }));

    const { data: pledges, error } = await supabase
      .from('pledge_albums')
      .insert(rows)
      .select();

    if (error) throw error;

    // Add empty proofs array for frontend
    const mapped = (pledges || []).map((p: any) => ({ ...p, proofs: [] }));

    return NextResponse.json({ success: true, pledges: mapped }, { status: 201 });
  } catch (error) {
    console.error('Error batch-creating pledges:', error);
    return NextResponse.json({ success: false, error: 'Failed to create pledges' }, { status: 500 });
  }
}
