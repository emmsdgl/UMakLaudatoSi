/**
 * ============================================================================
 * ADMIN MIDDLEWARE
 * ============================================================================
 * Shared utilities for admin authentication and authorization.
 * Validates admin roles and permissions for protected routes.
 * ============================================================================
 */

import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

/**
 * Admin role hierarchy and permissions
 * Higher index = more permissions
 */
export const ADMIN_ROLES: UserRole[] = [
  'student',        // 0 - No admin access
  'employee',       // 1 - No admin access
  'guest',          // 2 - No admin access
  'canteen_admin',  // 3 - Rewards verification only
  'finance_admin',  // 4 - GCash verification, donations
  'sa_admin',       // 5 - Student management, promo codes
  'super_admin',    // 6 - Full access
];

// Also allow simple 'admin' role as super_admin equivalent
const ADMIN_ROLE_ALIASES: Record<string, UserRole> = {
  'admin': 'super_admin',
};

/**
 * Module-based permission mapping
 * Defines which roles can access which admin modules
 */
export const ADMIN_PERMISSIONS: Record<string, UserRole[]> = {
  // Dashboard - visible to all admins
  dashboard: ['admin', 'canteen_admin', 'finance_admin', 'sa_admin', 'super_admin'],
  
  // User Management - SA Admin and Super Admin
  users: ['admin', 'sa_admin', 'super_admin'],
  
  // Points & Streaks - SA Admin and Super Admin
  points: ['admin', 'sa_admin', 'super_admin'],
  
  // Rewards Management - Canteen Admin, SA Admin, Super Admin
  rewards: ['admin', 'canteen_admin', 'sa_admin', 'super_admin'],
  
  // Reward Verification - Canteen Admin, SA Admin, Super Admin
  redemptions: ['admin', 'canteen_admin', 'sa_admin', 'super_admin'],
  
  // Promo Codes - SA Admin and Super Admin
  promo_codes: ['admin', 'sa_admin', 'super_admin'],
  
  // Donations - Finance Admin, SA Admin, Super Admin
  donations: ['admin', 'finance_admin', 'sa_admin', 'super_admin'],
  
  // GCash Verification - Finance Admin, SA Admin, Super Admin
  gcash: ['admin', 'finance_admin', 'sa_admin', 'super_admin'],
  
  // Pledge Album Review - SA Admin and Super Admin
  pledges: ['admin', 'sa_admin', 'super_admin'],

  // Audit Logs - Super Admin only
  audit_logs: ['admin', 'super_admin'],

  // Settings - Super Admin only
  settings: ['admin', 'super_admin'],
};

/**
 * Normalize role - handle 'admin' alias
 */
function normalizeRole(role: string): UserRole {
  if (ADMIN_ROLE_ALIASES[role]) {
    return ADMIN_ROLE_ALIASES[role];
  }
  return role as UserRole;
}

/**
 * Check if a user has admin access to any module
 */
export function isAdmin(role: UserRole | string): boolean {
  // Handle 'admin' as super_admin
  if (role === 'admin') return true;
  
  const normalizedRole = normalizeRole(role as string);
  const roleIndex = ADMIN_ROLES.indexOf(normalizedRole);
  return roleIndex >= 3; // canteen_admin and above
}

/**
 * Check if a user has permission for a specific module
 */
export function hasPermission(role: UserRole | string, module: string): boolean {
  // Handle 'admin' as super_admin (full access)
  if (role === 'admin') return true;
  
  const normalizedRole = normalizeRole(role as string);
  const allowedRoles = ADMIN_PERMISSIONS[module];
  if (!allowedRoles) return false;
  return allowedRoles.includes(normalizedRole);
}

/**
 * Check if a role can manage another role (for user management)
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  const managerIndex = ADMIN_ROLES.indexOf(managerRole);
  const targetIndex = ADMIN_ROLES.indexOf(targetRole);
  
  // Can only manage roles below your level
  // Super admin can manage everyone except other super admins
  if (managerRole === 'super_admin') {
    return targetRole !== 'super_admin';
  }
  
  return managerIndex > targetIndex;
}

/**
 * Validate admin session and return user data
 * Returns null if not an admin or not authenticated
 */
export async function validateAdminSession(email: string | null | undefined): Promise<{
  isValid: boolean;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
  error?: string;
}> {
  if (!email) {
    return { isValid: false, error: 'Not authenticated' };
  }

  // Select only columns that definitely exist
  const { data: userData, error } = await supabase
    .from('users')
    .select('id, email, name, role')
    .eq('email', email)
    .single();

  if (error || !userData) {
    return { isValid: false, error: 'User not found' };
  }

  // Check is_banned separately (column may not exist)
  try {
    const { data: banData } = await supabase
      .from('users')
      .select('is_banned')
      .eq('email', email)
      .single();
    
    if (banData?.is_banned) {
      return { isValid: false, error: 'Account is suspended' };
    }
  } catch {
    // Column doesn't exist, ignore
  }

  if (!isAdmin(userData.role as UserRole)) {
    return { isValid: false, error: 'Admin access required' };
  }

  return {
    isValid: true,
    user: {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role as UserRole,
    },
  };
}

/**
 * Log admin action to audit log
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>
) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_values: oldValues || null,
        new_values: newValues || null,
      });
  } catch (error) {
    // Silently fail if audit_logs table doesn't exist yet
    console.error('Failed to log admin action:', error);
  }
}
