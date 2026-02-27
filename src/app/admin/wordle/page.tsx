'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Plus, Upload, Search, Pencil, Trash2,
  Loader2, AlertCircle, CheckCircle, Calendar, X,
} from 'lucide-react';
import type { WordleWord } from '@/types';

type WordStatus = 'upcoming' | 'today' | 'past';

function getWordStatus(scheduledDate: string): WordStatus {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  if (scheduledDate === today) return 'today';
  if (scheduledDate > today) return 'upcoming';
  return 'past';
}

function getStatusBadge(status: WordStatus) {
  switch (status) {
    case 'today':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Today</span>;
    case 'upcoming':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Upcoming</span>;
    case 'past':
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">Past</span>;
  }
}

export default function AdminWordlePage() {
  const [words, setWords] = useState<WordleWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'past'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingWord, setEditingWord] = useState<WordleWord | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formWord, setFormWord] = useState('');
  const [formDate, setFormDate] = useState('');

  // Bulk form state
  const [bulkWords, setBulkWords] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState('');

  const fetchWords = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/wordle');
      const data = await res.json();
      if (data.success) {
        setWords(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch words:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWords();
  }, [fetchWords]);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });

  // Filter and search
  const filteredWords = words.filter((w) => {
    const status = getWordStatus(w.scheduled_date);
    if (filter !== 'all' && status !== filter) return false;
    if (search && !w.word.includes(search.toLowerCase()) && !w.scheduled_date.includes(search)) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!formWord || !formDate) {
      setError('Word and date are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wordle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: formWord, scheduled_date: formDate }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add word');
        setSaving(false);
        return;
      }

      setSuccess(`Added "${formWord.toUpperCase()}" for ${formDate}`);
      setTimeout(() => setSuccess(''), 3000);
      setShowAddModal(false);
      setFormWord('');
      setFormDate('');
      fetchWords();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editingWord || !formWord) return;

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wordle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingWord.id,
          word: formWord,
          scheduled_date: formDate || editingWord.scheduled_date,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update word');
        setSaving(false);
        return;
      }

      setSuccess(`Updated word for ${formDate || editingWord.scheduled_date}`);
      setTimeout(() => setSuccess(''), 3000);
      setEditingWord(null);
      setFormWord('');
      setFormDate('');
      fetchWords();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (word: WordleWord) => {
    if (!confirm(`Delete "${word.word.toUpperCase()}" scheduled for ${word.scheduled_date}?`)) return;

    try {
      const res = await fetch('/api/admin/wordle', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: word.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to delete word');
        return;
      }

      setSuccess('Word deleted');
      setTimeout(() => setSuccess(''), 3000);
      fetchWords();
    } catch {
      setError('Network error');
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkWords.trim() || !bulkStartDate) {
      setError('Words and start date are required');
      return;
    }

    const wordList = bulkWords
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);

    if (wordList.length === 0) {
      setError('No valid words provided');
      return;
    }

    // Generate scheduled dates starting from bulkStartDate
    const entries = wordList.map((word, index) => {
      const date = new Date(bulkStartDate);
      date.setDate(date.getDate() + index);
      return {
        word,
        scheduled_date: date.toLocaleDateString('en-CA'),
      };
    });

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/wordle/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: entries }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to bulk add');
        setSaving(false);
        return;
      }

      const result = data.data;
      setSuccess(`Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
      setTimeout(() => setSuccess(''), 5000);
      setShowBulkModal(false);
      setBulkWords('');
      setBulkStartDate('');
      fetchWords();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (word: WordleWord) => {
    setEditingWord(word);
    setFormWord(word.word);
    setFormDate(word.scheduled_date);
    setError('');
  };

  const openAddModal = () => {
    setFormWord('');
    setFormDate('');
    setError('');
    setShowAddModal(true);
  };

  // Count stats
  const upcomingCount = words.filter((w) => getWordStatus(w.scheduled_date) === 'upcoming').length;
  const todayWord = words.find((w) => getWordStatus(w.scheduled_date) === 'today');

  // Find gaps in upcoming dates
  const upcomingWords = words
    .filter((w) => w.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));

  let gapDates: string[] = [];
  if (upcomingWords.length > 0) {
    const start = new Date(today);
    const end = new Date(upcomingWords[upcomingWords.length - 1].scheduled_date);
    const scheduledDates = new Set(upcomingWords.map((w) => w.scheduled_date));
    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toLocaleDateString('en-CA');
      if (!scheduledDates.has(dateStr)) {
        gapDates.push(dateStr);
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Gamepad2 className="w-7 h-7 text-green-600" />
            Wordle Words
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage daily eco-themed words for the Wordle game
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setBulkWords(''); setBulkStartDate(''); setError(''); setShowBulkModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Bulk Add
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Word
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Total Words</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-white">{words.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Upcoming</p>
          <p className="text-2xl font-bold text-blue-600">{upcomingCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Today&apos;s Word</p>
          <p className="text-2xl font-bold text-green-600 uppercase">{todayWord?.word || '—'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">Date Gaps</p>
          <p className={`text-2xl font-bold ${gapDates.length > 0 ? 'text-red-500' : 'text-green-600'}`}>
            {gapDates.length}
          </p>
        </div>
      </div>

      {/* Gap Warning */}
      {gapDates.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Missing dates detected</p>
              <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                No word scheduled for: {gapDates.slice(0, 5).join(', ')}
                {gapDates.length > 5 && ` and ${gapDates.length - 5} more`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search words or dates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'upcoming', 'today', 'past'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Words Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      ) : filteredWords.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No words found. Add some words to get started!</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Word</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredWords.map((word) => {
                  const status = getWordStatus(word.scheduled_date);
                  const canEdit = status === 'upcoming';
                  return (
                    <tr
                      key={word.id}
                      className={`${
                        status === 'today'
                          ? 'bg-green-50/50 dark:bg-green-900/10'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-750'
                      } transition-colors`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {word.scheduled_date}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold uppercase tracking-wider text-gray-800 dark:text-white font-mono">
                          {word.word}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(word)}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(word)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Word Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Add Word</h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Word (5 letters)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formWord}
                    onChange={(e) => setFormWord(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5))}
                    placeholder="e.g. earth"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white uppercase tracking-wider font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    min={today}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={saving || formWord.length !== 5 || !formDate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Word Modal */}
      <AnimatePresence>
        {editingWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setEditingWord(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Edit Word</h3>
                <button onClick={() => setEditingWord(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Word (5 letters)
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={formWord}
                    onChange={(e) => setFormWord(e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white uppercase tracking-wider font-mono text-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    min={today}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setEditingWord(null)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={saving || formWord.length !== 5}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                  Update
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Bulk Add Words</h3>
                <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm px-3 py-2 rounded-lg mb-4">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Words (one per line, 5 letters each)
                  </label>
                  <textarea
                    value={bulkWords}
                    onChange={(e) => setBulkWords(e.target.value)}
                    rows={8}
                    placeholder={"earth\ngreen\nplant\nwater\nsolar"}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white font-mono uppercase tracking-wider focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {bulkWords.split('\n').filter((w) => w.trim().length > 0).length} words entered
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Starting Date
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    min={today}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Words will be scheduled on consecutive days starting from this date
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowBulkModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkAdd}
                  disabled={saving || !bulkWords.trim() || !bulkStartDate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
