'use client';

import { useState } from 'react';
import { Star, Loader2, CheckCircle2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PledgeStatusBadge from '@/components/pledge/PledgeStatusBadge';
import ProofGallery from '@/components/pledge/ProofGallery';
import type { PledgeAlbum } from '@/types';

interface PledgeReviewDialogProps {
  pledge: PledgeAlbum | null;
  userId: string;
  open: boolean;
  onClose: () => void;
  onGraded: (pledgeId: string, points: number) => void;
  onStatusChanged?: (pledgeId: string, newStatus: string) => void;
}

export default function PledgeReviewDialog({
  pledge,
  userId,
  open,
  onClose,
  onGraded,
  onStatusChanged,
}: PledgeReviewDialogProps) {
  const [points, setPoints] = useState('');
  const [grading, setGrading] = useState(false);
  const [markingReview, setMarkingReview] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  if (!pledge) return null;

  const proofs = pledge.proofs || [];
  const isSubmitted = pledge.status === 'submitted';
  const isReviewing = pledge.status === 'reviewing';
  const isGraded = pledge.status === 'graded';
  const canGrade = isSubmitted || isReviewing;

  const handleMarkReviewing = async () => {
    setMarkingReview(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/pledges/${userId}/${pledge.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'reviewing' }),
      });
      const data = await res.json();

      if (data.success) {
        onStatusChanged?.(pledge.id, 'reviewing');
      } else {
        setError(data.error || 'Failed to update status');
      }
    } catch {
      setError('Failed to update status');
    } finally {
      setMarkingReview(false);
    }
  };

  const handleGrade = async () => {
    const pointsNum = parseInt(points);
    if (!pointsNum || pointsNum < 1 || pointsNum > 50) {
      setError('Points must be between 1 and 50');
      return;
    }

    setGrading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/pledges/${userId}/${pledge.id}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: pointsNum }),
      });
      const data = await res.json();

      if (data.success) {
        onGraded(pledge.id, pointsNum);
        setPoints('');
        setShowConfirm(false);
        onClose();
      } else {
        setError(data.error || 'Failed to grade pledge');
      }
    } catch {
      setError('Failed to grade pledge');
    } finally {
      setGrading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { onClose(); setPoints(''); setError(''); setShowConfirm(false); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{pledge.title}</DialogTitle>
          {pledge.description && (
            <DialogDescription>{pledge.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Status & Info */}
          <div className="flex items-center gap-3 flex-wrap">
            <PledgeStatusBadge status={pledge.status} pointsAwarded={pledge.points_awarded} />
            <span className="text-xs text-gray-400">
              Created {new Date(pledge.created_at).toLocaleDateString()}
            </span>
            {pledge.submitted_at && (
              <span className="text-xs text-gray-400">
                Submitted {new Date(pledge.submitted_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {/* Proofs */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Proof Documents ({proofs.length})
            </h3>
            <ProofGallery proofs={proofs} readOnly />
          </div>

          {/* Completed info */}
          {isGraded && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-700 dark:text-green-400">
                  Completed: {pledge.points_awarded} points awarded
                </span>
              </div>
              {pledge.graded_at && (
                <p className="text-xs text-green-600/70 mt-1 ml-7">
                  on {new Date(pledge.graded_at).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Mark as Reviewing button — only for submitted */}
          {isSubmitted && !showConfirm && (
            <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
              <p className="text-sm text-purple-700 dark:text-purple-400 mb-3">
                Mark this pledge as &quot;Reviewing&quot; to let the user know you&apos;re looking at it. This will prevent them from cancelling or editing.
              </p>
              <Button
                onClick={handleMarkReviewing}
                disabled={markingReview}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {markingReview ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-1.5" />
                )}
                Mark as Reviewing
              </Button>
            </div>
          )}

          {/* Grading controls — for submitted or reviewing */}
          {canGrade && !showConfirm && (
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Award Points (1 - 50)
              </label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={1}
                  max={50}
                  placeholder="Enter points..."
                  value={points}
                  onChange={e => { setPoints(e.target.value); setError(''); }}
                  className="w-32"
                />
                <Button
                  onClick={() => {
                    const p = parseInt(points);
                    if (!p || p < 1 || p > 50) {
                      setError('Points must be between 1 and 50');
                      return;
                    }
                    setShowConfirm(true);
                  }}
                  disabled={!points}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Star className="w-4 h-4 mr-1.5" />
                  Give Points
                </Button>
              </div>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}

          {/* Confirmation */}
          {canGrade && showConfirm && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-3">
                Award <strong>{points} points</strong> to this pledge? This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirm(false)}
                  disabled={grading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleGrade}
                  disabled={grading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {grading ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Star className="w-4 h-4 mr-1.5" />
                  )}
                  Confirm
                </Button>
              </div>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
