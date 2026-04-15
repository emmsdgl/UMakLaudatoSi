-- ============================================================================
-- MIGRATION: Add User Ban System and Point Transactions
-- ============================================================================
-- This migration adds fields for user banning functionality and
-- point transaction tracking for audit purposes.
-- ============================================================================

-- Step 1: Add ban-related columns to users table (one at a time)
DO $$ 
BEGIN
    -- Add is_banned column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_banned'
    ) THEN
        ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add ban_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'ban_reason'
    ) THEN
        ALTER TABLE users ADD COLUMN ban_reason TEXT;
    END IF;
END $$;

DO $$ 
BEGIN
    -- Add banned_by column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'banned_by'
    ) THEN
        ALTER TABLE users ADD COLUMN banned_by UUID;
        
        -- Add foreign key constraint separately
        ALTER TABLE users ADD CONSTRAINT fk_users_banned_by 
            FOREIGN KEY (banned_by) REFERENCES users(id);
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ 
BEGIN
    -- Add banned_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'banned_at'
    ) THEN
        ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ;
    END IF;
END $$;

-- Step 2: Create index for banned users
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON users(is_banned);

-- Step 3: Drop point_transactions table if it exists (clean slate)
DROP TABLE IF EXISTS point_transactions CASCADE;

-- Step 4: Create point_transactions table with all columns
CREATE TABLE point_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (
        transaction_type IN (
            'pledge_reward',
            'streak_bonus',
            'promo_code',
            'reward_redemption',
            'donation',
            'admin_adjustment',
            'reset'
        )
    ),
    reference_id UUID,
    description TEXT,
    admin_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Add indexes for point_transactions
CREATE INDEX idx_point_transactions_user_id ON point_transactions(user_id);
CREATE INDEX idx_point_transactions_type ON point_transactions(transaction_type);
CREATE INDEX idx_point_transactions_created_at ON point_transactions(created_at DESC);

-- Step 6: Enable RLS on point_transactions
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies for point_transactions
CREATE POLICY "Users can view own transactions" ON point_transactions 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Admins can view all transactions" ON point_transactions 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('canteen_admin', 'admin', 'super_admin')
    )
);

CREATE POLICY "System can insert transactions" ON point_transactions 
FOR INSERT 
WITH CHECK (true);

-- Step 8: Drop audit_logs table if it exists (clean slate)
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Step 9: Create audit_logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 10: Add indexes for audit_logs
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Step 11: Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs" ON audit_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Admins can insert audit logs" ON audit_logs 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('canteen_admin', 'admin', 'super_admin')
    )
);

-- Step 13: Add comments
COMMENT ON COLUMN users.is_banned IS 'Whether the user is banned from the platform';
COMMENT ON COLUMN users.ban_reason IS 'Reason for the ban, provided by admin';
COMMENT ON COLUMN users.banned_by IS 'Admin who performed the ban';
COMMENT ON COLUMN users.banned_at IS 'When the user was banned';
COMMENT ON TABLE point_transactions IS 'Audit log of all point changes for users';
COMMENT ON TABLE audit_logs IS 'Audit log of all admin actions';
