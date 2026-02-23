/**
 * ============================================================================
 * GCASH DONATIONS API
 * ============================================================================
 * Handles GCash donation submissions from both guests and authenticated users.
 * Uses gcash_donations table columns: amount_php, reference_number, status, notes
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * POST /api/donations/gcash
 * Submit a GCash donation.
 * Can be used by both authenticated users and guests.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const body = await request.json();

    const {
      campaign_id,
      amount,
      gcash_reference,
      donor_name,
      donor_email,
      message = null,
      is_anonymous = false,
    } = body;

    // Validate required fields
    if (!campaign_id) {
      return NextResponse.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: 'Valid donation amount is required' },
        { status: 400 }
      );
    }

    if (amount < 20) {
      return NextResponse.json(
        { success: false, message: 'Minimum donation amount is \u20b120' },
        { status: 400 }
      );
    }

    if (!gcash_reference) {
      return NextResponse.json(
        { success: false, message: 'GCash reference number is required' },
        { status: 400 }
      );
    }

    // For guest donations, name and email are required
    const finalDonorName = donor_name || session?.user?.name || '';
    const finalDonorEmail = donor_email || session?.user?.email || '';

    if (!session?.user?.email && (!donor_name || !donor_email)) {
      return NextResponse.json(
        { success: false, message: 'Name and email are required for guest donations' },
        { status: 400 }
      );
    }

    // Verify campaign exists and is active
    const { data: campaign, error: campaignError } = await supabase
      .from('donation_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .eq('is_active', true)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, message: 'Campaign not found or inactive' },
        { status: 404 }
      );
    }

    // Check for duplicate reference number (prevent double submission)
    const { data: existingDonation } = await supabase
      .from('gcash_donations')
      .select('id')
      .eq('reference_number', gcash_reference)
      .single();

    if (existingDonation) {
      return NextResponse.json(
        { success: false, message: 'This GCash reference has already been submitted' },
        { status: 400 }
      );
    }

    // Check if authenticated user is banned
    if (session?.user?.email) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, is_banned')
        .eq('email', session.user.email)
        .single();

      if (userData?.is_banned) {
        return NextResponse.json(
          { success: false, message: 'Account is suspended' },
          { status: 403 }
        );
      }
    }

    // Build notes field (includes anonymous flag and optional message)
    let notes: string | null = '';
    if (is_anonymous) notes += '[ANONYMOUS] ';
    if (message) notes += message.substring(0, 500);
    notes = notes.trim() || null;

    // Create the donation record (pending verification)
    // Column names match gcash_donations table schema exactly
    const { data: donation, error: donationError } = await supabase
      .from('gcash_donations')
      .insert({
        campaign_id: campaign_id,
        amount_php: amount,
        reference_number: gcash_reference,
        donor_name: finalDonorName,
        donor_email: finalDonorEmail,
        notes: notes,
        status: 'pending',
      })
      .select()
      .single();

    if (donationError) throw donationError;

    // Log audit entry if user is authenticated
    if (session?.user?.email) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (userData) {
        await supabase
          .from('audit_logs')
          .insert({
            actor_id: userData.id,
            action: 'gcash_donation_submitted',
            entity_type: 'donation_campaigns',
            entity_id: campaign_id,
            new_values: { amount, reference_number: gcash_reference },
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Donation submitted! It will be verified by our team.',
      donation: {
        id: donation.id,
        amount: amount,
        status: 'pending',
        campaign: campaign.name,
      },
    });

  } catch (error) {
    console.error('Error processing GCash donation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to submit donation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/donations/gcash
 * Get user's GCash donation history (authenticated only).
 * Looks up by donor_email since gcash_donations has no user_id column.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get donations by donor email (no user_id column on gcash_donations)
    const { data: donations, error: donationsError } = await supabase
      .from('gcash_donations')
      .select(`
        *,
        donation_campaigns (
          id,
          name
        )
      `)
      .eq('donor_email', session.user.email)
      .order('created_at', { ascending: false });

    if (donationsError) throw donationsError;

    return NextResponse.json({
      success: true,
      donations: donations || [],
    });

  } catch (error) {
    console.error('Error fetching GCash donations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch donations' },
      { status: 500 }
    );
  }
}
