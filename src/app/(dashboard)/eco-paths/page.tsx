'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Leaf, ArrowRight, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import EcoPathCard from '@/components/eco-paths/EcoPathCard';
import EcoPathDetailDialog from '@/components/eco-paths/EcoPathDetailDialog';
import EcoPathActionSelector from '@/components/eco-paths/EcoPathActionSelector';
import { useCarbonFootprint } from '@/hooks/useCarbonFootprint';
import { useEcoPathProgress } from '@/hooks/useEcoPathProgress';
import { usePledges } from '@/hooks/usePledges';
import { ECO_PATHS } from '@/lib/constants/eco-paths';
import type { EcoPath, EcoPathId } from '@/types';
import { useToast } from '@/components/ui/use-toast';

export default function EcoPathsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { summary, loading, selectEcoPath } = useCarbonFootprint();
  const { progress, canSwitchPath, loading: progressLoading, refetch: refetchProgress } = useEcoPathProgress();
  const { createBatchPledges } = usePledges();

  const [selectedPath, setSelectedPath] = useState<EcoPath | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionSelectorOpen, setActionSelectorOpen] = useState(false);

  const activePathId = summary?.active_eco_path ?? null;

  const handleCardClick = (path: EcoPath) => {
    setSelectedPath(path);
    setDialogOpen(true);
  };

  // Step 1: User clicks "Choose This Path" in detail dialog → close it, open action selector
  const handleSelectPath = async (pathId: EcoPathId) => {
    // Close detail dialog, open action selector
    setDialogOpen(false);
    setActionSelectorOpen(true);
  };

  // Step 2: User confirms selected actions → select path + batch create pledges
  const handleConfirmActions = async (pathId: EcoPathId, selectedActions: string[]) => {
    // First select the eco-path
    await selectEcoPath(pathId);
    // Then batch-create the pledges
    await createBatchPledges(pathId, selectedActions);
    // Refresh progress state
    await refetchProgress();

    const pathName = ECO_PATHS.find(p => p.id === pathId)?.name;
    toast({
      title: 'Eco-path pledges created!',
      description: `Created ${selectedActions.length} pledge${selectedActions.length !== 1 ? 's' : ''} on the ${pathName} path.`,
    });
  };

  if (loading || progressLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
          Choose Your Eco-Path
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Focus on one area and create pledges to reduce your impact
        </p>
      </div>

      {/* Locked banner — shown when user has unfinished eco-path pledges */}
      {!canSwitchPath && progress && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {progress.graded}/{progress.total} pledges graded on {progress.eco_path_name}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Complete all eco-path pledges to unlock path switching
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push('/pledges')}
              className="text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 ml-auto flex-shrink-0"
            >
              View Pledges
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Carbon footprint summary banner */}
      {summary?.has_result && summary.result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                <Leaf className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Your Footprint: {Math.round(summary.result.co2_total)} kg CO₂/month
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Choose a path that targets your highest impact area
                </p>
              </div>
            </div>
            {canSwitchPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/calculator')}
                className="text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40"
              >
                Retake
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* No footprint yet banner */}
      {!summary?.has_result && canSwitchPath && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Take the Carbon Footprint Calculator first!
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Discover which eco-path fits you best
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/calculator')}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Take Quiz
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Top categories recommendation */}
      {summary?.top_categories && summary.top_categories.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Recommended for you (based on your highest impact areas):
          </p>
          <div className="flex flex-wrap gap-2">
            {summary.top_categories.map((cat) => {
              const path = ECO_PATHS.find(p => p.id === cat.path_id);
              if (!path) return null;
              return (
                <span
                  key={cat.path_id}
                  className="text-xs px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                >
                  {path.name} — {Math.round(cat.co2)} kg
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Eco-path grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ECO_PATHS.map((path, i) => (
          <motion.div
            key={path.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <EcoPathCard
              path={path}
              isActive={activePathId === path.id}
              onClick={() => handleCardClick(path)}
            />
          </motion.div>
        ))}
      </div>

      {/* Detail dialog (Step 1: view path details) */}
      <EcoPathDetailDialog
        path={selectedPath}
        isActive={selectedPath ? activePathId === selectedPath.id : false}
        isLocked={!canSwitchPath}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSelect={handleSelectPath}
      />

      {/* Action selector dialog (Step 2: pick pledges) */}
      <EcoPathActionSelector
        path={selectedPath}
        open={actionSelectorOpen}
        onOpenChange={setActionSelectorOpen}
        onConfirm={handleConfirmActions}
      />
    </div>
  );
}
