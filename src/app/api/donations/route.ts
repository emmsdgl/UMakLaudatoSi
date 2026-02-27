/**
 * ============================================================================
 * DONATIONS API
 * ============================================================================
 * Handles GCash donation campaign listing with statistics.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;

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

          // Get GCash donor count
          const { count: gcashDonorCount } = await supabase
            .from('gcash_donations')
            .select('id', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .eq('status', 'verified');

          return {
            ...campaign,
            // Map DB column names to frontend-expected names
            title: campaign.name,
            end_date: campaign.ends_at,
            stats: {
              totalPoints: gcashEquivalentPoints,
              totalGcash,
              donorCount: gcashDonorCount || 0,
              progressPercent: campaign.goal_points
                ? Math.min(100, Math.round((gcashEquivalentPoints / campaign.goal_points) * 100))
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

