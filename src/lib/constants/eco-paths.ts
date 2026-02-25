import type { CalculatorQuestion, EcoPath, EcoPathId } from '@/types';

/**
 * CO2 kg/month estimates per answer.
 * Approximate values scaled for Philippine student context.
 * These are directional estimates, not scientifically precise.
 */
export const CALCULATOR_QUESTIONS: CalculatorQuestion[] = [
  {
    id: 1,
    question: 'How do you get to UMak most days?',
    category: 'transportation',
    options: ['Private car', 'Motorcycle', 'Public transit (jeep/bus/MRT)', 'Bicycle', 'Walk'],
    co2_values: [120, 60, 30, 2, 0],
  },
  {
    id: 2,
    question: 'How far is your daily commute (one way)?',
    category: 'transportation',
    options: ['Less than 2 km', '2–5 km', '5–15 km', '15–30 km', '30+ km'],
    co2_values: [5, 15, 35, 65, 100],
  },
  {
    id: 3,
    question: 'How would you describe your diet?',
    category: 'food',
    options: ['Meat every meal', 'Meat once a day', 'Mostly vegetables', 'Vegetarian', 'Vegan'],
    co2_values: [150, 100, 60, 40, 30],
  },
  {
    id: 4,
    question: 'How often do you eat at the canteen vs bring food?',
    category: 'food',
    options: ['Always canteen', 'Mostly canteen', '50/50', 'Mostly bring food', 'Always bring food'],
    co2_values: [40, 30, 20, 12, 8],
  },
  {
    id: 5,
    question: 'How do you usually handle your trash on campus?',
    category: 'waste',
    options: ['Separate recyclables', 'Everything in one bin', 'I try to reduce waste overall'],
    co2_values: [10, 30, 5],
  },
  {
    id: 6,
    question: 'How many hours/day are your electronics plugged in at home?',
    category: 'energy',
    options: ['Less than 2 hours', '2–5 hours', '5–8 hours', '8–12 hours', '12+ hours'],
    co2_values: [10, 25, 45, 70, 100],
  },
  {
    id: 7,
    question: 'Do you use AC regularly at home?',
    category: 'energy',
    options: ['Yes, most of the day', 'Yes, at night only', 'Sometimes', 'Rarely', 'Never'],
    co2_values: [150, 90, 50, 20, 0],
  },
  {
    id: 8,
    question: 'How long are your typical showers?',
    category: 'water',
    options: ['Less than 5 min', '5–10 min', '10–15 min', '15–20 min', '20+ min'],
    co2_values: [5, 12, 22, 35, 50],
  },
];

export const ECO_PATHS: EcoPath[] = [
  {
    id: 'transportation',
    name: 'Green Commute',
    description: 'Reduce your commute emissions by carpooling, biking, or walking more.',
    icon: 'Car',
    color: 'blue',
    suggested_actions: [
      'Walk or bike to campus at least twice this week',
      'Try carpooling with a classmate for one week',
      'Take public transit instead of a private vehicle for a week',
      'Plan your errands to reduce unnecessary trips',
      'Explore if any part of your commute could be replaced by walking',
      'Track your commute emissions for a week and see how they compare',
    ],
  },
  {
    id: 'food',
    name: 'Mindful Eating',
    description: 'Reduce your food-related footprint by eating more plants and wasting less.',
    icon: 'Salad',
    color: 'green',
    suggested_actions: [
      'Go meat-free for one full day this week (Meatless Monday)',
      'Bring a packed lunch from home at least 3 days this week',
      'Finish all your food — no leftovers on the plate',
      'Buy local produce instead of imported when shopping',
      'Try a new vegetable-based recipe this week',
      'Reduce single-use food packaging by bringing reusable containers',
    ],
  },
  {
    id: 'energy',
    name: 'Power Saver',
    description: 'Reduce your energy consumption by unplugging, reducing AC, and being mindful.',
    icon: 'Zap',
    color: 'yellow',
    suggested_actions: [
      'Unplug chargers and devices when not in use for a full day',
      'Reduce AC usage by 1 hour per day this week',
      'Switch to energy-saving mode on all your devices',
      'Use natural light instead of turning on lamps during the day',
      'Turn off lights when leaving a room — every time',
      'Limit screen time by 30 minutes a day and do something offline',
    ],
  },
  {
    id: 'waste',
    name: 'Zero Waste Hero',
    description: 'Reduce waste headed to the landfill by recycling, reusing, and refusing.',
    icon: 'Recycle',
    color: 'emerald',
    suggested_actions: [
      'Separate recyclables from your trash for one full week',
      'Bring a reusable water bottle and tumbler to campus every day',
      'Say no to plastic bags — bring your own eco-bag',
      'Repurpose or donate items instead of throwing them away',
      'Start a mini compost for food scraps at home',
      'Audit your trash for one day and identify what could be reduced',
    ],
  },
  {
    id: 'water',
    name: 'Water Guardian',
    description: 'Reduce water usage with shorter showers, fixing leaks, and being mindful.',
    icon: 'Droplets',
    color: 'cyan',
    suggested_actions: [
      'Take showers under 5 minutes for the entire week',
      'Turn off the faucet while brushing your teeth',
      'Report or fix any leaking faucets at home or campus',
      'Reuse water where possible (e.g., plant watering with rinse water)',
      'Collect rainwater for plants or cleaning',
      'Track your water bill for a month and set a reduction target',
    ],
  },
];

/** Get eco-path by ID */
export function getEcoPath(id: EcoPathId): EcoPath | undefined {
  return ECO_PATHS.find(p => p.id === id);
}

/** Calculate CO2 breakdown from answer indices */
export function calculateCO2(answers: number[]): {
  transportation: number;
  food: number;
  energy: number;
  waste: number;
  water: number;
  total: number;
} {
  const breakdown = { transportation: 0, food: 0, energy: 0, waste: 0, water: 0, total: 0 };

  CALCULATOR_QUESTIONS.forEach((q, i) => {
    const answerIndex = answers[i] ?? 0;
    const co2 = q.co2_values[answerIndex] ?? 0;
    breakdown[q.category] += co2;
  });

  breakdown.total = breakdown.transportation + breakdown.food + breakdown.energy + breakdown.waste + breakdown.water;
  return breakdown;
}

/** Get top N problem categories sorted by CO2 descending */
export function getTopCategories(
  breakdown: ReturnType<typeof calculateCO2>,
  n = 3
): { path_id: EcoPathId; co2: number }[] {
  const entries: { path_id: EcoPathId; co2: number }[] = [
    { path_id: 'transportation', co2: breakdown.transportation },
    { path_id: 'food', co2: breakdown.food },
    { path_id: 'energy', co2: breakdown.energy },
    { path_id: 'waste', co2: breakdown.waste },
    { path_id: 'water', co2: breakdown.water },
  ];
  return entries.sort((a, b) => b.co2 - a.co2).slice(0, n);
}

/** Valid eco-path IDs for validation */
export const VALID_ECO_PATH_IDS: EcoPathId[] = ['transportation', 'food', 'energy', 'waste', 'water'];
