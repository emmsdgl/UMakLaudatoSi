'use client';

/**
 * ============================================================================
 * DONATIONS PAGE
 * ============================================================================
 * Allows users to donate via GCash to environmental campaigns.
 * Verified donations award pledge points based on amount tiers.
 * Supports both authenticated users and guest donors.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Heart, CreditCard, Users, Clock, Leaf } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Header } from '@/components/common/Header';

interface Campaign {
  id: string;
  title: string;
  description: string;
  goal_points?: number;
  current_points?: number;
  end_date?: string;
  accepts_gcash: boolean;
  gcash_number?: string;
  image_url?: string;
  stats?: {
    totalPoints: number;
    totalGcash: number;
    donorCount: number;
    progressPercent: number | null;
  };
}

/**
 * Donation amount → pledge points tiers
 */
const DONATION_TIERS = [
  { min: 20, max: 50, points: 3 },
  { min: 51, max: 80, points: 5 },
  { min: 81, max: 100, points: 8 },
  { min: 101, max: 150, points: 10 },
  { min: 151, max: 199, points: 15 },
  { min: 200, max: 299, points: 20 },
  { min: 300, max: Infinity, points: 30 },
];

function getPointsForAmount(amount: number): number {
  const tier = DONATION_TIERS.find(t => amount >= t.min && amount <= t.max);
  return tier?.points || 0;
}

export default function DonationsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [gcashDialog, setGcashDialog] = useState<{
    open: boolean;
    campaign: Campaign | null;
    amount: string;
    reference: string;
    donorName: string;
    donorEmail: string;
    message: string;
    isAnonymous: boolean;
  }>({
    open: false,
    campaign: null,
    amount: '',
    reference: '',
    donorName: '',
    donorEmail: '',
    message: '',
    isAnonymous: false,
  });

  const [donating, setDonating] = useState(false);

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/donations?include_stats=true');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Handle GCash donation
  const handleGcashDonation = async () => {
    if (!gcashDialog.campaign || !gcashDialog.amount || !gcashDialog.reference) return;

    const amount = parseFloat(gcashDialog.amount);
    if (amount < 20) {
      toast({
        title: 'Minimum Donation',
        description: 'The minimum donation amount is \u20b120.',
        variant: 'destructive',
      });
      return;
    }

    setDonating(true);
    try {
      const response = await fetch('/api/donations/gcash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: gcashDialog.campaign.id,
          amount: amount,
          gcash_reference: gcashDialog.reference,
          donor_name: gcashDialog.donorName || session?.user?.name,
          donor_email: gcashDialog.donorEmail || session?.user?.email,
          message: gcashDialog.message,
          is_anonymous: gcashDialog.isAnonymous,
          receipt_url: 'pending',
        }),
      });

      const data = await response.json();

      if (data.success) {
        const earnedPoints = getPointsForAmount(amount);
        toast({
          title: 'Donation Submitted!',
          description: `Your GCash donation is pending verification.${earnedPoints > 0 ? ` You'll earn ${earnedPoints} pledge points once verified.` : ''}`,
        });
        setGcashDialog({
          open: false,
          campaign: null,
          amount: '',
          reference: '',
          donorName: '',
          donorEmail: '',
          message: '',
          isAnonymous: false,
        });
      } else {
        toast({
          title: 'Submission Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit donation',
        variant: 'destructive',
      });
    } finally {
      setDonating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Live preview of points earned based on current amount input
  const previewPoints = gcashDialog.amount
    ? getPointsForAmount(parseFloat(gcashDialog.amount) || 0)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center justify-center gap-3">
            <Heart className="w-8 h-8 text-pink-500" />
            Donation Campaigns
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
            Support environmental initiatives at UMak. Donate via GCash and earn pledge points!
          </p>
        </div>

        {/* Points Tier Guide */}
        <Card className="mb-8 border-0 shadow-md bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-800 dark:text-green-300">
                Earn Pledge Points with Your Donation
              </h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DONATION_TIERS.map((tier) => (
                <div
                  key={tier.min}
                  className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center border border-green-200 dark:border-green-800"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tier.max === Infinity
                      ? `\u20b1${tier.min}+`
                      : `\u20b1${tier.min} - \u20b1${tier.max}`}
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {tier.points} pts
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center">
              Points are awarded after admin verification of your GCash donation.
            </p>
          </CardContent>
        </Card>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="h-48 rounded-t-lg" />
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-4 w-full mt-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No active campaigns at the moment</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                {/* Campaign Image */}
                <div className="h-48 bg-gradient-to-br from-pink-100 to-red-100 dark:from-pink-900/30 dark:to-red-900/30 flex items-center justify-center">
                  {campaign.image_url ? (
                    <img
                      src={campaign.image_url}
                      alt={campaign.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Heart className="w-20 h-20 text-pink-300" />
                  )}
                </div>

                <CardHeader>
                  <CardTitle>{campaign.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {campaign.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Progress (if goal exists) */}
                  {campaign.goal_points && campaign.stats && (
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Progress</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {campaign.stats.totalPoints.toLocaleString()} / {campaign.goal_points.toLocaleString()} pts
                        </span>
                      </div>
                      <Progress value={campaign.stats.progressPercent || 0} className="h-2" />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex gap-4 text-sm text-gray-500">
                    {campaign.stats && (
                      <>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {campaign.stats.donorCount} donors
                        </span>
                        {campaign.stats.totalGcash > 0 && (
                          <span className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4" />
                            ₱{campaign.stats.totalGcash.toLocaleString()}
                          </span>
                        )}
                      </>
                    )}
                    {campaign.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Until {formatDate(campaign.end_date)}
                      </span>
                    )}
                  </div>
                </CardContent>

                <CardFooter>
                  <Button
                    className="flex-1"
                    onClick={() =>
                      setGcashDialog({
                        open: true,
                        campaign,
                        amount: '',
                        reference: '',
                        donorName: '',
                        donorEmail: '',
                        message: '',
                        isAnonymous: false,
                      })
                    }
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Donate via GCash
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* GCash Donation Dialog */}
        <Dialog
          open={gcashDialog.open}
          onOpenChange={(open) =>
            setGcashDialog((prev) => ({ ...prev, open }))
          }
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>GCash Donation</DialogTitle>
              <DialogDescription>
                Donate to: {gcashDialog.campaign?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* GCash Number Display */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Send GCash to:</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {gcashDialog.campaign?.gcash_number || '0917-XXX-XXXX'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Laudato Si&apos; - UMak
                </p>
              </div>

              <div>
                <Label>Amount (PHP) — Minimum ₱20</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₱20)"
                  value={gcashDialog.amount}
                  onChange={(e) =>
                    setGcashDialog((prev) => ({ ...prev, amount: e.target.value }))
                  }
                  min={20}
                />
                {/* Live points preview */}
                {previewPoints > 0 && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                    <Leaf className="w-3 h-3" />
                    You&apos;ll earn <strong>{previewPoints} pledge points</strong> once verified
                  </p>
                )}
                {gcashDialog.amount && parseFloat(gcashDialog.amount) > 0 && parseFloat(gcashDialog.amount) < 20 && (
                  <p className="text-sm text-red-500 mt-1">
                    Minimum donation is ₱20
                  </p>
                )}
              </div>

              <div>
                <Label>GCash Reference Number</Label>
                <Input
                  placeholder="Enter reference number from receipt"
                  value={gcashDialog.reference}
                  onChange={(e) =>
                    setGcashDialog((prev) => ({ ...prev, reference: e.target.value }))
                  }
                />
              </div>

              {!session && (
                <>
                  <div>
                    <Label>Your Name</Label>
                    <Input
                      placeholder="Enter your name"
                      value={gcashDialog.donorName}
                      onChange={(e) =>
                        setGcashDialog((prev) => ({
                          ...prev,
                          donorName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Your Email</Label>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={gcashDialog.donorEmail}
                      onChange={(e) =>
                        setGcashDialog((prev) => ({
                          ...prev,
                          donorEmail: e.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Message (optional)</Label>
                <Textarea
                  placeholder="Leave a message..."
                  value={gcashDialog.message}
                  onChange={(e) =>
                    setGcashDialog((prev) => ({ ...prev, message: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={gcashDialog.isAnonymous}
                  onChange={(e) =>
                    setGcashDialog((prev) => ({
                      ...prev,
                      isAnonymous: e.target.checked,
                    }))
                  }
                  className="rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">Donate anonymously</span>
              </label>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() =>
                  setGcashDialog((prev) => ({ ...prev, open: false }))
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleGcashDonation}
                disabled={
                  donating ||
                  !gcashDialog.amount ||
                  parseFloat(gcashDialog.amount) < 20 ||
                  !gcashDialog.reference ||
                  (!session && (!gcashDialog.donorName || !gcashDialog.donorEmail))
                }
              >
                {donating ? 'Submitting...' : 'Submit Donation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
