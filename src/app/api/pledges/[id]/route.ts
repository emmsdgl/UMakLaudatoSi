import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

/**
 * GET /api/pledges/[id]
 * Fetch a single pledge album with proofs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: pledge, error } = await supabase
      .from('pledge_albums')
      .select('*, pledge_proofs(*)')
      .eq('id', params.id)
      .eq('user_id', userData.id)
      .single();

    if (error || !pledge) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      pledge: { ...pledge, proofs: pledge.pledge_proofs || [], pledge_proofs: undefined },
    });
  } catch (error) {
    console.error('Error fetching pledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch pledge' }, { status: 500 });
  }
}

/**
 * PUT /api/pledges/[id]
 * Update pledge title, description, or status.
 * Status transitions: draft→submitted, submitted→draft (cancel/edit)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Fetch existing pledge
    const { data: existing } = await supabase
      .from('pledge_albums')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userData.id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    if (existing.status === 'graded') {
      return NextResponse.json({ success: false, error: 'Cannot edit a completed pledge' }, { status: 400 });
    }

    if (existing.status === 'reviewing') {
      return NextResponse.json({ success: false, error: 'Cannot edit a pledge that is being reviewed' }, { status: 400 });
    }

    const body = await request.json();
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    // Handle status change
    if (body.status) {
      if (body.status === 'submitted' && existing.status === 'draft') {
        updates.status = 'submitted';
        updates.submitted_at = new Date().toISOString();
      } else if (body.status === 'draft' && existing.status === 'submitted') {
        // Cancel/Edit flow — only allowed while still 'submitted' (not 'reviewing')
        updates.status = 'draft';
        updates.submitted_at = null;
      } else {
        return NextResponse.json({ success: false, error: 'Invalid status transition' }, { status: 400 });
      }
    }

    // Handle title/description edits
    if (body.title !== undefined) {
      if (!body.title || body.title.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
      }
      if (body.title.trim().length > 200) {
        return NextResponse.json({ success: false, error: 'Title must be 200 characters or less' }, { status: 400 });
      }
      updates.title = body.title.trim();
    }

    if (body.description !== undefined) {
      if (body.description && body.description.length > 1000) {
        return NextResponse.json({ success: false, error: 'Description must be 1000 characters or less' }, { status: 400 });
      }
      updates.description = body.description?.trim() || null;
    }

    const { data: pledge, error } = await supabase
      .from('pledge_albums')
      .update(updates)
      .eq('id', params.id)
      .select('*, pledge_proofs(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      pledge: { ...pledge, proofs: pledge.pledge_proofs || [], pledge_proofs: undefined },
    });
  } catch (error) {
    console.error('Error updating pledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to update pledge' }, { status: 500 });
  }
}

/**
 * DELETE /api/pledges/[id]
 * Delete a pledge album (draft only). Removes proofs from storage too.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: existing } = await supabase
      .from('pledge_albums')
      .select('*, pledge_proofs(*)')
      .eq('id', params.id)
      .eq('user_id', userData.id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    if (existing.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Can only delete draft pledges' }, { status: 400 });
    }

    // Delete files from storage
    const proofs = existing.pledge_proofs || [];
    if (proofs.length > 0) {
      const paths = proofs.map((p: any) => p.storage_path).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from('images').remove(paths);
      }
    }

    // Delete pledge (cascade deletes proofs from DB)
    const { error } = await supabase
      .from('pledge_albums')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pledge:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete pledge' }, { status: 500 });
  }
}
