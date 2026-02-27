/**
 * ============================================================================
 * ADMIN LAYOUT
 * ============================================================================
 * Root layout for all admin pages.
 * Provides navigation sidebar, header, and authentication wrapper.
 * Fully responsive for laptop, tablet, and mobile devices.
 * ============================================================================
 */

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { isAdmin, ADMIN_PERMISSIONS } from '@/lib/adminAuth';
import type { UserRole } from '@/types';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Server-side admin authentication check
 * Redirects non-admins to home page
 */
export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession(authOptions);

  // Check authentication
  if (!session?.user?.email) {
    redirect('/');
  }

  // Get user role from database
  const { data: userData, error } = await supabase
    .from('users')
    .select('id, name, email, role, avatar_url, is_banned')
    .eq('email', session.user.email)
    .single();

  if (error || !userData) {
    redirect('/');
  }

  if (userData.is_banned) {
    redirect('/?error=account_banned');
  }

  // Check admin access
  if (!isAdmin(userData.role as UserRole)) {
    redirect('/home');
  }

  // Build navigation items based on role permissions
  const navItems = buildNavItems(userData.role as UserRole);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Admin Header */}
      <AdminHeader 
        user={{
          name: userData.name || 'Admin',
          email: userData.email,
          avatar: userData.avatar_url,
          role: userData.role as UserRole,
        }}
      />

      <div className="flex">
        {/* Sidebar Navigation - Hidden on mobile, shown on md+ */}
        <AdminSidebar 
          items={navItems} 
          userRole={userData.role as UserRole}
        />

        {/* Main Content Area - Responsive padding */}
        <main className="flex-1 p-4 md:p-6 md:ml-64 mt-16 min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Build navigation items based on admin role permissions
 */
function buildNavItems(role: UserRole) {
  const allItems = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/admin',
      icon: 'LayoutDashboard',
    },
    {
      key: 'users',
      label: 'Users',
      href: '/admin/users',
      icon: 'Users',
    },
    {
      key: 'rewards',
      label: 'Rewards',
      href: '/admin/rewards',
      icon: 'Gift',
    },
    {
      key: 'redemptions',
      label: 'Verify Rewards',
      href: '/admin/redemptions',
      icon: 'QrCode',
    },
    {
      key: 'wallet',
      label: 'My Wallet',
      href: '/admin/wallet',
      icon: 'Wallet',
    },
    {
      key: 'pledges',
      label: 'Pledges',
      href: '/admin/pledges',
      icon: 'BookOpen',
    },
    {
      key: 'promo_codes',
      label: 'Promo Codes',
      href: '/admin/promo-codes',
      icon: 'Ticket',
    },
    {
      key: 'donations',
      label: 'Donations',
      href: '/admin/donations',
      icon: 'Heart',
    },
    {
      key: 'gcash',
      label: 'GCash Verify',
      href: '/admin/gcash',
      icon: 'Banknote',
    },
    {
      key: 'payouts',
      label: 'Payouts',
      href: '/admin/payouts',
      icon: 'Wallet',
    },
    {
      key: 'wordle',
      label: 'Wordle Words',
      href: '/admin/wordle',
      icon: 'Gamepad2',
    },
    {
      key: 'audit_logs',
      label: 'Audit Logs',
      href: '/admin/audit-logs',
      icon: 'FileText',
    },
  ];

  // Filter items based on role permissions
  return allItems.filter(item => {
    const allowedRoles = ADMIN_PERMISSIONS[item.key];
    return allowedRoles?.includes(role);
  });
}
