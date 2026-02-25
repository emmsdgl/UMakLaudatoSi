import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

/**
 * DELETE /api/pledges/[id]/proofs/[proofId]
 * Delete a specific proof from a pledge album.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; proofId: string } }
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

    // Verify pledge ownership and status
    const { data: pledge } = await supabase
      .from('pledge_albums')
      .select('id, status')
      .eq('id', params.id)
      .eq('user_id', userData.id)
      .single();

    if (!pledge) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    if (pledge.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Can only delete proofs from a draft pledge' }, { status: 400 });
    }

    // Fetch the proof
    const { data: proof } = await supabase
      .from('pledge_proofs')
      .select('*')
      .eq('id', params.proofId)
      .eq('pledge_album_id', params.id)
      .single();

    if (!proof) {
      return NextResponse.json({ success: false, error: 'Proof not found' }, { status: 404 });
    }

    // Delete from storage if it has a storage path
    if (proof.storage_path) {
      await supabase.storage.from('images').remove([proof.storage_path]);
    }

    // Delete from DB
    const { error } = await supabase
      .from('pledge_proofs')
      .delete()
      .eq('id', params.proofId);

    if (error) throw error;

    // Update pledge updated_at
    await supabase
      .from('pledge_albums')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting proof:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete proof' }, { status: 500 });
  }
}
