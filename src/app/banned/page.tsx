'use client';

/**
 * ============================================================================
 * BANNED USER PAGE
 * ============================================================================
 * A dedicated page shown to users who have been banned from the platform.
 * Displays the ban status and provides contact information for appeals.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Ban, Mail, Phone, AlertTriangle, LogOut, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface BanInfo {
  is_banned: boolean;
  ban_reason?: string;
  banned_at?: string;
}

export default function BannedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/check-ban');
        const data = await response.json();

        if (data.success) {
          setBanInfo(data.banInfo);
          
          // If user is not banned, redirect to home
          if (!data.banInfo?.is_banned) {
            router.push('/home');
          }
        }
      } catch (error) {
        console.error('Failed to check ban status:', error);
      } finally {
        setLoading(false);
      }
    };

    if (status === 'authenticated') {
      checkBanStatus();
    } else if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [session, status, router]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-red-200 dark:bg-red-800 rounded-full" />
          <div className="h-4 w-32 bg-red-200 dark:bg-red-800 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-red-200 dark:border-red-800 shadow-xl">
          <CardHeader className="text-center pb-4">
            {/* Ban Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto mb-4"
            >
              <div className="w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ShieldX className="w-12 h-12 text-red-600 dark:text-red-400" />
              </div>
            </motion.div>

            <CardTitle className="text-2xl font-bold text-red-700 dark:text-red-400">
              Account Suspended
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your account has been temporarily suspended from Laudato Si&apos;
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Warning Message */}
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">
                    Access Restricted
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    You are currently unable to access the platform features, earn points, or redeem rewards.
                  </p>
                </div>
              </div>
            </div>

            {/* Ban Reason */}
            {banInfo?.ban_reason && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reason for Suspension
                </h3>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {banInfo.ban_reason}
                  </p>
                </div>
              </div>
            )}

            {/* User Info */}
            {session?.user && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {session.user.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {session.user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Appeal Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Need Help?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                If you believe this is a mistake or would like to appeal this decision, please contact us at:
              </p>
              <div className="space-y-2">
                <a
                  href="mailto:umaklaudatosi@umak.edu.ph"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Mail className="w-4 h-4" />
                  umaklaudatosi@umak.edu.ph
                </a>
                {/* <a
                  href="tel:+63288817400"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Phone className="w-4 h-4" />
                  (02) 8881-7400
                </a> */}
              </div>
            </div>
          </CardContent>

          <CardFooter>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </CardFooter>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          © {new Date().getFullYear()} Laudato Si&apos; - UMak Eco Pledge
        </p>
      </motion.div>
    </div>
  );
}
