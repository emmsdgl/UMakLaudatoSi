/**
 * Plant Stats API
 *
 * Computes total growth for the community plant/tree.
 * Growth = pledge_messages count + verified GCash donation tier points.
 *
 * This ensures that when a GCash donation is verified and points are awarded,
 * the tree's Growth Progress bar reflects those points.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const supabase = supabaseAdmin;

/**
 * Donation amount → pledge points tiers (must match admin/gcash route)
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

function getPlantStage(count: number): 'seed' | 'sprout' | 'plant' | 'tree' {
  if (count >= 500) return 'tree';
  if (count >= 100) return 'plant';
  if (count >= 10) return 'sprout';
  return 'seed';
}

export async function GET(request: NextRequest) {
  try {
    // 1. Count pledge_messages rows (each pledge = 1 growth point)
    const { count: pledgeCount } = await supabase
      .from('pledge_messages')
      .select('*', { count: 'exact', head: true });

    // 2. Get all verified GCash donation amounts and compute tier points
    const { data: verifiedDonations } = await supabase
      .from('gcash_donations')
      .select('amount_php')
      .eq('status', 'verified');

    const donationPoints = (verifiedDonations || []).reduce(
      (sum, d) => sum + getPointsForDonation(Number(d.amount_php) || 0),
      0
    );

    // Total growth = pledges + donation tier points
    const total = (pledgeCount || 0) + donationPoints;

    return NextResponse.json({
      plantStats: {
        total_contributions: total,
        current_stage: getPlantStage(total),
        pledge_count: pledgeCount || 0,
        donation_points: donationPoints,
      },
    });
  } catch (error) {
    console.error('Error computing plant stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plant stats' },
      { status: 500 }
    );
  }
}
