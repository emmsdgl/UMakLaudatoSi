/**
 * ============================================================================
 * ADMIN WORDLE BULK ADD API
 * ============================================================================
 * Bulk add wordle words with scheduled dates.
 * Access: Super Admin only.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { validateAdminSession, hasPermission, logAdminAction } from '@/lib/adminAuth';
import { authOptions } from '@/lib/auth';

const supabase = supabaseAdmin;

/**
 * POST /api/admin/wordle/bulk
 * Bulk add wordle words.
 * Body: { words: Array<{ word: string, scheduled_date: string }> }
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
    const { words } = body;

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json(
        { error: 'Words array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (words.length > 365) {
      return NextResponse.json(
        { error: 'Maximum 365 words per bulk upload' },
        { status: 400 }
      );
    }

    // Get all existing scheduled dates to check for duplicates
    const dates = words.map((w: any) => w.scheduled_date).filter(Boolean);
    const { data: existingWords } = await supabase
      .from('wordle_words')
      .select('scheduled_date')
      .in('scheduled_date', dates);

    const existingDates = new Set(existingWords?.map(w => w.scheduled_date) || []);

    const inserted: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    const validEntries: { word: string; scheduled_date: string; created_by: string }[] = [];

    for (const entry of words) {
      const word = (entry.word || '').toLowerCase().trim();
      const scheduledDate = entry.scheduled_date;

      // Validate word
      if (!word || word.length !== 5 || !/^[a-z]{5}$/.test(word)) {
        errors.push(`"${entry.word}" - must be exactly 5 letters`);
        continue;
      }

      // Validate date
      if (!scheduledDate) {
        errors.push(`"${word}" - missing scheduled date`);
        continue;
      }

      // Check for duplicate date
      if (existingDates.has(scheduledDate)) {
        skipped.push(`"${word}" (${scheduledDate}) - date already has a word`);
        continue;
      }

      // Check for duplicate date within this batch
      if (validEntries.some(e => e.scheduled_date === scheduledDate)) {
        skipped.push(`"${word}" (${scheduledDate}) - duplicate date in batch`);
        continue;
      }

      validEntries.push({
        word,
        scheduled_date: scheduledDate,
        created_by: adminCheck.user.id,
      });
      inserted.push(`"${word}" (${scheduledDate})`);
    }

    // Bulk insert valid entries
    if (validEntries.length > 0) {
      const { error } = await supabase
        .from('wordle_words')
        .insert(validEntries);

      if (error) throw error;
    }

    await logAdminAction(
      adminCheck.user.id,
      'bulk_create_wordle_words',
      'wordle_words',
      undefined,
      undefined,
      { count: validEntries.length }
    );

    return NextResponse.json({
      success: true,
      data: {
        inserted: validEntries.length,
        skipped: skipped.length,
        errors: errors.length,
        details: {
          inserted,
          skipped,
          errors,
        },
      },
    });
  } catch (error) {
    console.error('Error bulk adding wordle words:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to bulk add wordle words' },
      { status: 500 }
    );
  }
}
