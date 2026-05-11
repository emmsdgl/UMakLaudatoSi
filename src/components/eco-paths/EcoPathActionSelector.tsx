'use client';

import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EcoPathBadge from './EcoPathBadge';
import type { EcoPath, EcoPathId } from '@/types';

interface EcoPathActionSelectorProps {
  path: EcoPath | null;
  /** Action titles the user already has as un-deleted pledges on this path. */
  existingActionTitles?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pathId: EcoPathId, selectedActions: string[]) => Promise<void>;
}

export default function EcoPathActionSelector({
  path,
  existingActionTitles = [],
  open,
  onOpenChange,
  onConfirm,
}: EcoPathActionSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  if (!path) return null;

  const existingSet = new Set(existingActionTitles);
  const availableActions = path.suggested_actions.filter(a => !existingSet.has(a));
  const allSelected =
    availableActions.length > 0 && selected.size === availableActions.length;
  const noneAvailable = availableActions.length === 0;

  const toggleAction = (action: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(action)) {
        next.delete(action);
      } else {
        next.add(action);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(availableActions));
    }
  };

  const handleConfirm = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(path.id, Array.from(selected));
      setSelected(new Set());
      onOpenChange(false);
    } catch {
      // error handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelected(new Set());
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <EcoPathBadge pathId={path.id} size="md" />
          </div>
          <DialogTitle>Choose Your Pledges</DialogTitle>
          <DialogDescription>
            Select which actions you want to commit to. Each one becomes a separate pledge
            album — all free, you just upload photo proof to earn points.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {path.suggested_actions.map((action, i) => {
            const alreadyPledged = existingSet.has(action);
            const isChecked = selected.has(action);
            return (
              <label
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  alreadyPledged
                    ? 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900 cursor-not-allowed opacity-70'
                    : isChecked
                    ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 cursor-pointer'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer'
                }`}
              >
                <Checkbox
                  checked={alreadyPledged ? true : isChecked}
                  disabled={alreadyPledged}
                  onCheckedChange={() => !alreadyPledged && toggleAction(action)}
                  className="mt-0.5"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                  {action}
                </span>
                {alreadyPledged && (
                  <span className="text-[10px] uppercase font-semibold tracking-wide px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 mt-0.5">
                    Already pledged
                  </span>
                )}
              </label>
            );
          })}
          {noneAvailable && (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-4">
              You&apos;ve already pledged every action on this path. Complete or delete some
              to free up slots.
            </p>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              onClick={toggleAll}
              disabled={noneAvailable}
              className="text-xs text-green-600 dark:text-green-400 hover:underline disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected.size} of {availableActions.length} available
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0 || submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              Create {selected.size} Pledge{selected.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
