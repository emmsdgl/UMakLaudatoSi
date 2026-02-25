'use client';

import { Car, Salad, Zap, Recycle, Droplets, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { EcoPath, EcoPathId } from '@/types';

interface EcoPathCardProps {
  path: EcoPath;
  isActive: boolean;
  onClick: () => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Car, Salad, Zap, Recycle, Droplets,
};

const colorConfig: Record<EcoPathId, {
  bg: string;
  iconBg: string;
  iconColor: string;
  ring: string;
}> = {
  transportation: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    iconColor: 'text-blue-600',
    ring: 'ring-blue-400',
  },
  food: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    iconBg: 'bg-green-100 dark:bg-green-900/40',
    iconColor: 'text-green-600',
    ring: 'ring-green-400',
  },
  energy: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    iconColor: 'text-yellow-600',
    ring: 'ring-yellow-400',
  },
  waste: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    iconColor: 'text-emerald-600',
    ring: 'ring-emerald-400',
  },
  water: {
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    iconColor: 'text-cyan-600',
    ring: 'ring-cyan-400',
  },
};

export default function EcoPathCard({ path, isActive, onClick }: EcoPathCardProps) {
  const Icon = iconMap[path.icon] || Car;
  const colors = colorConfig[path.id];

  return (
    <Card
      className={`cursor-pointer border-0 shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
        isActive ? `ring-2 ${colors.ring}` : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mb-3`}>
          <Icon className={`w-6 h-6 ${colors.iconColor}`} />
        </div>

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-800 dark:text-white mb-1">
              {path.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {path.description}
            </p>
          </div>
          {isActive && (
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
          )}
        </div>

        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
          {path.suggested_actions.length} suggested actions
        </p>
      </CardContent>
    </Card>
  );
}
