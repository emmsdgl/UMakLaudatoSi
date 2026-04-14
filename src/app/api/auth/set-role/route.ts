/**
 * POST /api/auth/set-role
 * Sets the user's role after sign-in based on their selection.
 * Validates email domain against role:
 *   - @umak.edu.ph → student, employee
 *   - Other emails  → guest, canteen_admin
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const UMAK_ROLES = ["student", "employee"];
const EXTERNAL_ROLES = ["guest", "canteen_admin"];
const ALL_ALLOWED = [...UMAK_ROLES, ...EXTERNAL_ROLES];

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { role } = await request.json();

  if (!role || !ALL_ALLOWED.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Validate role matches email domain
  const isUMak = session.user.email.endsWith("@umak.edu.ph");
  if (isUMak && !UMAK_ROLES.includes(role)) {
    return NextResponse.json({ error: "UMak accounts must select Student or Employee" }, { status: 400 });
  }
  if (!isUMak && !EXTERNAL_ROLES.includes(role)) {
    return NextResponse.json({ error: "Non-UMak accounts must select Guest or Canteen Admin" }, { status: 400 });
  }

  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("email", session.user.email);

  if (error) {
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 });
  }

  return NextResponse.json({ success: true, role });
}
