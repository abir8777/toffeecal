export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  goal: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
  daily_calorie_target: number | null;
  is_premium: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_name: string;
  calories: number;
  calories_min: number | null;
  calories_max: number | null;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  image_url: string | null;
  ai_suggestions: string | null;
  logged_at: string;
  created_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string;
  created_at: string;
}

export interface OnboardingData {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height_cm: number;
  weight_kg: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose_weight' | 'maintain' | 'gain_muscle';
}

export interface FoodAnalysisResult {
  food_name: string;
  calories: number;
  calories_min: number;
  calories_max: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  suggestions: string;
}

export interface DailySummary {
  date: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meals: FoodLog[];
}
