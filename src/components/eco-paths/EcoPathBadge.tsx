'use client';

import { Car, Salad, Zap, Recycle, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { EcoPathId } from '@/types';
import { getEcoPath } from '@/lib/constants/eco-paths';

interface EcoPathBadgeProps {
  pathId: EcoPathId;
  size?: 'sm' | 'md';
}

const iconMap: Record<EcoPathId, React.ComponentType<{ className?: string }>> = {
  transportation: Car,
  food: Salad,
  energy: Zap,
  waste: Recycle,
  water: Droplets,
};

const colorMap: Record<EcoPathId, string> = {
  transportation: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  food: 'border-green-300 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400',
  energy: 'border-yellow-300 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400',
  waste: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  water: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-400',
};

export default function EcoPathBadge({ pathId, size = 'sm' }: EcoPathBadgeProps) {
  const path = getEcoPath(pathId);
  if (!path) return null;

  const Icon = iconMap[pathId];
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge variant="outline" className={colorMap[pathId]}>
      <Icon className={`${iconSize} mr-1`} />
      {path.name}
    </Badge>
  );
}
