/**
 * ============================================================================
 * DONATIONS API
 * ============================================================================
 * Handles point donations to campaigns and GCash donation tracking.
 * Supports both authenticated user donations and guest donations.
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
 * Donation amount → equivalent pledge points (same tiers as admin/gcash)
 */
function getPointsForDonation(amount: number): number {
  if (amount >= 300) return 30;
  if (amount >= 200) return 20;
  if (amount >= 151) return 15;
  if (amount >= 101) return 10;
  if (amount >= 81) return 8;
  if (amount >= 51) return 5;
  if (amount >= 20) return 3;
  return 0;
}

/**
 * GET /api/donations
 * Retrieve active donation campaigns.
 * 
 * Query Parameters:
 * - include_stats: boolean - Include donation statistics (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('include_stats') === 'true';

    // Fetch active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('donation_campaigns')
      .select('*')
      .eq('is_active', true)
      .or('ends_at.is.null,ends_at.gte.' + new Date().toISOString())
      .order('created_at', { ascending: false });

    if (campaignsError) throw campaignsError;

    // Optionally include donation statistics
    if (includeStats && campaigns) {
      const campaignsWithStats = await Promise.all(
        campaigns.map(async (campaign) => {
          // Get point donations total
          const { data: pointDonations } = await supabase
            .from('point_donations')
            .select('points_donated')
            .eq('campaign_id', campaign.id);

          const totalPoints = pointDonations?.reduce(
            (sum, d) => sum + d.points_donated, 
            0
          ) || 0;

          // Get GCash donations total (only verified)
          const { data: gcashDonations } = await supabase
            .from('gcash_donations')
            .select('amount_php')
            .eq('campaign_id', campaign.id)
            .eq('status', 'verified');

          const totalGcash = gcashDonations?.reduce(
            (sum, d) => sum + (Number(d.amount_php) || 0),
            0
          ) || 0;

          // Compute GCash equivalent points for progress
          const gcashEquivalentPoints = (gcashDonations || []).reduce(
            (sum, d) => sum + getPointsForDonation(Number(d.amount_php) || 0), 0
          );

          // Get unique donor count (point + GCash donors)
          const { count: pointDonorCount } = await supabase
            .from('point_donations')
            .select('user_id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          const { count: gcashDonorCount } = await supabase
            .from('gcash_donations')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'verified');

          // Combined progress = point donations + GCash equivalent points
          const combinedPoints = totalPoints + gcashEquivalentPoints;

          return {
            ...campaign,
            // Map DB column names to frontend-expected names
            title: campaign.name,
            end_date: campaign.ends_at,
            stats: {
              totalPoints: combinedPoints,
              totalGcash,
              donorCount: (pointDonorCount || 0) + (gcashDonorCount || 0),
              progressPercent: campaign.goal_points
                ? Math.min(100, Math.round((combinedPoints / campaign.goal_points) * 100))
                : null,
            },
          };
        })
      );

      return NextResponse.json({
        success: true,
        campaigns: campaignsWithStats,
      });
    }

    // Map DB column names to frontend-expected names
    const mapped = (campaigns || []).map((c) => ({
      ...c,
      title: c.name,
      end_date: c.ends_at,
    }));

    return NextResponse.json({
      success: true,
      campaigns: mapped,
    });

  } catch (error) {
    console.error('Error fetching donation campaigns:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/donations
 * Make a point donation to a campaign.
 * Requires authentication.
 * 
 * Request Body:
 * - campaign_id: UUID of the campaign
 * - points: Number of points to donate
 * - is_anonymous: Boolean (optional, default false)
 * - message: Optional message with donation
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { campaign_id, points, is_anonymous = false, message = null } = body;

    // Validate input
    if (!campaign_id) {
      return NextResponse.json(
        { success: false, message: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    if (!points || points <= 0 || !Number.isInteger(points)) {
      return NextResponse.json(
        { success: false, message: 'Points must be a positive integer' },
        { status: 400 }
      );
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, total_points, is_banned')
      .eq('email', session.user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    if (userData.is_banned) {
      return NextResponse.json(
        { success: false, message: 'Account is suspended' },
        { status: 403 }
      );
    }

    // Check user has enough points
    if (userData.total_points < points) {
      return NextResponse.json(
        { success: false, message: 'Insufficient points balance' },
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

    // Check campaign hasn't ended
    if (campaign.ends_at && new Date(campaign.ends_at) < new Date()) {
      return NextResponse.json(
        { success: false, message: 'This campaign has ended' },
        { status: 400 }
      );
    }

    // Deduct points from user
    const newBalance = userData.total_points - points;
    await supabase
      .from('users')
      .update({ total_points: newBalance })
      .eq('id', userData.id);

    // Record point transaction (negative for donation)
    await supabase
      .from('point_transactions')
      .insert({
        user_id: userData.id,
        amount: -points,
        transaction_type: 'donation',
        reference_id: campaign_id,
        description: `Donated ${points} pts to: ${campaign.name}`,
      });

    // Record the donation
    const { data: donation, error: donationError } = await supabase
      .from('point_donations')
      .insert({
        user_id: userData.id,
        campaign_id: campaign_id,
        points_donated: points,
        is_anonymous,
        message: message?.substring(0, 500), // Limit message length
      })
      .select()
      .single();

    if (donationError) throw donationError;

    // Log audit entry
    await supabase
      .from('audit_logs')
      .insert({
        actor_id: userData.id,
        action: 'point_donation',
        entity_type: 'donation_campaigns',
        entity_id: campaign_id,
        new_values: { points_donated: points, is_anonymous },
      });

    return NextResponse.json({
      success: true,
      message: `Successfully donated ${points} points!`,
      donation: {
        id: donation.id,
        points: points,
        campaign: campaign.name,
      },
      newBalance,
    });

  } catch (error) {
    console.error('Error processing donation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process donation' },
      { status: 500 }
    );
  }
}
