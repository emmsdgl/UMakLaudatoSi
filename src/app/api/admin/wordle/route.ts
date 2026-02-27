/**
 * ============================================================================
 * ADMIN WORDLE WORDS API
 * ============================================================================
 * CRUD operations for managing daily Wordle words.
 * Access: Super Admin only.
 * ============================================================================
 */

import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateAdminSession, hasPermission, logAdminAction } from '@/lib/adminAuth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

/**
 * GET /api/admin/wordle
 * List all wordle words, ordered by scheduled_date.
 * Query params: from, to (date range filter)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(adminCheck.user.role, 'wordle')) {
      return NextResponse.json(
        { error: "You don't have permission to manage Wordle words" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('wordle_words')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (from) query = query.gte('scheduled_date', from);
    if (to) query = query.lte('scheduled_date', to);

    const { data: words, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: words || [] });
  } catch (error) {
    console.error('Error fetching wordle words:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch wordle words' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/wordle
 * Add a new wordle word with a scheduled date.
 * Body: { word: string, scheduled_date: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(adminCheck.user.role, 'wordle')) {
      return NextResponse.json(
        { error: "You don't have permission to manage Wordle words" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const word = (body.word || '').toLowerCase().trim();
    const scheduledDate = body.scheduled_date;

    // Validate word
    if (!word || word.length !== 5 || !/^[a-z]{5}$/.test(word)) {
      return NextResponse.json(
        { error: 'Word must be exactly 5 letters (a-z)' },
        { status: 400 }
      );
    }

    // Validate date
    if (!scheduledDate) {
      return NextResponse.json(
        { error: 'Scheduled date is required' },
        { status: 400 }
      );
    }

    // Check for duplicate date
    const { data: existing } = await supabase
      .from('wordle_words')
      .select('id, word')
      .eq('scheduled_date', scheduledDate)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: `Date ${scheduledDate} already has a word assigned: "${existing.word}"` },
        { status: 409 }
      );
    }

    // Insert word
    const { data: newWord, error } = await supabase
      .from('wordle_words')
      .insert({
        word,
        scheduled_date: scheduledDate,
        created_by: adminCheck.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      adminCheck.user.id,
      'create_wordle_word',
      'wordle_words',
      newWord.id,
      undefined,
      { word, scheduled_date: scheduledDate }
    );

    return NextResponse.json({ success: true, data: newWord });
  } catch (error) {
    console.error('Error creating wordle word:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create wordle word' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/wordle
 * Update an existing wordle word (only future dates).
 * Body: { id: string, word?: string, scheduled_date?: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(adminCheck.user.role, 'wordle')) {
      return NextResponse.json(
        { error: "You don't have permission to manage Wordle words" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Word ID is required' }, { status: 400 });
    }

    // Get existing word
    const { data: existing } = await supabase
      .from('wordle_words')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Only allow editing future words
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (existing.scheduled_date <= today) {
      return NextResponse.json(
        { error: 'Cannot edit words for today or past dates' },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    if (body.word) {
      const word = body.word.toLowerCase().trim();
      if (word.length !== 5 || !/^[a-z]{5}$/.test(word)) {
        return NextResponse.json(
          { error: 'Word must be exactly 5 letters (a-z)' },
          { status: 400 }
        );
      }
      updates.word = word;
    }

    if (body.scheduled_date) {
      // Check for duplicate date (excluding current record)
      const { data: duplicateDate } = await supabase
        .from('wordle_words')
        .select('id')
        .eq('scheduled_date', body.scheduled_date)
        .neq('id', id)
        .single();

      if (duplicateDate) {
        return NextResponse.json(
          { error: `Date ${body.scheduled_date} already has a word assigned` },
          { status: 409 }
        );
      }
      updates.scheduled_date = body.scheduled_date;
    }

    const { data: updated, error } = await supabase
      .from('wordle_words')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      adminCheck.user.id,
      'update_wordle_word',
      'wordle_words',
      id,
      { word: existing.word, scheduled_date: existing.scheduled_date },
      updates
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating wordle word:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update wordle word' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/wordle
 * Delete a wordle word (only future dates).
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);

    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(adminCheck.user.role, 'wordle')) {
      return NextResponse.json(
        { error: "You don't have permission to manage Wordle words" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: 'Word ID is required' }, { status: 400 });
    }

    // Get existing word
    const { data: existing } = await supabase
      .from('wordle_words')
      .select('*')
      .eq('id', id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Word not found' }, { status: 404 });
    }

    // Only allow deleting future words
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
    if (existing.scheduled_date <= today) {
      return NextResponse.json(
        { error: 'Cannot delete words for today or past dates' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('wordle_words')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAdminAction(
      adminCheck.user.id,
      'delete_wordle_word',
      'wordle_words',
      id,
      { word: existing.word, scheduled_date: existing.scheduled_date },
      undefined
    );

    return NextResponse.json({ success: true, message: 'Word deleted' });
  } catch (error) {
    console.error('Error deleting wordle word:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete wordle word' },
      { status: 500 }
    );
  }
}
