export const dynamic = 'force-dynamic';

/**
 * Recent Verified Donations API
 *
 * Returns the most recent verified GCash donations for the public ticker.
 * Anonymous donations (notes starts with [ANONYMOUS]) hide donor name.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const supabase = supabaseAdmin;

export async function GET(request: NextRequest) {
  try {
    const { data: donations, error } = await supabase
      .from('gcash_donations')
      .select(`
        id,
        donor_name,
        amount_php,
        notes,
        verified_at,
        created_at,
        donation_campaigns (
          id,
          name
        )
      `)
      .eq('status', 'verified')
      .order('verified_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const mapped = (donations || []).map((d: any) => {
      const isAnonymous = d.notes?.startsWith('[ANONYMOUS]');
      return {
        id: d.id,
        donor_name: isAnonymous ? 'Anonymous' : (d.donor_name || 'Someone'),
        amount: Number(d.amount_php) || 0,
        campaign_name: d.donation_campaigns?.name || 'a campaign',
        verified_at: d.verified_at || d.created_at,
        is_anonymous: isAnonymous,
      };
    });

    return NextResponse.json({ success: true, donations: mapped });
  } catch (error) {
    console.error('Error fetching recent donations:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch donations' },
      { status: 500 }
    );
  }
}
