-- ============================================================================
-- MIGRATION: Add Admin System
-- ============================================================================
-- This migration adds an admin role system and assigns admin privileges.
-- Admins have full access regardless of email domain.
-- ============================================================================

-- Add role column to users table (drop constraint first if exists to update it)
DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'guest';
    END IF;
    
    -- Drop existing constraint if any
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add updated constraint with all roles
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('student', 'employee', 'guest', 'canteen_admin', 'admin', 'super_admin'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- =========================================================================
-- SET YOUR ADMIN ACCOUNTS
-- =========================================================================
-- Primary Admin: Official UMak Laudato Si account
-- Backup Admin: devcommgio2006@gmail.com
-- Admins bypass all restrictions and have full access

-- Set official UMak Laudato Si account as super admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'umaklaudatosi@umak.edu.ph';

-- Set backup admin account
UPDATE users 
SET role = 'admin' 
WHERE email = 'devcommgio2006@gmail.com';

-- Also insert these admins if they don't exist yet (they'll get created on first login)
INSERT INTO users (email, name, role) 
VALUES ('umaklaudatosi@umak.edu.ph', 'UMak Laudato Si', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

INSERT INTO users (email, name, role) 
VALUES ('devcommgio2006@gmail.com', 'Admin Backup', 'admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin';

-- Update RLS policy for rewards to allow admins to modify
DROP POLICY IF EXISTS "Only admins can modify rewards" ON rewards;

CREATE POLICY "Only admins can modify rewards" ON rewards 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('canteen_admin', 'admin', 'super_admin')
    )
);

-- Add RLS policy for redemptions - admins can update/verify them
DROP POLICY IF EXISTS "Admins can update any redemption" ON redemptions;

CREATE POLICY "Admins can update any redemption" ON redemptions 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('canteen_admin', 'admin', 'super_admin')
    )
);

-- Add RLS policy for admins to view all redemptions
DROP POLICY IF EXISTS "Admins can view all redemptions" ON redemptions;

CREATE POLICY "Admins can view all redemptions" ON redemptions 
FOR SELECT 
USING (
    auth.uid()::text = user_id::text 
    OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('canteen_admin', 'admin', 'super_admin')
    )
);

COMMENT ON COLUMN users.role IS 'User role: student, employee, guest, canteen_admin, admin, or super_admin';
