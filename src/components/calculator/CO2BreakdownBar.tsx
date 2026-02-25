'use client';

import { motion } from 'framer-motion';

interface CO2BreakdownBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  icon: React.ReactNode;
  delay?: number;
}

export default function CO2BreakdownBar({
  label,
  value,
  maxValue,
  color,
  icon,
  delay = 0,
}: CO2BreakdownBarProps) {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
            {label}
          </span>
          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 ml-2">
            {value} kg
          </span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${color}`}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
