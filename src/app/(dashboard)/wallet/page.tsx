'use client';

/**
 * ============================================================================
 * WALLET PAGE - My Codes
 * ============================================================================
 * Stores valid QR codes for purchased rewards.
 * Features:
 * - Active redemption codes with QR display
 * - "Show this to canteen staff" instruction
 * - History of past redemptions
 * ============================================================================
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Wallet,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Copy,
  Check,
  History,
  Ticket,
  Gift
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import QRCode from 'react-qr-code';
import CanteenAdminWallet from '@/components/wallet/CanteenAdminWallet';

interface Redemption {
  id: string;
  redemption_code: string;
  points_spent: number;
  status: 'pending' | 'verified' | 'completed' | 'cancelled' | 'expired';
  expires_at: string | null;
  created_at: string;
  verified_at: string | null;
  reward: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string;
  };
}

export default function WalletPage() {
  const { data: session } = useSession();

  // Canteen admins see their own wallet (earnings + payouts)
  const userRole = (session?.user as any)?.role as string | undefined;
  if (userRole === 'canteen_admin') {
    return <CanteenAdminWallet />;
  }

  return <StudentWallet />;
}

function StudentWallet() {
  const { data: session } = useSession();
  const { toast } = useToast();

  // State
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState<string | null>(null);

  const toBase64Url = (input: string) => {
    // qrData is ASCII JSON today, but keep this UTF-8 safe.
    const utf8 = encodeURIComponent(input).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    const b64 = btoa(utf8);
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);

  /**
   * Fetch user's redemptions via API route (bypasses RLS)
   */
  const fetchRedemptions = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      const res = await fetch('/api/wallet');
      const json = await res.json();

      if (!json.success) throw new Error(json.message);

      setRedemptions(json.redemptions || []);
    } catch (error) {
      console.error('Error fetching redemptions:', error);
      toast({
        title: "Error",
        description: "Failed to load your redemptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.email, toast]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  /**
   * Open QR code dialog and generate secure QR
   */
  const openQRDialog = async (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setQrData(null);
    setQrValue(null);
    setQrError(null);
    setQrLoading(true);

    try {
      // Generate secure QR code from server
      const response = await fetch('/api/rewards/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId: redemption.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrData(data.qrData);
    } catch (error) {
      console.error('QR generation error:', error);
      setQrError(error instanceof Error ? error.message : 'Failed to generate QR code');
      toast({
        title: "QR Generation Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setQrLoading(false);
    }
  };

  // Prefer encoding a URL so scanning can open /scan and auto-verify for staff.
  useEffect(() => {
    if (!qrData) {
      setQrValue(null);
      return;
    }
    if (typeof window === 'undefined') {
      setQrValue(null);
      return;
    }
    const baseUrl = window.location.origin;
    const encoded = toBase64Url(qrData);
    setQrValue(`${baseUrl}/scan?qr=${encoded}`);
  }, [qrData]);

  /**
   * Copy redemption code to clipboard
   */
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({
        title: "Code copied!",
        description: "Show this code to the canteen staff",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
      });
    }
  };

  /**
   * Get status badge configuration
   */
  const getStatusBadge = (status: Redemption['status']) => {
    const config = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Ready to Use' },
      verified: { icon: CheckCircle2, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', label: 'Verified' },
      completed: { icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', label: 'Claimed' },
      cancelled: { icon: XCircle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', label: 'Cancelled' },
      expired: { icon: AlertCircle, color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400', label: 'Expired' },
    };
    return config[status] || config.pending;
  };

  /**
   * Format date for display
   */
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Check if redemption is still valid
   */
  const isValid = (redemption: Redemption) => {
    if (redemption.status !== 'pending') return false;
    if (!redemption.expires_at) return true;
    return new Date(redemption.expires_at) > new Date();
  };

  // Filter redemptions by status
  const activeRedemptions = redemptions.filter(r => isValid(r));
  const historyRedemptions = redemptions.filter(r => !isValid(r));

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-2xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Wallet className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">My Wallet</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Your redeemed rewards & codes
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Active ({activeRedemptions.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Active Codes Tab */}
        <TabsContent value="active" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeRedemptions.length === 0 ? (
            <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <Gift className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">No Active Codes</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Redeem rewards from the marketplace to get codes here
                </p>
                <Button
                  onClick={() => window.location.href = '/rewards'}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Browse Rewards
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeRedemptions.map((redemption) => {
                const StatusIcon = getStatusBadge(redemption.status).icon;
                return (
                  <Card 
                    key={redemption.id} 
                    className="border-0 shadow-md bg-white dark:bg-gray-800 overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => openQRDialog(redemption)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Reward Image/Icon */}
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {redemption.reward.image_url ? (
                            <img 
                              src={redemption.reward.image_url} 
                              alt={redemption.reward.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Gift className="w-8 h-8 text-green-600" />
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 dark:text-white truncate">
                            {redemption.reward.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusBadge(redemption.status).color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusBadge(redemption.status).label}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {redemption.expires_at 
                              ? `Expires: ${formatDate(redemption.expires_at)}`
                              : 'No expiration'}
                          </p>
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <QrCode className="w-5 h-5 text-green-600" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Instruction Banner */}
          {activeRedemptions.length > 0 && (
            <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      How to claim your reward
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Tap on a reward above to show your QR code. Present it to the canteen staff for verification.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardContent className="p-4">
                    <Skeleton className="h-16 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : historyRedemptions.length === 0 ? (
            <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">No History Yet</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Your past redemptions will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {historyRedemptions.map((redemption) => {
                const StatusIcon = getStatusBadge(redemption.status).icon;
                return (
                  <Card 
                    key={redemption.id} 
                    className="border-0 shadow-md bg-white dark:bg-gray-800 opacity-75"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Gift className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-700 dark:text-gray-300 truncate">
                            {redemption.reward.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className={getStatusBadge(redemption.status).color}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {getStatusBadge(redemption.status).label}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatDate(redemption.created_at)}
                            </span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          -{redemption.points_spent} pts
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedRedemption} onOpenChange={() => setSelectedRedemption(null)}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">Your Reward Code</DialogTitle>
            <DialogDescription className="text-center">
              Show this to the canteen staff
            </DialogDescription>
          </DialogHeader>

          {selectedRedemption && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center p-4 bg-white rounded-xl">
                {qrLoading ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                      <p className="mt-4 text-sm text-gray-500">Generating secure QR...</p>
                    </div>
                  </div>
                ) : qrError ? (
                  <div className="w-48 h-48 flex items-center justify-center bg-red-50 rounded-lg">
                    <div className="text-center p-4">
                      <p className="text-sm text-red-600">{qrError}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openQRDialog(selectedRedemption)}
                        className="mt-4"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : qrData ? (
                  <div className="relative">
                    <QRCode
                      value={qrValue || qrData}
                      size={192}
                      fgColor="#16a34a"
                      bgColor="#ffffff"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Reward Info */}
              <div className="text-center">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
                  {selectedRedemption.reward.name}
                </h3>
                {selectedRedemption.reward.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {selectedRedemption.reward.description}
                  </p>
                )}
              </div>

              {/* Code */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
                  Redemption Code
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
                    {selectedRedemption.redemption_code}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyCode(selectedRedemption.redemption_code)}
                  >
                    {copiedCode === selectedRedemption.redemption_code ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center space-y-2">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  📱 Show this QR code to claim your reward
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  The staff will scan and verify your code
                </p>
                {qrData && (
                  <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Secure QR • Valid for 5 minutes
                    </p>
                  </div>
                )}
              </div>

              {/* Expiry Warning */}
              {selectedRedemption.expires_at && (
                <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                  Valid until: {formatDate(selectedRedemption.expires_at)}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
