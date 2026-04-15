-- ============================================================================
-- LAUDATO SI' CAMPUS GROWTH INITIATIVE - DATABASE SCHEMA V2
-- ============================================================================
-- This schema extends the base system with:
-- - Points & Streak System (gamification)
-- - Admin Panel & Role Management
-- - Rewards Marketplace
-- - Promo Code Engine
-- - Donation System
-- - Leaderboard Support
-- - Comprehensive Audit Logging
-- ============================================================================

-- ============================================================================
-- SECTION 1: USER SYSTEM EXTENSIONS
-- ============================================================================

-- Add new columns to existing users table for role management and points
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' 
    CHECK (role IN ('student', 'employee', 'guest', 'canteen_admin', 'admin', 'super_admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_umak_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT;

-- ============================================================================
-- SECTION 2: POINTS & STREAK SYSTEM
-- ============================================================================

-- Streaks table: Tracks consecutive daily pledge activity
-- The streak determines the point multiplier (Day 1=1pt, Day 2=2pt... Day 5+=5pt cap)
CREATE TABLE IF NOT EXISTS streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,           -- Current consecutive days
    longest_streak INTEGER DEFAULT 0,           -- Personal best streak
    last_pledge_date DATE,                      -- Date of last pledge (for streak calculation)
    streak_started_at TIMESTAMPTZ,              -- When current streak began
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Points transactions table: Immutable ledger of all point changes
-- This allows full audit trail of points earned, spent, or adjusted
CREATE TABLE IF NOT EXISTS point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,                    -- Positive = earned, Negative = spent
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'pledge_reward',      -- Points from daily pledge
        'streak_bonus',       -- Bonus points from streak multiplier
        'promo_code',         -- Points from redeeming promo code
        'reward_redemption',  -- Points spent on rewards (negative)
        'donation',           -- Points donated to campaigns (negative)
        'admin_adjustment',   -- Manual adjustment by admin
        'reset'               -- Points reset (e.g., cheating penalty)
    )),
    reference_id UUID,                          -- Links to related record (pledge, promo, reward)
    description TEXT,                           -- Human-readable description
    admin_id UUID REFERENCES users(id),         -- If admin-initiated, who did it
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient point history queries
CREATE INDEX IF NOT EXISTS idx_point_transactions_user ON point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_date ON point_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_transactions_type ON point_transactions(transaction_type);

-- ============================================================================
-- SECTION 3: REWARDS MARKETPLACE
-- ============================================================================

-- Rewards catalog: Items users can redeem with points
CREATE TABLE IF NOT EXISTS rewards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                         -- e.g., "Free Meal at Main Canteen"
    description TEXT,                           -- Detailed description
    point_cost INTEGER NOT NULL CHECK (point_cost >= 0),
    category TEXT NOT NULL CHECK (category IN (
        'food',           -- Canteen items
        'merchandise',    -- UMak merch, eco products
        'event',          -- Event passes, sustainability workshops
        'digital',        -- Digital rewards, certificates
        'other'
    )),
    image_url TEXT,                             -- Reward image for display
    partner_id UUID REFERENCES users(id),       -- Canteen/partner admin who manages this
    total_quantity INTEGER,                     -- NULL = unlimited, else limited stock
    remaining_quantity INTEGER,                 -- Current available stock
    is_active BOOLEAN DEFAULT TRUE,             -- Whether reward is currently available
    requires_verification BOOLEAN DEFAULT TRUE, -- Needs staff scan to redeem
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,                    -- NULL = no expiration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reward redemptions: Records of users claiming rewards
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
    points_spent INTEGER NOT NULL,              -- Snapshot of cost at redemption time
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Awaiting verification/pickup
        'verified',       -- Staff confirmed redemption
        'completed',      -- User received reward
        'cancelled',      -- Cancelled by user or admin
        'expired'         -- Not claimed in time
    )),
    redemption_code TEXT UNIQUE,                -- QR code data for verification
    verified_by UUID REFERENCES users(id),      -- Staff who verified
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,                     -- Deadline to claim
    notes TEXT,                                 -- Admin notes
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemptions_user ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_redemptions_code ON reward_redemptions(redemption_code);

-- ============================================================================
-- SECTION 4: PROMO CODE SYSTEM
-- ============================================================================

-- Promo codes: Generated codes that grant points or rewards
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,                  -- The actual code (e.g., "EARTH2024")
    code_type TEXT NOT NULL CHECK (code_type IN (
        'points',         -- Grants bonus points
        'reward',         -- Grants specific reward
        'multiplier'      -- Multiplies next pledge points
    )),
    value INTEGER NOT NULL,                     -- Points amount or multiplier value
    reward_id UUID REFERENCES rewards(id),      -- If code_type='reward', which reward
    max_uses INTEGER,                           -- NULL = unlimited
    current_uses INTEGER DEFAULT 0,
    is_single_use_per_user BOOLEAN DEFAULT TRUE, -- Each user can only use once
    eligible_roles TEXT[],                      -- ['student', 'employee'] or NULL for all
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),       -- Admin who created
    description TEXT,                           -- Internal note about the code
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Promo code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_uses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_at TIMESTAMPTZ DEFAULT NOW(),
    points_granted INTEGER,                     -- Actual points given
    UNIQUE(promo_code_id, user_id)              -- Prevents duplicate use if single_use_per_user
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_uses_user ON promo_code_uses(user_id);

-- ============================================================================
-- SECTION 5: DONATION SYSTEM
-- ============================================================================

-- Donation campaigns: Causes users can donate points to
CREATE TABLE IF NOT EXISTS donation_campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,                         -- e.g., "Campus Tree Planting 2024"
    description TEXT,
    goal_points INTEGER,                        -- Target points to collect
    current_points INTEGER DEFAULT 0,           -- Points donated so far
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Point donations from users
CREATE TABLE IF NOT EXISTS point_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES donation_campaigns(id) ON DELETE CASCADE,
    points_donated INTEGER NOT NULL CHECK (points_donated > 0),
    message TEXT,                               -- Optional message from donor
    is_anonymous BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GCash donations from guests (monetary)
CREATE TABLE IF NOT EXISTS gcash_donations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    donor_name TEXT,                            -- Guest name (optional)
    donor_email TEXT,                           -- For receipt
    donor_phone TEXT,                           -- GCash number
    amount_php DECIMAL(10,2) NOT NULL,          -- Amount in Philippine Pesos
    reference_number TEXT,                      -- GCash reference
    campaign_id UUID REFERENCES donation_campaigns(id),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending',        -- Awaiting verification
        'verified',       -- Confirmed by admin
        'rejected',       -- Flagged as fraudulent
        'refunded'        -- Returned to donor
    )),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_donations_campaign ON point_donations(campaign_id);
CREATE INDEX IF NOT EXISTS idx_gcash_donations_status ON gcash_donations(status);

-- ============================================================================
-- SECTION 6: AUDIT LOGGING
-- ============================================================================

-- Comprehensive audit log for all significant system actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    actor_id UUID REFERENCES users(id),         -- Who performed the action (NULL for system)
    actor_role TEXT,                            -- Role at time of action
    action TEXT NOT NULL,                       -- Action identifier
    entity_type TEXT NOT NULL,                  -- Table/entity affected
    entity_id UUID,                             -- ID of affected record
    old_values JSONB,                           -- Previous state (for updates)
    new_values JSONB,                           -- New state
    ip_address TEXT,                            -- Request IP
    user_agent TEXT,                            -- Browser/client info
    metadata JSONB,                             -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Efficient querying of audit logs
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at DESC);

-- ============================================================================
-- SECTION 7: LEADERBOARD SUPPORT
-- ============================================================================

-- Materialized view for efficient leaderboard queries
-- Refresh periodically or on-demand for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_weekly AS
SELECT 
    u.id as user_id,
    u.name,
    u.department,
    u.role,
    u.avatar_url,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.amount > 0), 0) as total_earned,
    COALESCE(SUM(pt.amount) FILTER (WHERE pt.transaction_type = 'donation'), 0) as total_donated,
    s.current_streak,
    s.longest_streak,
    COUNT(DISTINCT DATE(pt.created_at)) as active_days
FROM users u
LEFT JOIN point_transactions pt ON u.id = pt.user_id 
    AND pt.created_at >= DATE_TRUNC('week', NOW())
LEFT JOIN streaks s ON u.id = s.user_id
WHERE u.role IN ('student', 'employee')
    AND u.is_banned = FALSE
GROUP BY u.id, u.name, u.department, u.role, u.avatar_url, s.current_streak, s.longest_streak
ORDER BY total_earned DESC;

-- Index for fast leaderboard access
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_weekly_user ON leaderboard_weekly(user_id);

-- ============================================================================
-- SECTION 8: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function: Calculate streak points based on current streak day
-- Day 1 = 1pt, Day 2 = 2pt, Day 3 = 3pt, Day 4 = 4pt, Day 5+ = 5pt (capped)
CREATE OR REPLACE FUNCTION calculate_streak_points(streak_day INTEGER)
RETURNS INTEGER AS $$
BEGIN
    RETURN LEAST(streak_day, 5);  -- Cap at 5 points
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Process daily pledge and award points
-- Called when a user makes their daily contribution
CREATE OR REPLACE FUNCTION process_pledge_points(p_user_id UUID, p_contribution_id UUID)
RETURNS TABLE(points_awarded INTEGER, new_streak INTEGER, is_new_streak BOOLEAN) AS $$
DECLARE
    v_last_pledge DATE;
    v_current_streak INTEGER;
    v_today DATE := CURRENT_DATE;
    v_points INTEGER;
    v_is_new BOOLEAN := FALSE;
BEGIN
    -- Get or create streak record
    INSERT INTO streaks (user_id, current_streak, last_pledge_date, streak_started_at)
    VALUES (p_user_id, 0, NULL, NULL)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get current streak info
    SELECT current_streak, last_pledge_date 
    INTO v_current_streak, v_last_pledge
    FROM streaks WHERE user_id = p_user_id;
    
    -- Calculate new streak
    IF v_last_pledge IS NULL OR v_last_pledge < v_today - INTERVAL '1 day' THEN
        -- Streak broken or first pledge - start new streak
        v_current_streak := 1;
        v_is_new := TRUE;
        
        UPDATE streaks SET 
            current_streak = 1,
            last_pledge_date = v_today,
            streak_started_at = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF v_last_pledge = v_today - INTERVAL '1 day' THEN
        -- Consecutive day - increment streak
        v_current_streak := v_current_streak + 1;
        
        UPDATE streaks SET 
            current_streak = v_current_streak,
            longest_streak = GREATEST(longest_streak, v_current_streak),
            last_pledge_date = v_today,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF v_last_pledge = v_today THEN
        -- Already pledged today - no additional points (handled by rate limit)
        RETURN QUERY SELECT 0, v_current_streak, FALSE;
        RETURN;
    END IF;
    
    -- Calculate points based on streak
    v_points := calculate_streak_points(v_current_streak);
    
    -- Record point transaction
    INSERT INTO point_transactions (user_id, amount, transaction_type, reference_id, description)
    VALUES (
        p_user_id, 
        v_points, 
        'pledge_reward', 
        p_contribution_id,
        'Daily pledge - Day ' || v_current_streak || ' streak'
    );
    
    -- Update user's total points
    UPDATE users SET total_points = total_points + v_points WHERE id = p_user_id;
    
    RETURN QUERY SELECT v_points, v_current_streak, v_is_new;
END;
$$ LANGUAGE plpgsql;

-- Function: Redeem promo code
CREATE OR REPLACE FUNCTION redeem_promo_code(p_user_id UUID, p_code TEXT)
RETURNS TABLE(success BOOLEAN, message TEXT, points_granted INTEGER) AS $$
DECLARE
    v_promo RECORD;
    v_user_role TEXT;
BEGIN
    -- Get promo code details
    SELECT * INTO v_promo FROM promo_codes 
    WHERE UPPER(code) = UPPER(p_code) AND is_active = TRUE;
    
    IF v_promo IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invalid promo code'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check validity period
    IF v_promo.valid_from > NOW() OR (v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW()) THEN
        RETURN QUERY SELECT FALSE, 'Promo code has expired'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check max uses
    IF v_promo.max_uses IS NOT NULL AND v_promo.current_uses >= v_promo.max_uses THEN
        RETURN QUERY SELECT FALSE, 'Promo code usage limit reached'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Check if user already used (if single use per user)
    IF v_promo.is_single_use_per_user THEN
        IF EXISTS (SELECT 1 FROM promo_code_uses WHERE promo_code_id = v_promo.id AND user_id = p_user_id) THEN
            RETURN QUERY SELECT FALSE, 'You have already used this promo code'::TEXT, 0;
            RETURN;
        END IF;
    END IF;
    
    -- Check role eligibility
    SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
    IF v_promo.eligible_roles IS NOT NULL AND NOT (v_user_role = ANY(v_promo.eligible_roles)) THEN
        RETURN QUERY SELECT FALSE, 'This promo code is not available for your account type'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Process the promo code
    IF v_promo.code_type = 'points' THEN
        -- Grant points
        INSERT INTO point_transactions (user_id, amount, transaction_type, reference_id, description)
        VALUES (p_user_id, v_promo.value, 'promo_code', v_promo.id, 'Promo code: ' || v_promo.code);
        
        UPDATE users SET total_points = total_points + v_promo.value WHERE id = p_user_id;
    END IF;
    
    -- Record usage
    INSERT INTO promo_code_uses (promo_code_id, user_id, points_granted)
    VALUES (v_promo.id, p_user_id, v_promo.value);
    
    -- Increment usage counter
    UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = v_promo.id;
    
    RETURN QUERY SELECT TRUE, 'Promo code redeemed successfully!'::TEXT, v_promo.value;
END;
$$ LANGUAGE plpgsql;

-- Function: Log audit entry
CREATE OR REPLACE FUNCTION log_audit(
    p_actor_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_actor_role TEXT;
BEGIN
    SELECT role INTO v_actor_role FROM users WHERE id = p_actor_id;
    
    INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_values, new_values, metadata)
    VALUES (p_actor_id, v_actor_role, p_action, p_entity_type, p_entity_id, p_old_values, p_new_values, p_metadata)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 9: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcash_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Streaks: Users can view own, admins can view all
CREATE POLICY "Users view own streaks" ON streaks FOR SELECT USING (true);
CREATE POLICY "System manages streaks" ON streaks FOR ALL USING (true);

-- Point transactions: Users see own, admins see all
CREATE POLICY "Users view own transactions" ON point_transactions FOR SELECT USING (true);
CREATE POLICY "System manages transactions" ON point_transactions FOR INSERT WITH CHECK (true);

-- Rewards: Anyone can view active rewards
CREATE POLICY "Anyone views active rewards" ON rewards FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Admins manage rewards" ON rewards FOR ALL USING (true);

-- Redemptions: Users see own, admins see all
CREATE POLICY "Users view own redemptions" ON reward_redemptions FOR SELECT USING (true);
CREATE POLICY "Users create redemptions" ON reward_redemptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage redemptions" ON reward_redemptions FOR UPDATE USING (true);

-- Promo codes: Only admins can view/manage
CREATE POLICY "Admins manage promo codes" ON promo_codes FOR ALL USING (true);

-- Promo uses: Users can insert own
CREATE POLICY "Users can use promo codes" ON promo_code_uses FOR INSERT WITH CHECK (true);
CREATE POLICY "Users view own promo uses" ON promo_code_uses FOR SELECT USING (true);

-- Donations: Public campaigns, users see own donations
CREATE POLICY "Anyone views active campaigns" ON donation_campaigns FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Anyone views point donations" ON point_donations FOR SELECT USING (true);
CREATE POLICY "Users can donate points" ON point_donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can submit gcash donation" ON gcash_donations FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins manage gcash donations" ON gcash_donations FOR SELECT USING (true);

-- Audit logs: Only admins
CREATE POLICY "Admins view audit logs" ON audit_logs FOR SELECT USING (true);
CREATE POLICY "System creates audit logs" ON audit_logs FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SECTION 10: REALTIME SUBSCRIPTIONS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE streaks;
ALTER PUBLICATION supabase_realtime ADD TABLE point_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE reward_redemptions;
ALTER PUBLICATION supabase_realtime ADD TABLE donation_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE point_donations;

-- ============================================================================
-- SECTION 11: INITIAL DATA
-- ============================================================================

-- Insert sample rewards
INSERT INTO rewards (name, description, point_cost, category, is_active) VALUES
('Free Coffee', 'One free coffee at the Main Canteen', 3, 'food', TRUE),
('Free Meal', 'One free meal combo at any campus canteen', 10, 'food', TRUE),
('Eco Tote Bag', 'Laudato Si branded reusable tote bag', 15, 'merchandise', TRUE),
('Bamboo Tumbler', 'Eco-friendly bamboo tumbler', 20, 'merchandise', TRUE),
('Sustainability Workshop Pass', 'Free entry to monthly sustainability workshop', 25, 'event', TRUE),
('Digital Certificate', 'Environmental Champion digital certificate', 50, 'digital', TRUE);

-- Insert sample donation campaign
INSERT INTO donation_campaigns (name, description, goal_points, is_active) VALUES
('Campus Tree Planting 2025', 'Help us plant 100 trees across the UMak campus. Your donated points fund seedlings and planting supplies.', 10000, TRUE);

-- Insert sample promo code
INSERT INTO promo_codes (code, code_type, value, max_uses, description, is_active) VALUES
('WELCOME2025', 'points', 5, 1000, 'Welcome bonus for new users', TRUE),
('EARTHDAY', 'points', 10, 500, 'Earth Day special bonus', TRUE);

