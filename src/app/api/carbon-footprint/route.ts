import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CALCULATOR_QUESTIONS, calculateCO2, getTopCategories } from '@/lib/constants/eco-paths';

const supabase = supabaseAdmin;

/**
 * GET /api/carbon-footprint
 * Fetch user's most recent calculator result + active eco-path.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get most recent result
    const { data: result } = await supabase
      .from('carbon_footprint_results')
      .select('*')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get active eco-path
    const { data: activePath } = await supabase
      .from('user_eco_paths')
      .select('eco_path_id')
      .eq('user_id', userData.id)
      .eq('is_active', true)
      .single();

    // Check for un-graded eco-path pledges (blocks retaking the quiz)
    const { count: ungradedCount } = await supabase
      .from('pledge_albums')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id)
      .eq('is_eco_path_pledge', true)
      .neq('status', 'graded');

    const can_retake = !ungradedCount || ungradedCount === 0;

    if (!result) {
      return NextResponse.json({
        success: true,
        has_result: false,
        active_eco_path: activePath?.eco_path_id || null,
        can_retake,
      });
    }

    const breakdown = {
      transportation: Number(result.co2_transportation),
      food: Number(result.co2_food),
      energy: Number(result.co2_energy),
      waste: Number(result.co2_waste),
      water: Number(result.co2_water),
      total: Number(result.co2_total),
    };

    return NextResponse.json({
      success: true,
      has_result: true,
      result,
      active_eco_path: activePath?.eco_path_id || null,
      top_categories: getTopCategories(breakdown),
      can_retake,
    });
  } catch (error) {
    console.error('Error fetching carbon footprint:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch carbon footprint' }, { status: 500 });
  }
}

/**
 * POST /api/carbon-footprint
 * Submit calculator answers, compute CO2 breakdown, store result.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (!userData) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Block retake if user has un-graded eco-path pledges
    const { count: ungradedCount } = await supabase
      .from('pledge_albums')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userData.id)
      .eq('is_eco_path_pledge', true)
      .neq('status', 'graded');

    if (ungradedCount && ungradedCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Complete your current eco-path pledges before retaking the quiz.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { answers } = body;

    // Validate answers
    if (!Array.isArray(answers) || answers.length !== CALCULATOR_QUESTIONS.length) {
      return NextResponse.json(
        { success: false, error: `Expected ${CALCULATOR_QUESTIONS.length} answers` },
        { status: 400 }
      );
    }

    for (let i = 0; i < answers.length; i++) {
      const q = CALCULATOR_QUESTIONS[i];
      const a = answers[i];
      if (!Number.isInteger(a) || a < 0 || a >= q.options.length) {
        return NextResponse.json(
          { success: false, error: `Invalid answer for question ${i + 1}` },
          { status: 400 }
        );
      }
    }

    // Calculate CO2
    const breakdown = calculateCO2(answers);

    // Store result
    const { data: result, error } = await supabase
      .from('carbon_footprint_results')
      .insert({
        user_id: userData.id,
        answer_transportation_mode: answers[0],
        answer_commute_distance: answers[1],
        answer_diet: answers[2],
        answer_canteen_vs_bring: answers[3],
        answer_trash_handling: answers[4],
        answer_electronics_hours: answers[5],
        answer_ac_usage: answers[6],
        answer_shower_length: answers[7],
        co2_transportation: breakdown.transportation,
        co2_food: breakdown.food,
        co2_energy: breakdown.energy,
        co2_waste: breakdown.waste,
        co2_water: breakdown.water,
        co2_total: breakdown.total,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      result,
      top_categories: getTopCategories(breakdown),
    });
  } catch (error) {
    console.error('Error submitting carbon footprint:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit carbon footprint' }, { status: 500 });
  }
}
