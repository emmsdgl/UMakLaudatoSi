import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * GET /api/pledges/[id]/proofs
 * List proofs for a pledge album.
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

    // Verify pledge ownership
    const { data: pledge } = await supabase
      .from('pledge_albums')
      .select('id')
      .eq('id', params.id)
      .eq('user_id', userData.id)
      .single();

    if (!pledge) {
      return NextResponse.json({ success: false, error: 'Pledge not found' }, { status: 404 });
    }

    const { data: proofs, error } = await supabase
      .from('pledge_proofs')
      .select('*')
      .eq('pledge_album_id', params.id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, proofs: proofs || [] });
  } catch (error) {
    console.error('Error fetching proofs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch proofs' }, { status: 500 });
  }
}

/**
 * POST /api/pledges/[id]/proofs
 * Upload a proof file (jpg, png, pdf) to a pledge album.
 */
export async function POST(
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
      return NextResponse.json({ success: false, error: 'Can only upload proofs to a draft pledge' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: JPEG, PNG, PDF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Generate storage path
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const storagePath = `pledge-proofs/${userData.id}/${params.id}/${filename}`;

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);

      // Fallback: store as base64 data URL when storage fails
      // This handles bucket not found, MIME type restrictions, or any other storage issue
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${file.type};base64,${base64}`;

      const { data: proof, error: dbError } = await supabase
        .from('pledge_proofs')
        .insert({
          pledge_album_id: params.id,
          file_url: dataUrl,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: null,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update pledge updated_at
      await supabase
        .from('pledge_albums')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', params.id);

      return NextResponse.json({
        success: true,
        proof,
        warning: 'Storage upload failed - using base64 fallback',
      }, { status: 201 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('images')
      .getPublicUrl(storagePath);

    // Insert proof record
    const { data: proof, error: dbError } = await supabase
      .from('pledge_proofs')
      .insert({
        pledge_album_id: params.id,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Update pledge updated_at
    await supabase
      .from('pledge_albums')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id);

    return NextResponse.json({ success: true, proof }, { status: 201 });
  } catch (error) {
    console.error('Error uploading proof:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload proof' }, { status: 500 });
  }
}
