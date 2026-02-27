'use client';

import { Sprout } from 'lucide-react';

interface SeedStreakBadgeProps {
  streak: number;
  total?: number;
  className?: string;
  showTotal?: boolean;
}

export default function SeedStreakBadge({ streak, total, className = '', showTotal = false }: SeedStreakBadgeProps) {
  if (streak === 0 && !showTotal) return null;

  return (
    <div className={`inline-flex items-center gap-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      <Sprout className="w-4 h-4" />
      <span>{streak} {streak === 1 ? 'seed' : 'seeds'}</span>
      {showTotal && total !== undefined && (
        <span className="text-green-500 dark:text-green-500 text-xs">
          ({total} total)
        </span>
      )}
    </div>
  );
}
