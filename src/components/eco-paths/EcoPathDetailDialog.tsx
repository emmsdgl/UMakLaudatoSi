'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import EcoPathBadge from './EcoPathBadge';
import type { EcoPath, EcoPathId } from '@/types';

interface EcoPathDetailDialogProps {
  path: EcoPath | null;
  isActive: boolean;
  isLocked: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (pathId: EcoPathId) => Promise<void>;
}

export default function EcoPathDetailDialog({
  path,
  isActive,
  isLocked,
  open,
  onOpenChange,
  onSelect,
}: EcoPathDetailDialogProps) {
  const [selecting, setSelecting] = useState(false);

  if (!path) return null;

  const handleSelect = async () => {
    setSelecting(true);
    try {
      await onSelect(path.id);
      onOpenChange(false);
    } catch {
      // error handled in parent
    } finally {
      setSelecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <EcoPathBadge pathId={path.id} size="md" />
            {isActive && (
              <span className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active
              </span>
            )}
          </div>
          <DialogTitle className="text-lg">{path.name}</DialogTitle>
          <DialogDescription>{path.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Suggested actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Suggested Actions
            </h3>
            <div className="space-y-2">
              {path.suggested_actions.map((action, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800"
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{action}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Select button */}
          {isActive ? (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                This is your current eco-path
              </p>
            </div>
          ) : isLocked ? (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Complete your current eco-path pledges before switching
              </p>
            </div>
          ) : (
            <Button
              onClick={handleSelect}
              disabled={selecting}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-11"
            >
              {selecting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              Choose This Path
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
