'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  Edit3,
  Trash2,
  Loader2,
  Star,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import PledgeStatusBadge from '@/components/pledge/PledgeStatusBadge';
import ProofUpload from '@/components/pledge/ProofUpload';
import ProofGallery from '@/components/pledge/ProofGallery';
import type { PledgeAlbum, PledgeProof } from '@/types';

export default function PledgeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const pledgeId = params.id as string;

  const [pledge, setPledge] = useState<PledgeAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchPledge = useCallback(async () => {
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`);
      const data = await res.json();
      if (data.success) {
        setPledge(data.pledge);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [pledgeId]);

  useEffect(() => {
    fetchPledge();
  }, [fetchPledge]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      });
      const data = await res.json();
      if (data.success) {
        setPledge(data.pledge);
        setShowSubmitConfirm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'draft' }),
      });
      const data = await res.json();
      if (data.success) setPledge(data.pledge);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/pledges/${pledgeId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        router.push('/pledges');
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleProofUploaded = (proof: PledgeProof) => {
    setPledge(prev => prev ? { ...prev, proofs: [...(prev.proofs || []), proof] } : prev);
  };

  const handleProofDelete = async (proofId: string) => {
    const res = await fetch(`/api/pledges/${pledgeId}/proofs/${proofId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setPledge(prev => prev ? {
        ...prev,
        proofs: (prev.proofs || []).filter(p => p.id !== proofId),
      } : prev);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  if (!pledge) {
    return (
      <div className="p-4 sm:p-6 text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Pledge not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/pledges')}>
          Back to Pledges
        </Button>
      </div>
    );
  }

  const proofs = pledge.proofs || [];
  const isGraded = pledge.status === 'graded';
  const isDraft = pledge.status === 'draft';
  const isSubmitted = pledge.status === 'submitted';
  const isReviewing = pledge.status === 'reviewing';

  return (
    <div className="p-4 sm:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/pledges')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Pledges
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white mb-1">
              {pledge.title}
            </h1>
            {pledge.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                {pledge.description}
              </p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <PledgeStatusBadge status={pledge.status} pointsAwarded={pledge.points_awarded} />
              <span className="text-xs text-gray-400 dark:text-gray-500">
                Created {new Date(pledge.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Delete button — only for drafts */}
          {isDraft && (
            <Button
              variant="outline"
              size="icon"
              className="text-red-500 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Graded banner */}
      {isGraded && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <Star className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-700 dark:text-green-400">
                Points Awarded: {pledge.points_awarded}/50
              </p>
              <p className="text-xs text-green-600/70 dark:text-green-500/70">
                Graded on {pledge.graded_at ? new Date(pledge.graded_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submitted banner */}
      {isSubmitted && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                Awaiting admin review
              </p>
              <p className="text-xs text-blue-600/70 dark:text-blue-500/70">
                You can cancel and add more proof before it&apos;s reviewed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reviewing banner */}
      {isReviewing && (
        <div className="mb-6 p-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                Your pledge is being reviewed
              </p>
              <p className="text-xs text-purple-600/70 dark:text-purple-500/70">
                An admin is currently reviewing your pledge. You cannot edit it at this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Proof Gallery */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Proof Documents ({proofs.length})
        </h2>
        <ProofGallery
          proofs={proofs}
          onDelete={isDraft ? handleProofDelete : undefined}
          readOnly={!isDraft}
        />
      </div>

      {/* Upload zone — only shown for draft pledges */}
      {isDraft && (
        <div className="mb-6">
          <ProofUpload
            pledgeId={pledgeId}
            onUploadComplete={handleProofUploaded}
          />
        </div>
      )}

      {/* Action buttons */}
      {!isGraded && !isReviewing && (
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {isDraft && (
            <Button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={proofs.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit for Points
            </Button>
          )}

          {isSubmitted && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Edit3 className="w-4 h-4 mr-1.5" />
              )}
              Cancel / Edit
            </Button>
          )}

          {isDraft && proofs.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Upload at least one proof to submit
            </p>
          )}
        </div>
      )}

      {/* Submit Confirmation */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit for Points?</DialogTitle>
            <DialogDescription>
              Your pledge with {proofs.length} proof{proofs.length !== 1 ? 's' : ''} will be sent to
              an admin for review. You can still cancel and add more proof later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Pledge?</DialogTitle>
            <DialogDescription>
              This will permanently delete this pledge and all uploaded proofs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
