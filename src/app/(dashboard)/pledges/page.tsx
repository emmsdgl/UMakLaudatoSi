'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BookOpen, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { usePledges } from '@/hooks/usePledges';
import PledgeCard from '@/components/pledge/PledgeCard';

export default function PledgesPage() {
  const router = useRouter();
  const { pledges, loading, createPledge } = usePledges();

  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      await createPledge(newTitle.trim(), newDescription.trim() || undefined);
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create pledge');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-green-600" />
            My Pledges
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create pledges and upload proof to earn points
          </p>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create Pledge
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : pledges.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
            No pledges yet
          </h3>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
            Create your first pledge and start uploading proof to earn points!
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Your First Pledge
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {pledges.map(pledge => (
            <PledgeCard
              key={pledge.id}
              pledge={pledge}
              onClick={() => router.push(`/pledges/${pledge.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create Pledge Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Pledge</DialogTitle>
            <DialogDescription>
              What are you pledging to do for the environment?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Title *
              </label>
              <Input
                placeholder="e.g. Plant a tree this week"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Description (optional)
              </label>
              <textarea
                placeholder="Describe your pledge in detail..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>

            {createError && (
              <p className="text-sm text-red-600 dark:text-red-400">{createError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={creating}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Pledge'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
