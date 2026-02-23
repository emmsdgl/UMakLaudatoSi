/**
 * Admin GCash Verification API Routes
 * 
 * This API handles GCash donation verification and management.
 * 
 * Endpoints:
 * - GET /api/admin/gcash - Fetch GCash donations with filters
 * - PUT /api/admin/gcash - Verify or reject a GCash donation
 * 
 * Access: Super Admin, Finance Admin
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from 'next-auth';
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAdminSession, hasPermission, logAdminAction } from "@/lib/adminAuth";
import { authOptions } from "@/lib/auth";

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;

/**
 * Donation amount → pledge points tiers
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
 * GET - Fetch GCash donations with optional filters
 * 
 * Query parameters:
 * - status: "pending" | "verified" | "rejected" (optional)
 * - campaign_id: UUID (optional)
 * - page: number (default: 1)
 * - limit: number (default: 50)
 */
export async function GET(request: Request) {
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
    
    // Check permission - Finance Admin or Super Admin can verify GCash
    if (!hasPermission(adminCheck.user.role, "donations")) {
      return NextResponse.json(
        { error: "You don't have permission to view GCash donations" },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const campaignId = searchParams.get("campaign_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    
    // Build query - using schema-v2.sql column names
    let query = supabase
      .from("gcash_donations")
      .select(`
        id,
        campaign_id,
        donor_name,
        donor_email,
        donor_phone,
        amount_php,
        reference_number,
        notes,
        status,
        verified_by,
        verified_at,
        created_at,
        donation_campaigns (
          id,
          name
        )
      `, { count: "exact" })
      .order("created_at", { ascending: false });
    
    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    
    // Pagination
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);
    
    const { data: donations, error, count } = await query;
    
    if (error) {
      console.error("Error fetching GCash donations:", error);
      return NextResponse.json(
        { error: "Failed to fetch donations" },
        { status: 500 }
      );
    }
    
    // Normalize donations for frontend compatibility
    const normalizedDonations = (donations || []).map((d: any) => ({
      ...d,
      amount: d.amount_php, // Map to amount for backward compatibility
      campaign: d.donation_campaigns ? {
        id: d.donation_campaigns.id,
        name: d.donation_campaigns.name,
        title: d.donation_campaigns.name, // Alias for frontend
      } : null,
    }));
    
    return NextResponse.json({
      success: true,
      donations: normalizedDonations,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error("Admin GCash API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT - Verify or reject a GCash donation
 * 
 * Required body:
 * - id: string (donation ID)
 * - action: "verify" | "reject"
 * 
 * Optional body (for reject):
 * - reason: string
 */
export async function PUT(request: Request) {
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
    
    // Check permission - Finance Admin or Super Admin can verify GCash
    if (!hasPermission(adminCheck.user.role, "donations")) {
      return NextResponse.json(
        { error: "You don't have permission to verify GCash donations" },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const { id, action, reason } = body;
    
    // Validation
    if (!id) {
      return NextResponse.json(
        { error: "Donation ID is required" },
        { status: 400 }
      );
    }
    
    if (!action || !["verify", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'verify' or 'reject'" },
        { status: 400 }
      );
    }
    
    // Get donation to check status and get campaign info
    const { data: donation, error: fetchError } = await supabase
      .from("gcash_donations")
      .select("*")
      .eq("id", id)
      .single();
    
    if (fetchError || !donation) {
      return NextResponse.json(
        { error: "Donation not found" },
        { status: 404 }
      );
    }
    
    if (donation.status !== "pending") {
      return NextResponse.json(
        { error: `Donation is already ${donation.status}` },
        { status: 400 }
      );
    }
    
    // Update donation status
    const newStatus = action === "verify" ? "verified" : "rejected";
    const { error: updateError } = await supabase
      .from("gcash_donations")
      .update({
        status: newStatus,
        verified_by: adminCheck.user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", id);
    
    if (updateError) {
      console.error("Error updating donation:", updateError);
      return NextResponse.json(
        { error: "Failed to update donation" },
        { status: 500 }
      );
    }
    
    // If verified, update campaign total and award pledge points to donor
    let pointsAwarded = 0;
    if (action === "verify") {
      const donationAmount = Number(donation.amount_php) || 0;

      // Note: campaign totals are computed dynamically from donation tables,
      // so no need to update current_points here.

      // Award pledge points to donor based on amount tier
      // Look up user by donor_email (gcash_donations has no user_id column)
      pointsAwarded = getPointsForDonation(donationAmount);
      if (pointsAwarded > 0 && donation.donor_email) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, total_points")
          .eq("email", donation.donor_email)
          .single();

        if (userData) {
          await supabase
            .from("users")
            .update({ total_points: (userData.total_points || 0) + pointsAwarded })
            .eq("id", userData.id);
        }
      }
    }

    // Log admin action
    await logAdminAction(
      adminCheck.user.id,
      action === "verify" ? "verify_gcash" : "reject_gcash",
      "gcash_donation",
      id,
      {
        amount: donation.amount_php,
        donor: donation.donor_name || donation.donor_email,
        points_awarded: pointsAwarded > 0 ? pointsAwarded : undefined,
        reason: reason || undefined,
      }
    );

    return NextResponse.json({
      success: true,
      message: action === "verify"
        ? `Donation verified successfully${pointsAwarded > 0 ? `. ${pointsAwarded} pledge points awarded to donor.` : ''}`
        : "Donation rejected",
    });
  } catch (error) {
    console.error("Admin GCash API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
