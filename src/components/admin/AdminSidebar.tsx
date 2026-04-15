'use client';

/**
 * ============================================================================
 * ADMIN SIDEBAR COMPONENT
 * ============================================================================
 * Responsive navigation sidebar for admin panel.
 * - Desktop: Fixed sidebar on the left
 * - Tablet/Mobile: Slide-out drawer with hamburger menu
 * Shows menu items based on user permissions.
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Gift,
  QrCode,
  Ticket,
  Heart,
  CreditCard,
  FileText,
  Shield,
  Banknote,
  BookOpen,
  Wallet,
  Menu,
  X,
  Leaf,
  ChevronRight,
  Gamepad2,
} from 'lucide-react';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string;
}

interface AdminSidebarProps {
  items: NavItem[];
  userRole: UserRole;
}

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Gift,
  QrCode,
  Ticket,
  Heart,
  CreditCard,
  FileText,
  Banknote,
  BookOpen,
  Wallet,
  Gamepad2,
};

// Role display names and colors
const roleConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  student: { label: 'Student', color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  employee: { label: 'Employee', color: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  guest: { label: 'Guest', color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  canteen_admin: { label: 'Canteen Admin', color: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  admin: { label: 'Admin', color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  super_admin: { label: 'Super Admin', color: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-100 dark:bg-red-900/30' },
};

export default function AdminSidebar({ items, userRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle mount state for animations
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileOpen]);

  const roleInfo = roleConfig[userRole] || roleConfig.guest;

  const SidebarContent = () => (
    <>
      {/* Logo & Brand - Mobile only */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Laudato Si&apos;</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Role Badge */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-gray-400" />
          <span className={cn(
            'px-2.5 py-1 rounded-full text-xs font-semibold',
            roleInfo.bgColor,
            roleInfo.color
          )}>
            {roleInfo.label}
          </span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 md:p-4 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
          Management
        </p>
        {items.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || 
            (item.href !== '/admin' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 transition-transform',
                isActive ? 'text-white' : 'text-gray-400 group-hover:text-green-600'
              )} />
              <span className="font-medium flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-white/70" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <Link
          href="/home"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-green-600 transition-colors px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
          <span>Back to App</span>
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Menu Button - Fixed at top left on mobile */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="fixed top-20 left-4 z-40 md:hidden bg-white dark:bg-gray-800 p-2.5 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Desktop Sidebar - Hidden on mobile */}
      <aside className="hidden md:flex md:flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMounted && (
        <div
          className={cn(
            'fixed inset-0 z-50 md:hidden transition-opacity duration-300',
            isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sidebar Panel */}
          <aside
            className={cn(
              'absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white dark:bg-gray-800 shadow-2xl transition-transform duration-300 flex flex-col',
              isMobileOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
