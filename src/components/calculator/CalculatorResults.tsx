'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, RotateCcw, Car, Salad, Zap, Recycle, Droplets, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CO2BreakdownBar from './CO2BreakdownBar';
import type { CarbonFootprintResult, EcoPathId } from '@/types';
import { getEcoPath } from '@/lib/constants/eco-paths';

interface CalculatorResultsProps {
  result: CarbonFootprintResult;
  topCategories: { path_id: EcoPathId; co2: number }[];
  onChoosePath: () => void;
  onRetake: () => void;
  canRetake?: boolean;
}

const categoryConfig: Record<EcoPathId, { label: string; icon: React.ReactNode; barColor: string }> = {
  transportation: { label: 'Transportation', icon: <Car className="w-4 h-4 text-blue-500" />, barColor: 'bg-blue-500' },
  food: { label: 'Food & Diet', icon: <Salad className="w-4 h-4 text-green-500" />, barColor: 'bg-green-500' },
  energy: { label: 'Energy Use', icon: <Zap className="w-4 h-4 text-yellow-500" />, barColor: 'bg-yellow-500' },
  waste: { label: 'Waste', icon: <Recycle className="w-4 h-4 text-emerald-500" />, barColor: 'bg-emerald-500' },
  water: { label: 'Water', icon: <Droplets className="w-4 h-4 text-cyan-500" />, barColor: 'bg-cyan-500' },
};

function AnimatedCounter({ target, duration = 1.5 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <>{count}</>;
}

export default function CalculatorResults({
  result,
  topCategories,
  onChoosePath,
  onRetake,
  canRetake = true,
}: CalculatorResultsProps) {
  const total = Number(result.co2_total);
  const breakdown: { id: EcoPathId; value: number }[] = [
    { id: 'transportation', value: Number(result.co2_transportation) },
    { id: 'food', value: Number(result.co2_food) },
    { id: 'energy', value: Number(result.co2_energy) },
    { id: 'waste', value: Number(result.co2_waste) },
    { id: 'water', value: Number(result.co2_water) },
  ];
  const maxCategory = Math.max(...breakdown.map(b => b.value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Total CO2 */}
      <div className="text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Your estimated monthly footprint</p>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="text-5xl sm:text-6xl font-bold text-gray-800 dark:text-white">
            <AnimatedCounter target={total} />
          </span>
          <span className="text-lg text-gray-500 dark:text-gray-400 ml-2">kg CO2/month</span>
        </motion.div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          *Approximate estimate for directional guidance
        </p>
      </div>

      {/* Breakdown bars */}
      <Card className="border-0 shadow-md bg-white dark:bg-gray-800">
        <CardContent className="p-5 space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Breakdown by Category
          </h3>
          {breakdown.map((item, i) => {
            const config = categoryConfig[item.id];
            return (
              <CO2BreakdownBar
                key={item.id}
                label={config.label}
                value={item.value}
                maxValue={maxCategory}
                color={config.barColor}
                icon={config.icon}
                delay={0.3 + i * 0.1}
              />
            );
          })}
        </CardContent>
      </Card>

      {/* Top areas for improvement */}
      {topCategories.length > 0 && (
        <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
                Your Top Areas for Improvement
              </h3>
            </div>
            <div className="space-y-2">
              {topCategories.map((cat, i) => {
                const path = getEcoPath(cat.path_id);
                const config = categoryConfig[cat.path_id];
                return (
                  <div key={cat.path_id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-400 w-5">{i + 1}.</span>
                    <div className="flex items-center gap-2 flex-1">
                      {config.icon}
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {path?.name || config.label}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {cat.co2} kg/mo
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTAs */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={onChoosePath}
          className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
        >
          Choose Your Eco-Path
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <Button
          variant="outline"
          onClick={onRetake}
          disabled={!canRetake}
          className="w-full"
        >
          {canRetake ? (
            <>
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Quiz
            </>
          ) : (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Complete eco-path pledges to retake
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
