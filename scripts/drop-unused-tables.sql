-- ============================================================================
-- DROP UNUSED TABLES - Laudato Si Database Cleanup
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- Date: 2026-02-25
-- ============================================================================

-- 1. Drop 'plant_stats' table (plant stage is calculated dynamically, not from this table)
DROP TABLE IF EXISTS public.plant_stats CASCADE;

-- 2. Drop 'questions' table (questions are hardcoded in the calculator frontend)
DROP TABLE IF EXISTS public.questions CASCADE;

-- Verify the tables are gone
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
