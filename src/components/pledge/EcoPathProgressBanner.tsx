'use client';

import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import EcoPathBadge from '@/components/eco-paths/EcoPathBadge';
import type { EcoPathPledgeProgress, EcoPathId } from '@/types';

interface EcoPathProgressBannerProps {
  progress: EcoPathPledgeProgress;
}

export default function EcoPathProgressBanner({ progress }: EcoPathProgressBannerProps) {
  const router = useRouter();
  const percent = progress.total > 0 ? Math.round((progress.graded / progress.total) * 100) : 0;

  return (
    <div
      className={`p-4 rounded-xl border ${
        progress.all_graded
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <EcoPathBadge pathId={progress.eco_path_id as EcoPathId} size="sm" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Eco-Path Pledges
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-800 dark:text-white">
          {progress.graded}/{progress.total} graded
        </span>
      </div>

      <Progress value={percent} className="h-2 mb-2" />

      {progress.all_graded ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            All done! You can now choose a new eco-path.
          </p>
          <button
            onClick={() => router.push('/eco-paths')}
            className="text-xs text-green-600 dark:text-green-400 hover:underline flex items-center gap-1"
          >
            View Eco-Paths
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {progress.pending} pledge{progress.pending !== 1 ? 's' : ''} remaining — submit proof and get graded to unlock new eco-paths
        </p>
      )}
    </div>
  );
}
