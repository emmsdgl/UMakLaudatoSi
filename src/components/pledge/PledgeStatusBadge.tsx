'use client';

import { Clock, Send, Star, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PledgeAlbumStatus } from '@/types';

interface PledgeStatusBadgeProps {
  status: PledgeAlbumStatus;
  pointsAwarded?: number;
}

const statusConfig: Record<PledgeAlbumStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  draft: {
    label: 'Draft',
    variant: 'outline',
    className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    icon: Clock,
  },
  submitted: {
    label: 'Submitted',
    variant: 'outline',
    className: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    icon: Send,
  },
  reviewing: {
    label: 'Reviewing',
    variant: 'outline',
    className: 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    icon: Eye,
  },
  graded: {
    label: 'Completed',
    variant: 'outline',
    className: 'border-green-300 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400',
    icon: Star,
  },
};

export default function PledgeStatusBadge({ status, pointsAwarded }: PledgeStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
      {status === 'graded' && pointsAwarded !== undefined && (
        <span className="ml-1">- {pointsAwarded} pts</span>
      )}
    </Badge>
  );
}
