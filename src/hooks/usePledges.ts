'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PledgeAlbum, PledgeProof, EcoPathId } from '@/types';

export function usePledges() {
  const [pledges, setPledges] = useState<PledgeAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPledges = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/pledges');
      const data = await res.json();
      if (data.success) {
        setPledges(data.pledges);
      } else {
        setError(data.error || 'Failed to fetch pledges');
      }
    } catch {
      setError('Failed to fetch pledges');
    } finally {
      setLoading(false);
    }
  }, []);

  const createPledge = useCallback(async (title: string, description?: string, eco_path_id?: EcoPathId) => {
    const res = await fetch('/api/pledges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, eco_path_id }),
    });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => [data.pledge, ...prev]);
      return data.pledge as PledgeAlbum;
    }
    throw new Error(data.error || 'Failed to create pledge');
  }, []);

  const createBatchPledges = useCallback(async (eco_path_id: EcoPathId, actions: string[]) => {
    const res = await fetch('/api/pledges/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eco_path_id, actions }),
    });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => [...data.pledges, ...prev]);
      return data.pledges as PledgeAlbum[];
    }
    throw new Error(data.error || 'Failed to create eco-path pledges');
  }, []);

  const submitPledge = useCallback(async (pledgeId: string) => {
    const res = await fetch(`/api/pledges/${pledgeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'submitted' }),
    });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => prev.map(p => p.id === pledgeId ? data.pledge : p));
      return data.pledge as PledgeAlbum;
    }
    throw new Error(data.error || 'Failed to submit pledge');
  }, []);

  const cancelSubmission = useCallback(async (pledgeId: string) => {
    const res = await fetch(`/api/pledges/${pledgeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'draft' }),
    });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => prev.map(p => p.id === pledgeId ? data.pledge : p));
      return data.pledge as PledgeAlbum;
    }
    throw new Error(data.error || 'Failed to cancel submission');
  }, []);

  const deletePledge = useCallback(async (pledgeId: string) => {
    const res = await fetch(`/api/pledges/${pledgeId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => prev.filter(p => p.id !== pledgeId));
      return true;
    }
    throw new Error(data.error || 'Failed to delete pledge');
  }, []);

  const uploadProof = useCallback(async (pledgeId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/pledges/${pledgeId}/proofs`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      const proof = data.proof as PledgeProof;
      setPledges(prev => prev.map(p => {
        if (p.id === pledgeId) {
          return { ...p, proofs: [...(p.proofs || []), proof] };
        }
        return p;
      }));
      return proof;
    }
    throw new Error(data.error || 'Failed to upload proof');
  }, []);

  const deleteProof = useCallback(async (pledgeId: string, proofId: string) => {
    const res = await fetch(`/api/pledges/${pledgeId}/proofs/${proofId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setPledges(prev => prev.map(p => {
        if (p.id === pledgeId) {
          return { ...p, proofs: (p.proofs || []).filter(pr => pr.id !== proofId) };
        }
        return p;
      }));
      return true;
    }
    throw new Error(data.error || 'Failed to delete proof');
  }, []);

  useEffect(() => {
    fetchPledges();
  }, [fetchPledges]);

  return {
    pledges,
    loading,
    error,
    createPledge,
    createBatchPledges,
    submitPledge,
    cancelSubmission,
    deletePledge,
    uploadProof,
    deleteProof,
    refetch: fetchPledges,
  };
}
