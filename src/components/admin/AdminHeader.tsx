'use client';

/**
 * ============================================================================
 * ADMIN HEADER COMPONENT
 * ============================================================================
 * Responsive top header bar for admin panel.
 * Shows user info, notifications, and quick actions.
 * Works across desktop, tablet, and mobile devices.
 * ============================================================================
 */

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { Bell, LogOut, Moon, Sun, Settings, Leaf, User, ChevronDown } from 'lucide-react';
import type { UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

interface AdminHeaderProps {
  user: {
    name: string;
    email: string;
    avatar?: string | null;
    role: UserRole;
  };
}

export default function AdminHeader({ user }: AdminHeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Get role display info
  const getRoleInfo = (role: UserRole | string) => {
    const roleMap: Record<string, { label: string; color: string }> = {
      canteen_admin: { label: 'Canteen', color: 'text-orange-600 dark:text-orange-400' },
      admin: { label: 'Admin', color: 'text-emerald-600 dark:text-emerald-400' },
      super_admin: { label: 'Super Admin', color: 'text-red-600 dark:text-red-400' },
    };
    return roleMap[role] || { label: role, color: 'text-gray-600 dark:text-gray-400' };
  };

  const roleInfo = getRoleInfo(user.role);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 z-40">
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 ml-0 md:ml-0">
          {/* Spacer for mobile menu button */}
          <div className="w-10 md:hidden" />
          
          <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-gray-900 dark:text-white text-sm md:text-base">
              Laudato Si&apos; Admin
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
              Eco-Pledge Management
            </p>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Theme Toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-xl"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </Button>
          )}

          {/* Notifications - Hidden on very small screens */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 relative rounded-xl hidden sm:flex"
          >
            <Bell className="w-5 h-5" />
            {/* Notification badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 px-2 md:px-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Avatar className="w-8 h-8 border-2 border-green-500/20">
                  <AvatarImage src={user.avatar || undefined} alt={user.name} />
                  <AvatarFallback className="bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 text-sm font-semibold">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                    {user.name}
                  </p>
                  <p className={cn('text-xs font-medium', roleInfo.color)}>
                    {roleInfo.label}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl shadow-xl">
              {/* User Info - Mobile */}
              <div className="px-3 py-3 md:hidden border-b border-gray-100 dark:border-gray-700">
                <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className={cn('text-xs font-medium mt-1', roleInfo.color)}>
                  {roleInfo.label}
                </p>
              </div>
              
              {/* Desktop user info */}
              <div className="px-3 py-2 text-sm text-gray-500 hidden md:block">
                <p className="truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator className="hidden md:block" />
              
              <DropdownMenuItem className="cursor-pointer rounded-lg mx-1">
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer rounded-lg mx-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20 rounded-lg mx-1"
                onClick={() => signOut({ callbackUrl: '/' })}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
