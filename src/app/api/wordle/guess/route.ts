/**
 * ============================================================================
 * WORDLE GUESS API
 * ============================================================================
 * Accepts a guess, evaluates it against today's word, and updates game state.
 * Handles seed streak updates on win.
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isValidGuess } from '@/data/valid-words';
import type { LetterStatus, EvaluatedGuess } from '@/types';

const supabase = supabaseAdmin;

/** Get today's date in Asia/Manila timezone as YYYY-MM-DD */
function getTodayPH(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** Get yesterday's date in Asia/Manila timezone as YYYY-MM-DD */
function getYesterdayPH(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** Evaluate a guess against the answer (standard Wordle algorithm) */
function evaluateGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(5).fill('absent');
  const answerLetters = answer.split('');
  const guessLetters = guess.split('');
  const used = Array(5).fill(false);

  // First pass: mark correct letters (green)
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === answerLetters[i]) {
      result[i] = 'correct';
      used[i] = true;
    }
  }

  // Second pass: mark present letters (yellow)
  for (let i = 0; i < 5; i++) {
    if (result[i] === 'correct') continue;
    for (let j = 0; j < 5; j++) {
      if (!used[j] && guessLetters[i] === answerLetters[j]) {
        result[i] = 'present';
        used[j] = true;
        break;
      }
    }
  }

  return result;
}

/**
 * POST /api/wordle/guess
 * Submit a guess for today's Wordle puzzle.
 * Body: { guess: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse and validate guess
    const body = await request.json();
    const guess = (body.guess || '').toLowerCase().trim();

    if (!guess || guess.length !== 5 || !/^[a-z]{5}$/.test(guess)) {
      return NextResponse.json(
        { error: 'Guess must be exactly 5 letters' },
        { status: 400 }
      );
    }

    const today = getTodayPH();

    // Get today's word
    const { data: wordData } = await supabase
      .from('wordle_words')
      .select('id, word')
      .eq('scheduled_date', today)
      .single();

    if (!wordData) {
      return NextResponse.json(
        { error: 'No puzzle available today' },
        { status: 404 }
      );
    }

    // Validate guess against dictionary (also allow today's answer)
    if (!isValidGuess(guess, wordData.word)) {
      return NextResponse.json(
        { error: 'Not a valid word' },
        { status: 400 }
      );
    }

    // Get or check existing game
    const { data: existingGame } = await supabase
      .from('wordle_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_date', today)
      .single();

    if (existingGame && (existingGame.status === 'won' || existingGame.status === 'lost')) {
      return NextResponse.json(
        { error: 'Game already completed for today' },
        { status: 400 }
      );
    }

    // Evaluate the guess
    const evaluation = evaluateGuess(guess, wordData.word);
    const isCorrect = guess === wordData.word;

    // Build updated guesses array
    const currentGuesses: string[] = existingGame ? (existingGame.guesses as string[]) : [];
    const updatedGuesses = [...currentGuesses, guess];
    const attemptsUsed = updatedGuesses.length;

    // Determine game status
    let status: 'in_progress' | 'won' | 'lost' = 'in_progress';
    if (isCorrect) {
      status = 'won';
    } else if (attemptsUsed >= 6) {
      status = 'lost';
    }

    const completedAt = status !== 'in_progress' ? new Date().toISOString() : null;

    // Upsert game record
    if (existingGame) {
      await supabase
        .from('wordle_games')
        .update({
          guesses: updatedGuesses,
          attempts_used: attemptsUsed,
          status,
          completed_at: completedAt,
        })
        .eq('id', existingGame.id);
    } else {
      await supabase
        .from('wordle_games')
        .insert({
          user_id: user.id,
          word_id: wordData.id,
          game_date: today,
          guesses: updatedGuesses,
          attempts_used: attemptsUsed,
          status,
          completed_at: completedAt,
        });
    }

    // Update seeds on win
    let seedStats = null;
    if (status === 'won') {
      const yesterday = getYesterdayPH();

      // Get current seed data
      const { data: currentSeeds } = await supabase
        .from('wordle_seeds')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (currentSeeds) {
        // Update existing streak
        const isConsecutive = currentSeeds.last_win_date === yesterday;
        const newStreak = isConsecutive ? currentSeeds.current_seed_streak + 1 : 1;
        const longestStreak = Math.max(newStreak, currentSeeds.longest_seed_streak);
        const totalSeeds = currentSeeds.total_seeds_earned + 1;

        await supabase
          .from('wordle_seeds')
          .update({
            current_seed_streak: newStreak,
            longest_seed_streak: longestStreak,
            total_seeds_earned: totalSeeds,
            last_win_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        seedStats = {
          current_seed_streak: newStreak,
          longest_seed_streak: longestStreak,
          total_seeds_earned: totalSeeds,
        };
      } else {
        // Create new seed record
        await supabase
          .from('wordle_seeds')
          .insert({
            user_id: user.id,
            current_seed_streak: 1,
            longest_seed_streak: 1,
            total_seeds_earned: 1,
            last_win_date: today,
          });

        seedStats = {
          current_seed_streak: 1,
          longest_seed_streak: 1,
          total_seeds_earned: 1,
        };
      }
    } else if (status === 'lost') {
      // On loss, reset streak but don't modify total
      const { data: currentSeeds } = await supabase
        .from('wordle_seeds')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (currentSeeds) {
        await supabase
          .from('wordle_seeds')
          .update({
            current_seed_streak: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        seedStats = {
          current_seed_streak: 0,
          longest_seed_streak: currentSeeds.longest_seed_streak,
          total_seeds_earned: currentSeeds.total_seeds_earned,
        };
      }
    }

    // Build response
    const evaluatedGuess: EvaluatedGuess = { word: guess, result: evaluation };

    return NextResponse.json({
      success: true,
      data: {
        evaluation: evaluatedGuess,
        status,
        attempts_used: attemptsUsed,
        seed_stats: seedStats,
        // Reveal answer only when game is over
        answer: status !== 'in_progress' ? wordData.word : undefined,
      },
    });
  } catch (error) {
    console.error('Error processing wordle guess:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process guess' },
      { status: 500 }
    );
  }
}
