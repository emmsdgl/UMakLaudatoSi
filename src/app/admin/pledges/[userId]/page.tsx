'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, BookOpen, Loader2, ImageIcon, FileText, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PledgeStatusBadge from '@/components/pledge/PledgeStatusBadge';
import PledgeReviewDialog from '@/components/admin/PledgeReviewDialog';
import type { PledgeAlbum, PledgeAlbumStatus } from '@/types';

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  total_points: number;
}

const STATUS_FILTERS: { value: PledgeAlbumStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'graded', label: 'Completed' },
];

export default function AdminUserPledgesPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<UserInfo | null>(null);
  const [pledges, setPledges] = useState<PledgeAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPledge, setSelectedPledge] = useState<PledgeAlbum | null>(null);
  const [statusFilter, setStatusFilter] = useState<PledgeAlbumStatus | 'all'>('all');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/pledges/${userId}`);
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setPledges(data.pledges);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredPledges = useMemo(() => {
    if (statusFilter === 'all') return pledges;
    return pledges.filter(p => p.status === statusFilter);
  }, [pledges, statusFilter]);

  const handleGraded = (pledgeId: string, points: number) => {
    setPledges(prev =>
      prev.map(p =>
        p.id === pledgeId
          ? { ...p, status: 'graded' as const, points_awarded: points, graded_at: new Date().toISOString() }
          : p
      )
    );
    setSelectedPledge(null);
  };

  const handleStatusChanged = (pledgeId: string, newStatus: string) => {
    setPledges(prev =>
      prev.map(p =>
        p.id === pledgeId
          ? { ...p, status: newStatus as PledgeAlbumStatus }
          : p
      )
    );
    // Update the selected pledge too so the dialog reflects the change
    setSelectedPledge(prev =>
      prev && prev.id === pledgeId
        ? { ...prev, status: newStatus as PledgeAlbumStatus }
        : prev
    );
  };

  // Count pledges per status
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: pledges.length };
    for (const p of pledges) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [pledges]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => router.push('/admin/pledges')}
        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-green-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      {/* User header */}
      {user && (
        <div className="flex items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <img
            src={user.avatar_url || '/default-avatar.png'}
            alt={user.name}
            className="w-12 h-12 rounded-full border-2 border-green-200"
          />
          <div>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white">{user.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm font-bold text-green-600">{user.total_points} pts</p>
            <p className="text-xs text-gray-400">{pledges.length} pledges</p>
          </div>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        {STATUS_FILTERS.map(filter => {
          const count = statusCounts[filter.value] || 0;
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Pledge grid */}
      {filteredPledges.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            {statusFilter === 'all' ? 'This user has no pledges' : `No ${STATUS_FILTERS.find(f => f.value === statusFilter)?.label.toLowerCase()} pledges`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredPledges.map(pledge => {
            const proofs = pledge.proofs || [];
            const imageProofs = proofs.filter(p => p.file_type.startsWith('image/'));
            const pdfProofs = proofs.filter(p => p.file_type === 'application/pdf');
            const isSubmitted = pledge.status === 'submitted';
            const isReviewing = pledge.status === 'reviewing';

            return (
              <Card
                key={pledge.id}
                className={`group cursor-pointer border-0 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
                  isSubmitted ? 'ring-2 ring-blue-400 dark:ring-blue-500' : ''
                } ${
                  isReviewing ? 'ring-2 ring-purple-400 dark:ring-purple-500' : ''
                }`}
                onClick={() => setSelectedPledge(pledge)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {imageProofs.length > 0 ? (
                    <div className={`grid h-full ${imageProofs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {imageProofs.slice(0, 4).map(proof => (
                        <div key={proof.id} className="relative overflow-hidden">
                          <img
                            src={proof.file_url}
                            alt={proof.file_name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon className="w-8 h-8" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm text-gray-800 dark:text-white truncate mb-1.5">
                    {pledge.title}
                  </h3>
                  <div className="flex items-center justify-between gap-2">
                    <PledgeStatusBadge status={pledge.status} pointsAwarded={pledge.points_awarded} />
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      {imageProofs.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <ImageIcon className="w-3 h-3" /> {imageProofs.length}
                        </span>
                      )}
                      {pdfProofs.length > 0 && (
                        <span className="flex items-center gap-0.5">
                          <FileText className="w-3 h-3" /> {pdfProofs.length}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Review Dialog */}
      <PledgeReviewDialog
        pledge={selectedPledge}
        userId={userId}
        open={!!selectedPledge}
        onClose={() => setSelectedPledge(null)}
        onGraded={handleGraded}
        onStatusChanged={handleStatusChanged}
      />
    </div>
  );
}
