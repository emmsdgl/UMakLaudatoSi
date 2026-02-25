'use client';

/**
 * ============================================================================
 * DASHBOARD LAYOUT - Responsive Design with Ban Check
 * ============================================================================
 * Responsive PWA layout that works across all devices:
 * - Mobile: Bottom navigation bar
 * - Tablet/Desktop: Side navigation or centered content
 * Theme: Laudato Si (Green, Earth tones, clean, hopeful)
 * 
 * Now includes ban status check to redirect banned users.
 * ============================================================================
 */

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Gift, Trophy, User, Wallet, BookOpen, Calculator, QrCode } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * Navigation items configuration
 */
const defaultNavItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/calculator', label: 'Footprint', icon: Calculator },
  { href: '/pledges', label: 'Pledges', icon: BookOpen },
  { href: '/rewards', label: 'Rewards', icon: Gift },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/ranks', label: 'Ranks', icon: Trophy },
  { href: '/profile', label: 'Profile', icon: User },
];

/**
 * Canteen admins only see Dashboard, Verify Rewards, and Profile
 */
const canteenAdminNavItems = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/admin/redemptions', label: 'Verify', icon: QrCode },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [isBanned, setIsBanned] = useState(false);

  // Determine nav items based on user role
  const userRole = (session?.user as any)?.role as string | undefined;
  const navItems = userRole === 'canteen_admin' ? canteenAdminNavItems : defaultNavItems;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Redirect canteen_admin away from pages they shouldn't access
  useEffect(() => {
    if (userRole === 'canteen_admin' && pathname) {
      const allowedPaths = ['/home', '/profile', '/admin/redemptions', '/wallet'];
      const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
      if (!isAllowed) {
        router.replace('/home');
      }
    }
  }, [userRole, pathname, router]);

  // Check if user is banned
  useEffect(() => {
    const checkBanStatus = async () => {
      if (!session?.user?.email) return;

      try {
        const response = await fetch('/api/auth/check-ban');
        const data = await response.json();

        if (data.success && data.banInfo?.is_banned) {
          setIsBanned(true);
          router.push('/banned');
        }
      } catch (error) {
        console.error('Failed to check ban status:', error);
      }
    };

    if (status === 'authenticated') {
      checkBanStatus();
    }
  }, [session, status, router]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-200 dark:bg-green-800 rounded-full" />
          <div className="h-4 w-32 bg-green-200 dark:bg-green-800 rounded" />
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  // Don't render if user is banned (redirect will happen)
  if (isBanned) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      {/* Desktop/Tablet Side Navigation */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-col p-4 z-50">
        {/* Logo/Brand */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">🌱</span>
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-white">Laudato Si&apos;</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">UMak Eco Pledge</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/home' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left",
                  isActive 
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-semibold" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        {session?.user && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="flex items-center gap-3 px-3">
              <img
                src={session.user.image || '/default-avatar.png'}
                alt={session.user.name || 'User'}
                className="w-10 h-10 rounded-full border-2 border-green-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className={cn(
        "min-h-screen transition-all",
        "pb-20 lg:pb-6", // Bottom padding for mobile nav
        "lg:ml-64" // Left margin for desktop side nav
      )}>
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile/Tablet Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 safe-area-bottom">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/home' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200",
                    "active:scale-95 touch-manipulation",
                    isActive 
                      ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30" 
                      : "text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                  )}
                >
                  <Icon className={cn(
                    "w-6 h-6 transition-transform",
                    isActive && "scale-110"
                  )} />
                  <span className={cn(
                    "text-xs mt-1 font-medium",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
