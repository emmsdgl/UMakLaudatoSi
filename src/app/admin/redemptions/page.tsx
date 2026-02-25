'use client';

/**
 * ============================================================================
 * ADMIN REDEMPTIONS / QR VERIFICATION PAGE
 * ============================================================================
 * Interface for Canteen Admin to verify reward redemptions via QR code.
 * Also allows manual lookup by redemption ID.
 * Now includes camera-based QR scanning!
 * ============================================================================
 */

import { useState, useEffect, useRef } from 'react';
import { QrCode, Search, CheckCircle2, XCircle, Clock, Gift, Camera, CameraOff, Shield, AlertTriangle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import QRScanner from '@/components/admin/QRScanner';

interface CanteenAdmin {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface Redemption {
  id: string;
  status: 'pending' | 'verified' | 'expired' | 'cancelled';
  created_at: string;
  verified_at?: string;
  expires_at?: string;
  redemption_code?: string;
  points_spent?: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
  reward: {
    id: string;
    name: string;
    category: string;
    point_cost: number;
  };
}

export default function AdminRedemptionsPage() {
  const { toast } = useToast();
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [lastVerified, setLastVerified] = useState<Redemption | null>(null);
  const [lastVerifiedSecure, setLastVerifiedSecure] = useState<boolean>(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [showScanner, setShowScanner] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Point allocation dialog state (for super_admin)
  const [allocDialogOpen, setAllocDialogOpen] = useState(false);
  const [allocCanteenAdmins, setAllocCanteenAdmins] = useState<CanteenAdmin[]>([]);
  const [allocRedemptionId, setAllocRedemptionId] = useState<string | null>(null);
  const [allocPoints, setAllocPoints] = useState(0);
  const [allocating, setAllocating] = useState(false);

  // Fetch redemptions list
  const fetchRedemptions = async (status: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/redemptions?status=${status}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setRedemptions(data.redemptions);
      }
    } catch (error) {
      console.error('Error fetching redemptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedemptions(statusFilter);
  }, [statusFilter]);

  // Focus input for scanner
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Verify redemption by QR code or ID
  const handleVerify = async (codeOrId: string) => {
    if (!codeOrId.trim()) return;

    setVerifying(true);
    setShowScanner(false); // Close scanner after scan
    try {
      const response = await fetch('/api/admin/redemptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: codeOrId.trim() }),
      });
      const data = await response.json();

      if (data.success) {
        const isSecure = data.securityValidated || false;
        setLastVerifiedSecure(isSecure);

        // Build description with points info
        let desc = `${data.redemption.reward} for ${data.redemption.user}`;
        if (isSecure) desc += ' (Secure QR)';
        if (data.points_awarded && data.points_awarded_to) {
          desc += ` • +${data.verification_points} pts to ${data.points_awarded_to}`;
        }

        toast({
          title: isSecure ? '✅ Verified & Secure!' : '✅ Verified',
          description: desc,
        });
        setLastVerified(data.redemption);
        setManualCode('');
        // Refresh list
        fetchRedemptions(statusFilter);

        // If super_admin needs to allocate points, open the dialog
        if (data.needs_point_allocation && data.canteen_admins?.length > 0) {
          setAllocCanteenAdmins(data.canteen_admins);
          setAllocRedemptionId(data.redemption.id);
          setAllocPoints(data.verification_points || 2);
          setAllocDialogOpen(true);
        }
      } else {
        // Check if it's a security error
        const isSecurityError = data.isSecurityError || false;
        toast({
          title: isSecurityError ? '🚨 Security Alert' : 'Verification Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify redemption',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
      inputRef.current?.focus();
    }
  };

  // Handle QR scan result
  const handleQRScan = (data: string) => {
    handleVerify(data);
  };

  // Handle Enter key for manual input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify(manualCode);
    }
  };

  // Handle point allocation to a canteen admin (super_admin flow)
  const handleAllocatePoints = async (canteenAdminId: string) => {
    if (!allocRedemptionId) return;
    setAllocating(true);
    try {
      const response = await fetch('/api/admin/redemptions/allocate-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          redemption_id: allocRedemptionId,
          canteen_admin_id: canteenAdminId,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Points Allocated',
          description: data.message,
        });
        setAllocDialogOpen(false);
      } else {
        toast({
          title: 'Allocation Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to allocate verification points',
        variant: 'destructive',
      });
    } finally {
      setAllocating(false);
    }
  };

  // Status badge colors
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    verified: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    expired: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock className="w-4 h-4" />,
    verified: <CheckCircle2 className="w-4 h-4" />,
    expired: <XCircle className="w-4 h-4" />,
    cancelled: <XCircle className="w-4 h-4" />,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Reward Verification
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Scan QR codes or enter codes manually to verify reward redemptions
        </p>
      </div>

      {/* Scanner Section */}
      <Card className="border-2 border-dashed border-green-300 dark:border-green-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-6 h-6 text-green-600" />
              QR Code Scanner
            </div>
            <Button
              variant={showScanner ? "destructive" : "default"}
              size="sm"
              onClick={() => setShowScanner(!showScanner)}
              className="gap-2"
            >
              {showScanner ? (
                <>
                  <CameraOff className="w-4 h-4" />
                  Close Camera
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4" />
                  Open Camera
                </>
              )}
            </Button>
          </CardTitle>
          <CardDescription>
            Scan a QR code using your camera or enter the code manually below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Camera QR Scanner */}
          {showScanner && (
            <div className="mb-6">
              <QRScanner
                onScan={handleQRScan}
                onClose={() => setShowScanner(false)}
                isOpen={showScanner}
              />
            </div>
          )}

          {/* Manual Input */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                ref={inputRef}
                placeholder="Scan or enter redemption code..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-12 h-14 text-lg"
                autoFocus
              />
            </div>
            <Button
              size="lg"
              className="h-14 px-8"
              onClick={() => handleVerify(manualCode)}
              disabled={verifying || !manualCode.trim()}
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </Button>
          </div>

          {/* Last Verified Display */}
          {lastVerified && (
            <div className={`mt-6 p-4 rounded-lg ${lastVerifiedSecure ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <div className="flex items-center gap-4">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Successfully Verified!
                    </p>
                    {lastVerifiedSecure && (
                      <Badge className="bg-green-600 text-white text-xs">
                        🔒 Secure QR
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {typeof lastVerified.reward === 'string' ? lastVerified.reward : lastVerified.reward.name} claimed by {typeof lastVerified.user === 'string' ? lastVerified.user : lastVerified.user.email || lastVerified.user.name}
                  </p>
                  {lastVerifiedSecure && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ QR signature verified • Timestamp validated • Tampering check passed
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Info Banner */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                🔒 Security Features Enabled
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400">
                All QR codes are cryptographically signed with HMAC-SHA256 and expire after 5 minutes. 
                The system automatically detects fake, tampered, or expired codes.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  ✓ Signature Validation
                </span>
                <span className="inline-flex items-center text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  ✓ Timestamp Check
                </span>
                <span className="inline-flex items-center text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  ✓ Tampering Detection
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redemptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            Redemption History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending
              </TabsTrigger>
              <TabsTrigger value="verified">
                Verified
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value={statusFilter}>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading...
                </div>
              ) : redemptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No {statusFilter} redemptions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Reward</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptions.map((redemption) => (
                      <TableRow key={redemption.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={redemption.user?.avatar_url} />
                              <AvatarFallback>
                                {redemption.user?.name?.[0] || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm text-gray-900 dark:text-white">
                                {redemption.user?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {redemption.user?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {redemption.reward?.name}
                            </p>
                            <p className="text-xs text-gray-500 capitalize">
                              {redemption.reward?.category}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {redemption.points_spent || redemption.reward?.point_cost} pts
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-gray-100">
                          {formatDate(redemption.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[redemption.status]} flex items-center gap-1 w-fit`}>
                            {statusIcons[redemption.status]}
                            {redemption.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {redemption.status === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleVerify(redemption.redemption_code || '')}
                            >
                              Verify
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Canteen Admin Point Allocation Dialog (Super Admin only) */}
      <Dialog open={allocDialogOpen} onOpenChange={setAllocDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Allocate Verification Points
            </DialogTitle>
            <DialogDescription>
              Which Canteen Admin verified this redemption? They will receive +{allocPoints} points.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {allocCanteenAdmins.map((admin) => (
              <button
                key={admin.id}
                onClick={() => handleAllocatePoints(admin.id)}
                disabled={allocating}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 transition-all disabled:opacity-50"
              >
                <Avatar className="w-10 h-10">
                  <AvatarImage src={admin.avatar_url || ''} />
                  <AvatarFallback className="bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                    {admin.name?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">
                    {admin.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {admin.email}
                  </p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  +{allocPoints} pts
                </Badge>
              </button>
            ))}
            {allocCanteenAdmins.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No canteen admin accounts found.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
