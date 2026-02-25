import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { VALID_ECO_PATH_IDS } from '@/lib/constants/eco-paths';

const supabase = supabaseAdmin;

/**
 * GET /api/pledges
 * Fetch current user's pledge albums with proofs.
 */
export async function GET() {
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

    const { data: pledges, error } = await supabase
      .from('pledge_albums')
      .select('*, pledge_proofs(*)')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Map pledge_proofs to proofs for frontend
    const mapped = (pledges || []).map((p: any) => ({
      ...p,
      proofs: p.pledge_proofs || [],
      pledge_proofs: undefined,
    }));

    return NextResponse.json({ success: true, pledges: mapped });
  } catch (error) {
    console.error('Error fetching pledges:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pledges' }, { status: 500 });
  }
}

/**
 * POST /api/pledges
 * Create a new pledge album.
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
    const { title, description, eco_path_id } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    if (title.trim().length > 200) {
      return NextResponse.json({ success: false, error: 'Title must be 200 characters or less' }, { status: 400 });
    }

    if (description && description.length > 1000) {
      return NextResponse.json({ success: false, error: 'Description must be 1000 characters or less' }, { status: 400 });
    }

    // Validate eco_path_id if provided
    if (eco_path_id && !VALID_ECO_PATH_IDS.includes(eco_path_id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid eco-path. Must be one of: ' + VALID_ECO_PATH_IDS.join(', ') },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const { data: pledge, error } = await supabase
      .from('pledge_albums')
      .insert({
        user_id: userData.id,
        title: title.trim(),
        description: description?.trim() || null,
        eco_path_id: eco_path_id || null,
        is_eco_path_pledge: false,
        status: 'draft',
        points_awarded: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, pledge: { ...pledge, proofs: [] } }, { status: 201 });
  } catch (error) {
    console.error('Error creating pledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to create pledge' }, { status: 500 });
  }
}
