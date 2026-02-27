-- ============================================================================
-- MIGRATION 004: Add Wordle Game & Seeds Streak System
-- ============================================================================

-- 1. wordle_words: Admin-managed daily word pool
CREATE TABLE IF NOT EXISTS wordle_words (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    word TEXT NOT NULL CHECK (char_length(word) = 5),
    scheduled_date DATE NOT NULL UNIQUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. wordle_games: Track each user's game result per day
CREATE TABLE IF NOT EXISTS wordle_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_id UUID NOT NULL REFERENCES wordle_words(id) ON DELETE CASCADE,
    game_date DATE NOT NULL,
    guesses JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'won', 'lost')),
    attempts_used INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, game_date)
);

-- 3. wordle_seeds: Seeds streak tracking
CREATE TABLE IF NOT EXISTS wordle_seeds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_seed_streak INTEGER DEFAULT 0,
    longest_seed_streak INTEGER DEFAULT 0,
    total_seeds_earned INTEGER DEFAULT 0,
    last_win_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wordle_words_date ON wordle_words(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_wordle_games_user_date ON wordle_games(user_id, game_date);
CREATE INDEX IF NOT EXISTS idx_wordle_games_word_id ON wordle_games(word_id);
CREATE INDEX IF NOT EXISTS idx_wordle_seeds_user_id ON wordle_seeds(user_id);
CREATE INDEX IF NOT EXISTS idx_wordle_seeds_streak ON wordle_seeds(current_seed_streak DESC);

-- Enable RLS
ALTER TABLE wordle_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordle_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordle_seeds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wordle_words (only show today's or past words to regular users)
CREATE POLICY "Anyone can view scheduled words" ON wordle_words
    FOR SELECT USING (scheduled_date <= CURRENT_DATE);

-- RLS Policies for wordle_games
CREATE POLICY "Users can view all games" ON wordle_games
    FOR SELECT USING (true);
CREATE POLICY "Users can insert games" ON wordle_games
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update games" ON wordle_games
    FOR UPDATE USING (true);

-- RLS Policies for wordle_seeds
CREATE POLICY "Anyone can view seed streaks" ON wordle_seeds
    FOR SELECT USING (true);
CREATE POLICY "Users can insert seeds" ON wordle_seeds
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update seeds" ON wordle_seeds
    FOR UPDATE USING (true);
