'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wallet, TrendingUp, ArrowDownCircle, Clock, ImageIcon } from 'lucide-react';

interface WalletTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  description?: string;
  created_at: string;
}

interface WalletPayoutData {
  id: string;
  amount: number;
  gcash_reference?: string;
  proof_image_url?: string;
  status: string;
  notes?: string;
  created_at: string;
  admin?: { name: string; email: string };
}

interface WalletData {
  wallet_balance: number;
  total_earned: number;
  total_paid_out: number;
  transactions: WalletTransaction[];
  payouts: WalletPayoutData[];
}

export default function CanteenAdminWallet() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofImage, setProofImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const res = await fetch('/api/wallet/canteen');
        const json = await res.json();
        if (json.success) {
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch wallet:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWallet();
  }, []);

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
      <div className="p-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-green-200 dark:bg-green-800 rounded-2xl" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        Failed to load wallet data
      </div>
    );
  }

  const earnings = data.transactions.filter(t => t.transaction_type === 'verification_earning');

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Wallet</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Verification earnings & payouts</p>
      </div>

      {/* Balance Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 text-white overflow-hidden">
        <CardContent className="p-6 relative">
          <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-5 h-5 text-white/80" />
              <span className="text-sm text-white/80">Current Balance</span>
            </div>
            <p className="text-4xl font-bold">{data.wallet_balance} pts</p>
            <div className="flex gap-6 mt-4">
              <div>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <TrendingUp className="w-3 h-3" />
                  Total Earned
                </div>
                <p className="text-lg font-semibold">{data.total_earned} pts</p>
              </div>
              <div>
                <div className="flex items-center gap-1 text-white/70 text-xs">
                  <ArrowDownCircle className="w-3 h-3" />
                  Total Paid Out
                </div>
                <p className="text-lg font-semibold">{data.total_paid_out} pts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="earnings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="earnings">
            Earnings ({earnings.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Payouts ({data.payouts.length})
          </TabsTrigger>
        </TabsList>

        {/* Earnings Tab */}
        <TabsContent value="earnings" className="space-y-3 mt-4">
          {earnings.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No earnings yet</p>
                <p className="text-sm">Verify reward redemptions to earn wallet points</p>
              </CardContent>
            </Card>
          ) : (
            earnings.map(tx => (
              <Card key={tx.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {tx.description || 'Verification earning'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(tx.created_at)}
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-semibold ml-3">
                    +{tx.amount} pts
                  </Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-3 mt-4">
          {data.payouts.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
                <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No payouts yet</p>
                <p className="text-sm">Your admin will process payouts via GCash</p>
              </CardContent>
            </Card>
          ) : (
            data.payouts.map(payout => (
              <Card key={payout.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-white">
                        Payout
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(payout.created_at)}
                      </div>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold ml-3">
                      -{payout.amount} pts
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {payout.gcash_reference && (
                      <span>GCash: {payout.gcash_reference}</span>
                    )}
                    {payout.admin?.name && (
                      <span>By: {payout.admin.name}</span>
                    )}
                    {payout.proof_image_url && (
                      <button
                        onClick={() => setProofImage(payout.proof_image_url!)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 dark:text-green-400"
                      >
                        <ImageIcon className="w-3 h-3" />
                        View Proof
                      </button>
                    )}
                  </div>
                  {payout.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{payout.notes}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Proof Image Dialog */}
      <Dialog open={!!proofImage} onOpenChange={() => setProofImage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>GCash Proof</DialogTitle>
          </DialogHeader>
          {proofImage && (
            <img
              src={proofImage}
              alt="GCash payment proof"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
