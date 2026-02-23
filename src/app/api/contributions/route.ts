import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Use admin client for all DB operations (bypasses RLS)
const supabase = supabaseAdmin;

/**
 * Helper function to check if email is UMak domain
 */
function isUMakEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@umak.edu.ph');
}

/**
 * POST /api/contributions
 * Submit a daily pledge/quiz answer.
 * 
 * RULES:
 * - UMak users (@umak.edu.ph): Can pledge once per day, earn points with streak system
 * - Admins: Full access, earn points like UMak users
 * - Guest users (non-UMak): Can only pledge ONCE EVER (1-time access)
 * 
 * Points: Day 1=1pt up to Day 5+=5pt cap based on streak.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();
    const { 
      question_id, 
      answer, 
      pledge_message,
      answers, // For question answers from pledge flow
      question_points,
      is_first_pledge 
    } = body;

    // Determine if this is a pledge submission or quiz submission
    const isPledge = !!pledge_message;

    // Get user data including current points and role
    const { data: userData } = await supabase
      .from('users')
      .select('id, last_contribution, total_points, role')
      .eq('email', userEmail)
      .single();

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const now = new Date();
    const isUMakUser = isUMakEmail(userEmail);
    const isAdmin = userData.role === 'admin';
    const isGuestUser = !isUMakUser && !isAdmin;

    // =========================================================================
    // GUEST USER RESTRICTION: Non-UMak users can only pledge ONCE EVER
    // =========================================================================
    if (isGuestUser) {
      // Check if guest has EVER made a contribution (check both contributions and pledge_messages)
      const { count: existingContributions } = await supabase
        .from('contributions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id);

      const { count: existingPledges } = await supabase
        .from('pledge_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.id);

      if ((existingContributions && existingContributions > 0) || (existingPledges && existingPledges > 0)) {
        return NextResponse.json(
          { 
            error: 'Guest users can only pledge once. Sign in with a @umak.edu.ph email for full access.',
            code: 'GUEST_LIMIT_REACHED'
          },
          { status: 403 }
        );
      }
    }

    // =========================================================================
    // DAILY RATE LIMIT: UMak users and admins can pledge once per day
    // =========================================================================
    if (!isGuestUser) {
      const lastContribution = userData.last_contribution
        ? new Date(userData.last_contribution)
        : null;
      
      if (lastContribution) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastContribDate = new Date(
          lastContribution.getFullYear(),
          lastContribution.getMonth(),
          lastContribution.getDate()
        );
        
        if (today.getTime() === lastContribDate.getTime()) {
          return NextResponse.json(
            { error: 'Already contributed today' },
            { status: 429 }
          );
        }
      }
    }

    let contribution = null;
    let pledgeMessageRecord = null;
    let isCorrect = null;

    // Handle pledge message submission
    if (isPledge) {
      // Insert pledge message
      const { data: pledgeData, error: pledgeError } = await supabase
        .from('pledge_messages')
        .insert({
          user_id: userData.id,
          message: pledge_message,
          points_earned: 0, // Will be updated after points calculation
          is_displayed: false,
        })
        .select()
        .single();

      if (pledgeError) throw pledgeError;
      pledgeMessageRecord = pledgeData;

      // If there are question answers, store them too
      if (answers && Object.keys(answers).length > 0) {
        // Store answers in contributions table for record-keeping
        for (const [qid, ans] of Object.entries(answers)) {
          await supabase
            .from('contributions')
            .insert({
              user_id: userData.id,
              question_id: qid,
              answer: ans as string,
              is_correct: null, // We don't validate these for now
            });
        }
      }
    } else {
      // Handle quiz/question submission (original flow)
      const { data: questionData } = await supabase
        .from('questions')
        .select('*')
        .eq('id', question_id)
        .single();

      isCorrect =
        questionData?.type === 'quiz'
          ? answer === questionData.correct_answer
          : null;

      // Insert contribution record
      const { data: contributionData, error: insertError } = await supabase
        .from('contributions')
        .insert({
          user_id: userData.id,
          question_id,
          answer,
          is_correct: isCorrect,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      contribution = contributionData;
    }

    // =========================================================================
    // POINTS & STREAK SYSTEM
    // Award points based on streak multiplier (Day 1=1pt, Day 5+=5pt cap)
    // UMak users and Admins earn points; Guest users don't earn points
    // =========================================================================
    
    let pointsAwarded = 0;
    let currentStreak = 1;

    // Award points to UMak users and admins (not guests)
    const canEarnPoints = isUMakUser || isAdmin;
    
    if (canEarnPoints) {
      // Get or create streak record
      const { data: streakData } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userData.id)
        .single();

      // Use local date strings to avoid timezone issues with toISOString()
      const toLocalDateStr = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      const todayStr = toLocalDateStr(now);
      const yesterdayDate = new Date(now);
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = toLocalDateStr(yesterdayDate);

      if (streakData) {
        const lastPledgeDateStr = streakData.last_pledge_date || '';

        if (lastPledgeDateStr) {
          // Compare date strings directly (no timezone conversion)
          if (lastPledgeDateStr === yesterdayStr) {
            // Pledged yesterday - continue streak
            currentStreak = Math.min(streakData.current_streak + 1, 5);
          } else if (lastPledgeDateStr < yesterdayStr) {
            // Streak broken - reset to day 1
            currentStreak = 1;
          } else {
            // Same day - shouldn't happen due to rate limit, but handle it
            currentStreak = streakData.current_streak;
          }
        }

        // Update streak record
        await supabase
          .from('streaks')
          .update({
            current_streak: currentStreak,
            longest_streak: Math.max(streakData.longest_streak, currentStreak),
            last_pledge_date: todayStr,
            updated_at: now.toISOString(),
          })
          .eq('user_id', userData.id);
      } else {
        // First-time pledge - create streak record
        await supabase
          .from('streaks')
          .insert({
            user_id: userData.id,
            current_streak: 1,
            longest_streak: 1,
            last_pledge_date: todayStr,
            streak_started_at: now.toISOString(),
          });
      }

      // Calculate points: Day 1=1pt, Day 2=2pt... Day 5+=5pt (capped)
      pointsAwarded = Math.min(currentStreak, 5);

      // Record point transaction for audit trail
      const referenceId = isPledge
        ? pledgeMessageRecord?.id
        : contribution?.id;

      await supabase
        .from('point_transactions')
        .insert({
          user_id: userData.id,
          amount: pointsAwarded,
          transaction_type: 'pledge_reward',
          reference_id: referenceId,
          description: `Daily pledge - Day ${currentStreak} streak (+${pointsAwarded} pts)`,
        });

      // Update pledge message with points earned
      if (isPledge && pledgeMessageRecord) {
        await supabase
          .from('pledge_messages')
          .update({ points_earned: pointsAwarded })
          .eq('id', pledgeMessageRecord.id);
      }

      // Update user's total_points and last_contribution in users table
      // (streak data lives in the 'streaks' table, not 'users')
      const { error: updateError } = await supabase
        .from('users')
        .update({
          total_points: (userData.total_points || 0) + pointsAwarded,
          last_contribution: now.toISOString()
        })
        .eq('id', userData.id);

      if (updateError) {
        console.error('User update failed:', updateError.message);
      }
    } else {
      // Guest users - just update last contribution, no points (1-time only)
      const { error: guestUpdateError } = await supabase
        .from('users')
        .update({ last_contribution: now.toISOString() })
        .eq('id', userData.id);

      if (guestUpdateError) {
        console.error('Guest user update failed:', guestUpdateError.message);
      }
    }

    // Get updated plant stats
    const { data: plantStats } = await supabase
      .from('plant_stats')
      .select('*')
      .single();

    return NextResponse.json(
      {
        contribution,
        pledge_message: pledgeMessageRecord,
        plantStats,
        isCorrect,
        // Include points info in response for immediate UI feedback
        points_awarded: pointsAwarded,
        current_streak: currentStreak,
        isGuest: isGuestUser,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error submitting contribution:', error);
    return NextResponse.json(
      { error: 'Failed to submit contribution' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/contributions
 * Fetch recent contributions with user info for public display.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const { data: contributions, error } = await supabase
      .from('contributions')
      .select(`
        *,
        users (
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return NextResponse.json({ contributions }, { status: 200 });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contributions' },
      { status: 500 }
    );
  }
}
