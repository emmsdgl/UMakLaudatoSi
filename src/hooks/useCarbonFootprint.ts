'use client';

import { useState, useEffect, useCallback } from 'react';
import type { CarbonFootprintResult, EcoPathId } from '@/types';

interface CarbonFootprintSummary {
  has_result: boolean;
  result?: CarbonFootprintResult;
  active_eco_path?: EcoPathId | null;
  top_categories?: { path_id: EcoPathId; co2: number }[];
  can_retake?: boolean;
}

export function useCarbonFootprint() {
  const [summary, setSummary] = useState<CarbonFootprintSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/carbon-footprint');
      const data = await res.json();
      if (data.success) {
        setSummary(data);
      } else {
        setError(data.error || 'Failed to fetch carbon footprint');
      }
    } catch {
      setError('Failed to fetch carbon footprint');
    } finally {
      setLoading(false);
    }
  }, []);

  const submitCalculator = useCallback(async (answers: number[]) => {
    const res = await fetch('/api/carbon-footprint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to submit calculator');
    }
    // Update local state with new result
    setSummary({
      has_result: true,
      result: data.result,
      active_eco_path: summary?.active_eco_path || null,
      top_categories: data.top_categories,
    });
    return data;
  }, [summary?.active_eco_path]);

  const selectEcoPath = useCallback(async (pathId: EcoPathId) => {
    const res = await fetch('/api/eco-paths/select', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eco_path_id: pathId }),
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to select eco-path');
    }
    // Update local state
    setSummary(prev => prev ? { ...prev, active_eco_path: pathId } : prev);
    return data;
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    loading,
    error,
    submitCalculator,
    selectEcoPath,
    refetch: fetchSummary,
  };
}
