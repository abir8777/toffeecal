import { OnboardingData } from '@/types';

export function calculateDailyCalories(data: OnboardingData): number {
  // Mifflin-St Jeor Equation
  let bmr: number;
  
  if (data.gender === 'male') {
    bmr = 10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age + 5;
  } else {
    bmr = 10 * data.weight_kg + 6.25 * data.height_cm - 5 * data.age - 161;
  }
  
  // Activity multipliers
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  
  const tdee = bmr * activityMultipliers[data.activity_level];
  
  // Goal adjustments
  const goalAdjustments: Record<string, number> = {
    lose_weight: -500, // 0.5kg/week deficit
    maintain: 0,
    gain_muscle: 300, // Moderate surplus for muscle gain
  };
  
  return Math.round(tdee + goalAdjustments[data.goal]);
}

export function calculateMacroTargets(totalCalories: number, goal: string) {
  // Macro ratios based on goal
  const ratios = {
    lose_weight: { protein: 0.35, carbs: 0.35, fat: 0.30 },
    maintain: { protein: 0.30, carbs: 0.45, fat: 0.25 },
    gain_muscle: { protein: 0.35, carbs: 0.45, fat: 0.20 },
  };
  
  const ratio = ratios[goal as keyof typeof ratios] || ratios.maintain;
  
  return {
    protein: Math.round((totalCalories * ratio.protein) / 4), // 4 cal per gram
    carbs: Math.round((totalCalories * ratio.carbs) / 4),
    fat: Math.round((totalCalories * ratio.fat) / 9), // 9 cal per gram
  };
}

export function formatCalories(calories: number): string {
  return calories.toLocaleString();
}

export function getProgressPercentage(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

export function getRemainingCalories(consumed: number, target: number): number {
  return Math.max(0, target - consumed);
}
