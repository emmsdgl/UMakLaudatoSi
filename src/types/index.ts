/**
 * ============================================================================
 * LAUDATO SI' - TYPE DEFINITIONS
 * ============================================================================
 * Centralized TypeScript types for the entire application.
 * Ensures type safety across components, hooks, and API routes.
 * ============================================================================
 */

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

/** 
 * User roles determine access levels and available features.
 * - student/employee: UMak verified accounts with full point access
 * - guest: Single pledge, donation-only access
 * - admin roles: Various administrative capabilities
 */
export type UserRole = 
  | 'student' 
  | 'employee' 
  | 'guest'
  | 'admin'           // General Admin (full access)
  | 'sa_admin'        // Student Affairs Admin
  | 'canteen_admin'   // Canteen/Rewards verification
  | 'finance_admin'   // GCash verification
  | 'super_admin';    // Full access

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: UserRole;
  department?: string;
  total_points: number;
  wallet_balance: number;
  is_umak_verified: boolean;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
  last_contribution?: string;
}

/** Minimal user info for public display (leaderboards, tickers) */
export interface PublicUser {
  id: string;
  name: string;
  avatar_url?: string;
  department?: string;
}

// ============================================================================
// POINTS & STREAK TYPES
// ============================================================================

/**
 * Streak tracking for gamification.
 * Points awarded based on consecutive daily pledges:
 * Day 1=1pt, Day 2=2pt, Day 3=3pt, Day 4=4pt, Day 5+=5pt (capped)
 */
export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_pledge_date?: string;
  streak_started_at?: string;
  updated_at: string;
}

/** Types of point transactions for audit trail */
export type PointTransactionType =
  | 'pledge_reward'        // Daily pledge points
  | 'streak_bonus'         // Additional streak bonuses
  | 'promo_code'           // Promo code redemption
  | 'reward_redemption'    // Spending on rewards (negative)
  | 'donation'             // Donating to campaigns (negative)
  | 'admin_adjustment'     // Manual admin changes
  | 'reset'                // Points reset (penalty)
  | 'pledge_album_reward'; // Points from graded pledge album

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: PointTransactionType;
  reference_id?: string;
  description?: string;
  admin_id?: string;
  created_at: string;
}

/** Summary of user's point status */
export interface PointSummary {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  points_earned_today: number;
  points_earned_this_week: number;
  can_pledge_today: boolean;
}

// ============================================================================
// WALLET TYPES (Canteen Admin)
// ============================================================================

export type WalletTransactionType = 'verification_earning' | 'payout';

export interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: WalletTransactionType;
  reference_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

export interface WalletPayout {
  id: string;
  canteen_admin_id: string;
  amount: number;
  gcash_reference?: string;
  proof_image_url?: string;
  status: 'completed' | 'cancelled';
  created_by: string;
  notes?: string;
  created_at: string;
  admin?: { name: string; email: string };
  canteen_admin?: { name: string; email: string };
}

// ============================================================================
// REWARDS TYPES
// ============================================================================

export type RewardCategory = 'food' | 'merchandise' | 'voucher' | 'experience' | 'event' | 'digital' | 'other';

export type RedemptionStatus = 
  | 'pending'    // Awaiting pickup/verification
  | 'verified'   // Staff confirmed
  | 'completed'  // User received reward
  | 'cancelled'  // Cancelled
  | 'expired';   // Not claimed in time

export interface Reward {
  id: string;
  name: string;
  description?: string;
  point_cost: number;
  category: RewardCategory;
  image_url?: string;
  partner_id?: string;
  total_quantity?: number;
  remaining_quantity?: number;
  stock_quantity?: number;
  is_active: boolean;
  requires_verification: boolean;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  points_spent: number;
  status: RedemptionStatus;
  redemption_code?: string;
  verified_by?: string;
  verified_at?: string;
  expires_at?: string;
  notes?: string;
  created_at: string;
  // Joined data
  reward?: Reward;
  user?: PublicUser;
}

// ============================================================================
// PROMO CODE TYPES
// ============================================================================

export type PromoCodeType = 'points' | 'reward' | 'multiplier';

export interface PromoCode {
  id: string;
  code: string;
  code_type: PromoCodeType;
  value: number;
  point_value: number;
  reward_id?: string;
  max_uses?: number;
  current_uses: number;
  times_used: number;
  is_single_use_per_user: boolean;
  eligible_roles?: UserRole[];
  valid_from?: string;
  valid_until?: string;
  is_active: boolean;
  created_by?: string;
  description?: string;
  created_at: string;
}

export interface PromoCodeUse {
  id: string;
  promo_code_id: string;
  user_id: string;
  used_at: string;
  points_granted?: number;
}

// ============================================================================
// DONATION TYPES
// ============================================================================

export interface DonationCampaign {
  id: string;
  name: string;
  title: string;
  description?: string;
  goal_points?: number;
  goal_amount?: number;
  current_points: number;
  current_amount: number;
  image_url?: string;
  is_active: boolean;
  starts_at: string;
  ends_at?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
}

export type GCashDonationStatus = 'pending' | 'verified' | 'rejected' | 'refunded';

export interface GCashDonation {
  id: string;
  donor_name?: string;
  donor_email?: string;
  donor_phone?: string;
  amount_php: number;
  reference_number?: string;
  campaign_id?: string;
  status: GCashDonationStatus;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
  created_at: string;
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

export interface LeaderboardEntry {
  user_id: string;
  name: string;
  department?: string;
  role: UserRole;
  avatar_url?: string;
  total_earned: number;
  total_donated: number;
  current_streak: number;
  longest_streak: number;
  active_days: number;
  rank?: number;
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time';
export type LeaderboardType = 'points' | 'donations' | 'streaks' | 'seeds';

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  // Joined
  actor?: PublicUser;
}

// ============================================================================
// ADMIN DASHBOARD TYPES
// ============================================================================

/** Statistics for the admin dashboard overview */
export interface DashboardStats {
  total_users: number;
  total_students: number;
  total_employees: number;
  total_guests: number;
  total_pledges_today: number;
  points_given_today: number;
  total_donations_this_month: number;
  reward_redemptions_today: number;
  promo_codes_generated: number;
  active_streaks: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// ============================================================================
// PLEDGE ALBUM TYPES
// ============================================================================

export type PledgeAlbumStatus = 'draft' | 'submitted' | 'reviewing' | 'graded';

export interface PledgeAlbum {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: PledgeAlbumStatus;
  points_awarded: number;
  eco_path_id?: EcoPathId;
  is_eco_path_pledge: boolean;
  graded_by?: string;
  graded_at?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined data
  proofs?: PledgeProof[];
  user?: PublicUser;
  grader?: PublicUser;
}

export interface PledgeProof {
  id: string;
  pledge_album_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  storage_path?: string;
  created_at: string;
}

export interface EcoPathPledgeProgress {
  eco_path_id: EcoPathId;
  eco_path_name: string;
  total: number;
  graded: number;
  pending: number;
  all_graded: boolean;
}

// ============================================================================
// PLANT STATS (Extended)
// ============================================================================

export type PlantStage = 'seed' | 'sprout' | 'plant' | 'tree';

export interface PlantStats {
  id: string;
  total_contributions: number;
  current_stage: PlantStage;
  updated_at: string;
}

// ============================================================================
// CARBON FOOTPRINT & ECO-PATH TYPES
// ============================================================================

/** The 5 eco-path category IDs */
export type EcoPathId = 'transportation' | 'food' | 'energy' | 'waste' | 'water';

/** Carbon footprint calculator result from database */
export interface CarbonFootprintResult {
  id: string;
  user_id: string;
  answer_transportation_mode: number;
  answer_commute_distance: number;
  answer_diet: number;
  answer_canteen_vs_bring: number;
  answer_trash_handling: number;
  answer_electronics_hours: number;
  answer_ac_usage: number;
  answer_shower_length: number;
  co2_transportation: number;
  co2_food: number;
  co2_energy: number;
  co2_waste: number;
  co2_water: number;
  co2_total: number;
  created_at: string;
  updated_at: string;
}

/** User's chosen eco-path record */
export interface UserEcoPath {
  id: string;
  user_id: string;
  eco_path_id: EcoPathId;
  is_active: boolean;
  created_at: string;
}

/** Calculator question definition (used client-side) */
export interface CalculatorQuestion {
  id: number;
  question: string;
  category: EcoPathId;
  options: string[];
  co2_values: number[];
}

/** Eco-path definition (hardcoded constant) */
export interface EcoPath {
  id: EcoPathId;
  name: string;
  description: string;
  icon: string;
  color: string;
  suggested_actions: string[];
}

/** Summary returned by /api/carbon-footprint GET */
export interface CarbonFootprintSummary {
  has_result: boolean;
  result?: CarbonFootprintResult;
  active_eco_path?: EcoPathId;
  top_categories?: { path_id: EcoPathId; co2: number }[];
}

// ============================================================================
// WORDLE GAME TYPES
// ============================================================================

export interface WordleWord {
  id: string;
  word: string;
  scheduled_date: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export type WordleGameStatus = 'in_progress' | 'won' | 'lost';

export interface WordleGame {
  id: string;
  user_id: string;
  word_id: string;
  game_date: string;
  guesses: string[];
  status: WordleGameStatus;
  attempts_used: number;
  completed_at?: string;
  created_at: string;
}

export interface WordleSeed {
  id: string;
  user_id: string;
  current_seed_streak: number;
  longest_seed_streak: number;
  total_seeds_earned: number;
  last_win_date?: string;
  created_at: string;
  updated_at: string;
}

/** Tile evaluation result for a single letter */
export type LetterStatus = 'correct' | 'present' | 'absent';

/** Client-side representation of a guess with evaluation */
export interface EvaluatedGuess {
  word: string;
  result: LetterStatus[];
}

/** State returned by GET /api/wordle (today's game state for current user) */
export interface WordleGameState {
  has_word_today: boolean;
  game_date: string;
  game?: {
    status: WordleGameStatus;
    guesses: EvaluatedGuess[];
    attempts_used: number;
    completed_at?: string;
  };
  seed_stats?: {
    current_seed_streak: number;
    longest_seed_streak: number;
    total_seeds_earned: number;
  };
  answer?: string;
  weekly_wins?: string[]; // Dates (YYYY-MM-DD) of wins this week
}
