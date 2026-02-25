'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Wallet, Banknote, Upload, ImageIcon, Loader2, CheckCircle2, Clock } from 'lucide-react';

interface CanteenAdmin {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  wallet_balance: number;
}

interface Payout {
  id: string;
  amount: number;
  gcash_reference?: string;
  proof_image_url?: string;
  status: string;
  notes?: string;
  created_at: string;
  canteen_admin?: { name: string; email: string; avatar_url?: string };
  admin?: { name: string; email: string };
}

export default function PayoutsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<CanteenAdmin[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalOutstanding, setTotalOutstanding] = useState(0);

  // Payout dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<CanteenAdmin | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [gcashRef, setGcashRef] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Proof view dialog
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [adminsRes, payoutsRes] = await Promise.all([
        fetch('/api/admin/wallet'),
        fetch('/api/admin/wallet/payout'),
      ]);

      const adminsData = await adminsRes.json();
      const payoutsData = await payoutsRes.json();

      if (adminsData.success) {
        setAdmins(adminsData.canteen_admins || []);
        setTotalOutstanding(adminsData.total_outstanding || 0);
      }
      if (payoutsData.success) {
        setPayouts(payoutsData.payouts || []);
      }
    } catch (error) {
      console.error('Failed to fetch payouts data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPayoutDialog = (admin: CanteenAdmin) => {
    setSelectedAdmin(admin);
    setPayoutAmount(String(admin.wallet_balance));
    setGcashRef('');
    setProofUrl('');
    setPayoutNotes('');
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success && data.url) {
        setProofUrl(data.url);
        toast({ title: 'Proof uploaded', description: 'Image uploaded successfully' });
      } else {
        toast({ title: 'Upload failed', description: data.message || 'Failed to upload', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Upload error', description: 'Failed to upload image', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPayout = async () => {
    if (!selectedAdmin) return;

    const amount = parseInt(payoutAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid payout amount', variant: 'destructive' });
      return;
    }
    if (amount > selectedAdmin.wallet_balance) {
      toast({ title: 'Exceeds balance', description: `Amount cannot exceed ${selectedAdmin.wallet_balance} pts`, variant: 'destructive' });
      return;
    }
    if (!gcashRef.trim()) {
      toast({ title: 'GCash reference required', description: 'Enter the GCash transaction reference number', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/wallet/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canteen_admin_id: selectedAdmin.id,
          amount,
          gcash_reference: gcashRef.trim(),
          proof_image_url: proofUrl || undefined,
          notes: payoutNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Payout Completed',
          description: `${amount} pts paid out to ${selectedAdmin.name}`,
        });
        setDialogOpen(false);
        fetchData();
      } else {
        toast({ title: 'Payout Failed', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to process payout', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Canteen Payouts</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage canteen admin wallet payouts via GCash</p>
        </div>
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-base px-4 py-2">
          <Wallet className="w-4 h-4 mr-2" />
          Total Outstanding: {totalOutstanding} pts
        </Badge>
      </div>

      <Tabs defaultValue="balances" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="balances">Balances ({admins.length})</TabsTrigger>
          <TabsTrigger value="history">Payout History ({payouts.length})</TabsTrigger>
        </TabsList>

        {/* Canteen Admin Balances */}
        <TabsContent value="balances" className="mt-4">
          {admins.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No canteen admins found</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canteen Admin</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map(admin => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={admin.avatar_url || undefined} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {admin.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{admin.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">{admin.email}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={admin.wallet_balance > 0 ? 'default' : 'secondary'}
                          className={admin.wallet_balance > 0
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : ''
                          }
                        >
                          {admin.wallet_balance} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => openPayoutDialog(admin)}
                          disabled={admin.wallet_balance <= 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Banknote className="w-4 h-4 mr-1" />
                          Pay Out
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Payout History */}
        <TabsContent value="history" className="mt-4">
          {payouts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No payouts yet</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Canteen Admin</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>GCash Ref</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.map(payout => (
                    <TableRow key={payout.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={payout.canteen_admin?.avatar_url || undefined} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {payout.canteen_admin?.name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{payout.canteen_admin?.name || 'Unknown'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {payout.amount} pts
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                        {payout.gcash_reference || '-'}
                      </TableCell>
                      <TableCell>
                        {payout.proof_image_url ? (
                          <button
                            onClick={() => setProofViewUrl(payout.proof_image_url!)}
                            className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 dark:text-green-400"
                          >
                            <ImageIcon className="w-4 h-4" />
                            View
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(payout.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          payout.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }>
                          {payout.status === 'completed' ? (
                            <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                          ) : payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Payout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payout</DialogTitle>
            <DialogDescription>
              Pay out wallet balance to {selectedAdmin?.name} via GCash
            </DialogDescription>
          </DialogHeader>

          {selectedAdmin && (
            <div className="space-y-4">
              {/* Admin Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedAdmin.avatar_url || undefined} />
                  <AvatarFallback className="bg-green-100 text-green-700">
                    {selectedAdmin.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedAdmin.name}</p>
                  <p className="text-sm text-gray-500">{selectedAdmin.email}</p>
                </div>
                <Badge className="ml-auto bg-emerald-100 text-emerald-700">
                  {selectedAdmin.wallet_balance} pts
                </Badge>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (pts)</Label>
                <Input
                  type="number"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  min={1}
                  max={selectedAdmin.wallet_balance}
                  placeholder={`Max: ${selectedAdmin.wallet_balance}`}
                />
              </div>

              {/* GCash Reference */}
              <div className="space-y-2">
                <Label>GCash Reference Number *</Label>
                <Input
                  value={gcashRef}
                  onChange={e => setGcashRef(e.target.value)}
                  placeholder="e.g. 1234567890"
                />
              </div>

              {/* Proof Image */}
              <div className="space-y-2">
                <Label>GCash Proof Screenshot</Label>
                {proofUrl ? (
                  <div className="relative">
                    <img src={proofUrl} alt="Proof" className="w-full h-32 object-cover rounded-lg" />
                    <Button
                      size="sm"
                      variant="secondary"
                      className="absolute top-2 right-2"
                      onClick={() => setProofUrl('')}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center text-gray-500 hover:border-green-400 transition-colors">
                      {uploading ? (
                        <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 mx-auto mb-1" />
                          <p className="text-sm">Click to upload proof</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitPayout}
              disabled={submitting || uploading}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Banknote className="w-4 h-4 mr-2" /> Confirm Payout</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof View Dialog */}
      <Dialog open={!!proofViewUrl} onOpenChange={() => setProofViewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>GCash Proof</DialogTitle>
          </DialogHeader>
          {proofViewUrl && (
            <img src={proofViewUrl} alt="GCash payment proof" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
