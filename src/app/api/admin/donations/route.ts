/**
 * Admin Donations API Routes
 * 
 * This API handles donation campaign management for admins.
 * 
 * Endpoints:
 * - GET /api/admin/donations - List all campaigns (including inactive)
 * - POST /api/admin/donations - Create new campaign
 * 
 * Access: Super Admin, SA Admin, Finance Admin
 */

import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from 'next-auth';
import { supabase } from "@/lib/supabase";
import { validateAdminSession, hasPermission, logAdminAction } from "@/lib/adminAuth";
import { authOptions } from "@/lib/auth";

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
 * GET - List all donation campaigns (including inactive)
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and validate admin
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);
    
    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check permission
    if (!hasPermission(adminCheck.user.role, "donations")) {
      return NextResponse.json(
        { error: "You don't have permission to view donations" },
        { status: 403 }
      );
    }

    // Fetch all campaigns (including inactive)
    const { data: campaigns, error } = await supabase
      .from('donation_campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donation campaigns:', error);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    // Compute actual totals dynamically from GCash donations
    const mappedCampaigns = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        // Sum verified GCash donations from gcash_donations table
        const { data: gcashData } = await supabase
          .from('gcash_donations')
          .select('amount_php')
          .eq('campaign_id', campaign.id)
          .eq('status', 'verified');
        const gcashTotal = gcashData?.reduce((sum, d) => sum + (Number(d.amount_php) || 0), 0) || 0;

        // Compute GCash equivalent points for campaign progress
        const gcashEquivalentPoints = (gcashData || []).reduce(
          (sum, d) => sum + getPointsForDonation(Number(d.amount_php) || 0), 0
        );

        return {
          ...campaign,
          title: campaign.name,
          goal_amount: campaign.goal_points,
          current_amount: gcashEquivalentPoints,
          gcash_total: gcashTotal,
          gcash_equivalent_points: gcashEquivalentPoints,
        };
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: mappedCampaigns,
    });

  } catch (error) {
    console.error('Error in GET /api/admin/donations:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST - Create a new donation campaign
 * 
 * Required body:
 * - title: string
 * 
 * Optional body:
 * - description: string
 * - goal_amount: number
 * - image_url: string
 * - end_date: string (ISO date)
 * - is_active: boolean
 */
export async function POST(request: Request) {
  try {
    // Get session and validate admin
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);
    
    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error || "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Check permission
    if (!hasPermission(adminCheck.user.role, "donations")) {
      return NextResponse.json(
        { error: "You don't have permission to manage donations" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const {
      title,
      description,
      goal_amount,
      image_url,
      end_date,
      is_active = true,
    } = body;
    
    // Validation
    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Campaign title is required" },
        { status: 400 }
      );
    }
    
    // Create campaign (using schema-v2.sql column names)
    const { data: campaign, error } = await supabase
      .from("donation_campaigns")
      .insert({
        name: title.trim(),
        description: description?.trim() || null,
        goal_points: goal_amount || null,
        image_url: image_url?.trim() || null,
        ends_at: end_date || null,
        is_active,
        current_points: 0,
        created_by: adminCheck.user.id,
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating campaign:", error);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }
    
    // Log admin action
    await logAdminAction(
      adminCheck.user.id,
      "create_campaign",
      "donation_campaign",
      campaign.id,
      undefined,
      { title }
    );
    
    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Admin donations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
