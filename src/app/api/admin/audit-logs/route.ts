/**
 * ============================================================================
 * ADMIN AUDIT LOGS API
 * ============================================================================
 * Provides access to system audit logs for compliance and debugging.
 * Super Admin only.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateAdminSession, hasPermission } from '@/lib/adminAuth';

/**
 * GET /api/admin/audit-logs
 * Retrieve paginated audit logs with filters.
 * 
 * Query Parameters:
 * - action: Filter by action type
 * - entity_type: Filter by entity type
 * - actor_id: Filter by admin who performed action
 * - start_date: Filter from date
 * - end_date: Filter to date
 * - page: Page number
 * - limit: Items per page
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    const adminCheck = await validateAdminSession(session?.user?.email);
    
    if (!adminCheck.isValid || !adminCheck.user) {
      return NextResponse.json(
        { success: false, message: adminCheck.error },
        { status: 403 }
      );
    }

    // Audit logs are super admin only
    if (!hasPermission(adminCheck.user.role, 'audit_logs')) {
      return NextResponse.json(
        { success: false, message: 'Super Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const entityType = searchParams.get('entity_type');
    const actorId = searchParams.get('actor_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = (page - 1) * limit;

    // Build query (no FK join - fetch actor info separately)
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (actorId) {
      query = query.eq('actor_id', actorId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Execute with pagination
    const { data: logs, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Fetch actor (admin) info separately for each unique actor_id
    const actorIds = Array.from(new Set((logs || []).map(l => l.actor_id).filter(Boolean)));
    let actorsMap: Record<string, { id: string; name: string; email: string; role: string }> = {};

    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', actorIds);

      if (actors) {
        actorsMap = Object.fromEntries(actors.map(a => [a.id, a]));
      }
    }

    // Attach actor info to each log
    const logsWithActors = (logs || []).map(log => ({
      ...log,
      admin_email: log.actor_id ? actorsMap[log.actor_id]?.email || null : null,
      admin: log.actor_id ? actorsMap[log.actor_id] || null : null,
    }));

    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      logs: logsWithActors,
      total,
      totalPages,
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
