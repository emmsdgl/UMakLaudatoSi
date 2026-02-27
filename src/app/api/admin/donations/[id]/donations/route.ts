/**
 * Admin Campaign Donations API Routes
 * 
 * This API fetches all donations for a specific campaign.
 * 
 * Endpoints:
 * - GET /api/admin/donations/[id]/donations - Get all donations for a campaign
 * 
 * Access: Super Admin, SA Admin, Finance Admin
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from 'next-auth';
import { supabase } from "@/lib/supabase";
import { validateAdminSession, hasPermission } from "@/lib/adminAuth";
import { authOptions } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Fetch all GCash donations for a campaign
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

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

    // Fetch GCash donations
    const { data: gcashDonations, error: gcashError } = await supabase
      .from("gcash_donations")
      .select(`
        id,
        amount_php,
        donor_name,
        donor_email,
        donor_phone,
        reference_number,
        notes,
        status,
        created_at
      `)
      .eq("campaign_id", id)
      .order("created_at", { ascending: false });

    if (gcashError) {
      console.error("Error fetching GCash donations:", gcashError);
    }

    const donations = (gcashDonations || []).map((d: any) => ({
      ...d,
      type: "gcash",
      amount: d.amount_php,
    }));

    return NextResponse.json({
      success: true,
      donations,
    });
  } catch (error) {
    console.error("Admin campaign donations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
