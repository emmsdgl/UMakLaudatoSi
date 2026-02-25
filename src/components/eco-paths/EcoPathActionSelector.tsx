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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (pathId: EcoPathId, selectedActions: string[]) => Promise<void>;
}

export default function EcoPathActionSelector({
  path,
  open,
  onOpenChange,
  onConfirm,
}: EcoPathActionSelectorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  if (!path) return null;

  const allSelected = selected.size === path.suggested_actions.length;

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
      setSelected(new Set(path.suggested_actions));
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
            Select which actions you want to commit to. Each one becomes a separate pledge album.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {path.suggested_actions.map((action, i) => (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selected.has(action)
                  ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Checkbox
                checked={selected.has(action)}
                onCheckedChange={() => toggleAction(action)}
                className="mt-0.5"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {action}
              </span>
            </label>
          ))}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-3 flex-1">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-green-600 dark:text-green-400 hover:underline"
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {selected.size} of {path.suggested_actions.length} selected
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
