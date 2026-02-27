'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, Trophy, XCircle, Share2, Check, X } from 'lucide-react';
import type { EvaluatedGuess } from '@/types';

interface WordleResultModalProps {
  isOpen: boolean;
  status: 'won' | 'lost';
  attempts: number;
  answer: string;
  guesses: EvaluatedGuess[];
  seedStats?: {
    current_seed_streak: number;
    longest_seed_streak: number;
    total_seeds_earned: number;
  };
  onClose: () => void;
}

function generateShareText(guesses: EvaluatedGuess[], attempts: number, status: 'won' | 'lost'): string {
  const header = `Laudato Si' Wordle ${status === 'won' ? attempts : 'X'}/6\n\n`;
  const grid = guesses
    .map((guess) =>
      guess.result
        .map((r) => {
          if (r === 'correct') return '🟩';
          if (r === 'present') return '🟨';
          return '⬜';
        })
        .join('')
    )
    .join('\n');

  return header + grid;
}

export default function WordleResultModal({
  isOpen,
  status,
  attempts,
  answer,
  guesses,
  seedStats,
  onClose,
}: WordleResultModalProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const text = generateShareText(guesses, attempts, status);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for mobile
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>

            {status === 'won' ? (
              <>
                {/* Win State */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-3">
                    <Trophy className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white font-[family-name:var(--font-fraunces)]">
                    Well Done!
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    You got it in {attempts} {attempts === 1 ? 'try' : 'tries'}!
                  </p>
                </div>

                {/* Seed Stats */}
                {seedStats && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sprout className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-700 dark:text-green-400">Seeds Earned</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{seedStats.current_seed_streak}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Current Streak</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{seedStats.longest_seed_streak}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Best Streak</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{seedStats.total_seeds_earned}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Total Seeds</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Loss State */}
                <div className="text-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white font-[family-name:var(--font-fraunces)]">
                    Not This Time
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    The word was
                  </p>
                  <p className="text-lg font-bold text-green-600 uppercase tracking-wider mt-1">
                    {answer}
                  </p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-4 text-center">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Come back tomorrow for a new eco-word!
                  </p>
                </div>
              </>
            )}

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share Result
                </>
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
