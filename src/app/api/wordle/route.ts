/**
 * ============================================================================
 * WORDLE GAME STATE API
 * ============================================================================
 * Returns today's game state for the current user.
 * Checks if a word exists for today and retrieves game progress.
 * ============================================================================
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { LetterStatus, EvaluatedGuess, WordleGameState } from '@/types';

const supabase = supabaseAdmin;

/** Get today's date in Asia/Manila timezone as YYYY-MM-DD */
function getTodayPH(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
}

/** Get the Monday (start) and Sunday (end) of the current week in PH timezone */
function getWeekRangePH(): { start: string; end: string } {
  const now = new Date();
  const phNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const day = phNow.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMon = day === 0 ? 6 : day - 1;
  const monday = new Date(phNow);
  monday.setDate(phNow.getDate() - diffToMon);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString('en-CA'),
    end: sunday.toLocaleDateString('en-CA'),
  };
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
 * GET /api/wordle
 * Returns today's game state for the authenticated user.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user from database
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const today = getTodayPH();

    // Get today's word
    const { data: wordData } = await supabase
      .from('wordle_words')
      .select('id, word, scheduled_date')
      .eq('scheduled_date', today)
      .single();

    if (!wordData) {
      return NextResponse.json({
        success: true,
        data: {
          has_word_today: false,
          game_date: today,
        } as WordleGameState,
      });
    }

    // Get user's game for today
    const { data: gameData } = await supabase
      .from('wordle_games')
      .select('*')
      .eq('user_id', user.id)
      .eq('game_date', today)
      .single();

    // Get user's seed stats
    const { data: seedData } = await supabase
      .from('wordle_seeds')
      .select('current_seed_streak, longest_seed_streak, total_seeds_earned')
      .eq('user_id', user.id)
      .single();

    // Get this week's wins for the streak calendar
    const weekRange = getWeekRangePH();
    const { data: weeklyGames } = await supabase
      .from('wordle_games')
      .select('game_date')
      .eq('user_id', user.id)
      .eq('status', 'won')
      .gte('game_date', weekRange.start)
      .lte('game_date', weekRange.end);

    const isComplete = gameData?.status === 'won' || gameData?.status === 'lost';

    // Re-evaluate guesses for the response
    const evaluatedGuesses: EvaluatedGuess[] = gameData
      ? (gameData.guesses as string[]).map((g: string) => ({
          word: g,
          result: evaluateGuess(g, wordData.word),
        }))
      : [];

    const response: WordleGameState = {
      has_word_today: true,
      game_date: today,
      game: gameData
        ? {
            status: gameData.status,
            guesses: evaluatedGuesses,
            attempts_used: gameData.attempts_used,
            completed_at: gameData.completed_at,
          }
        : undefined,
      seed_stats: seedData
        ? {
            current_seed_streak: seedData.current_seed_streak,
            longest_seed_streak: seedData.longest_seed_streak,
            total_seeds_earned: seedData.total_seeds_earned,
          }
        : { current_seed_streak: 0, longest_seed_streak: 0, total_seeds_earned: 0 },
      // Only reveal answer after game is complete
      answer: isComplete ? wordData.word : undefined,
      // This week's win dates for the streak calendar
      weekly_wins: weeklyGames?.map(g => g.game_date) || [],
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching wordle state:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch game state' },
      { status: 500 }
    );
  }
}
