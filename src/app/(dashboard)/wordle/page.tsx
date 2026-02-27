'use client';

import { useState, useEffect, useCallback } from 'react';
import { Leaf, Loader2, CalendarOff } from 'lucide-react';
import WordleBoard from '@/components/wordle/WordleBoard';
import WordleKeyboard from '@/components/wordle/WordleKeyboard';
import WordleResultModal from '@/components/wordle/WordleResultModal';
import SeedStreakBadge from '@/components/wordle/SeedStreakBadge';
import type { WordleGameState, EvaluatedGuess, LetterStatus } from '@/types';

export default function WordlePage() {
  const [gameState, setGameState] = useState<WordleGameState | null>(null);
  const [currentGuess, setCurrentGuess] = useState('');
  const [evaluatedGuesses, setEvaluatedGuesses] = useState<EvaluatedGuess[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<string | undefined>();
  const [seedStats, setSeedStats] = useState<{
    current_seed_streak: number;
    longest_seed_streak: number;
    total_seeds_earned: number;
  }>({ current_seed_streak: 0, longest_seed_streak: 0, total_seeds_earned: 0 });

  // Derive letter statuses from all evaluated guesses
  const letterStatuses = useCallback((): Map<string, LetterStatus> => {
    const statuses = new Map<string, LetterStatus>();
    for (const guess of evaluatedGuesses) {
      for (let i = 0; i < guess.word.length; i++) {
        const letter = guess.word[i];
        const status = guess.result[i];
        const current = statuses.get(letter);
        // Priority: correct > present > absent
        if (!current || status === 'correct' || (status === 'present' && current === 'absent')) {
          statuses.set(letter, status);
        }
      }
    }
    return statuses;
  }, [evaluatedGuesses]);

  // Fetch today's game state
  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch('/api/wordle');
        const data = await res.json();
        if (data.success) {
          const state: WordleGameState = data.data;
          setGameState(state);
          if (state.game) {
            setEvaluatedGuesses(state.game.guesses);
            if (state.game.status === 'won' || state.game.status === 'lost') {
              setAnswer(state.answer);
              setShowResult(true);
            }
          }
          if (state.seed_stats) {
            setSeedStats(state.seed_stats);
          }
        }
      } catch (err) {
        console.error('Failed to fetch wordle state:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchState();
  }, []);

  const isGameOver = gameState?.game?.status === 'won' || gameState?.game?.status === 'lost';

  const handleKeyPress = useCallback(
    async (key: string) => {
      if (isSubmitting || isRevealing || isGameOver) return;

      setError('');

      if (key === 'backspace') {
        setCurrentGuess((prev) => prev.slice(0, -1));
        return;
      }

      if (key === 'enter') {
        if (currentGuess.length !== 5) {
          setError('Word must be 5 letters');
          return;
        }

        setIsSubmitting(true);
        try {
          const res = await fetch('/api/wordle/guess', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guess: currentGuess }),
          });
          const data = await res.json();

          if (!res.ok) {
            setError(data.error || 'Failed to submit guess');
            setIsSubmitting(false);
            return;
          }

          if (data.success) {
            const newGuess: EvaluatedGuess = data.data.evaluation;
            setIsRevealing(true);
            setEvaluatedGuesses((prev) => [...prev, newGuess]);
            setCurrentGuess('');

            // Wait for reveal animation
            setTimeout(() => {
              setIsRevealing(false);

              if (data.data.status === 'won' || data.data.status === 'lost') {
                setAnswer(data.data.answer);
                if (data.data.seed_stats) {
                  setSeedStats(data.data.seed_stats);
                }
                // Update game state
                setGameState((prev) =>
                  prev
                    ? {
                        ...prev,
                        game: {
                          status: data.data.status,
                          guesses: [...evaluatedGuesses, newGuess],
                          attempts_used: data.data.attempts_used,
                          completed_at: new Date().toISOString(),
                        },
                        answer: data.data.answer,
                      }
                    : prev
                );
                // Show result modal after animation
                setTimeout(() => setShowResult(true), 300);
              }
            }, 1200);
          }
        } catch (err) {
          setError('Network error. Please try again.');
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      // Letter key
      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((prev) => prev + key);
      }
    },
    [currentGuess, isSubmitting, isRevealing, isGameOver, evaluatedGuesses]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (!gameState?.has_word_today) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <CalendarOff className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white font-[family-name:var(--font-fraunces)] mb-2">
          No Puzzle Today
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Check back tomorrow for a new eco-themed word!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Leaf className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white font-[family-name:var(--font-fraunces)]">
            Eco-Wordle
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          Guess the eco-themed word in 6 tries
        </p>
        <SeedStreakBadge
          streak={seedStats.current_seed_streak}
          total={seedStats.total_seeds_earned}
          showTotal
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center py-2 px-4 rounded-lg mb-4 animate-pulse">
          {error}
        </div>
      )}

      {/* Game Board */}
      <div className="mb-6">
        <WordleBoard
          evaluatedGuesses={evaluatedGuesses}
          currentGuess={currentGuess}
          isRevealing={isRevealing}
        />
      </div>

      {/* Keyboard */}
      <WordleKeyboard
        onKeyPress={handleKeyPress}
        letterStatuses={letterStatuses()}
        disabled={isSubmitting || isRevealing || isGameOver}
      />

      {/* Submitting indicator */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking...
        </div>
      )}

      {/* Result Modal */}
      <WordleResultModal
        isOpen={showResult}
        status={(gameState?.game?.status as 'won' | 'lost') || 'lost'}
        attempts={evaluatedGuesses.length}
        answer={answer || ''}
        guesses={evaluatedGuesses}
        seedStats={seedStats}
        onClose={() => setShowResult(false)}
      />
    </div>
  );
}
