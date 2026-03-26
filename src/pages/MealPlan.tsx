import { useState } from 'react';
import { CalendarDays, ChefHat, Flame, Beef, Wheat, Droplet, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useWeeklyMealPlan, DayPlan, Meal } from '@/hooks/useWeeklyMealPlan';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const cuisineOptions = [
  { value: 'Indian', emoji: '🇮🇳' },
  { value: 'Mediterranean', emoji: '🫒' },
  { value: 'East Asian', emoji: '🥢' },
  { value: 'Mexican', emoji: '🌮' },
  { value: 'American', emoji: '🍔' },
  { value: 'Middle Eastern', emoji: '🧆' },
];

const mealTypeIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

function MealCard({ meal }: { meal: Meal }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50">
      <span className="text-lg mt-0.5">{mealTypeIcons[meal.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-foreground text-sm truncate">{meal.name}</p>
          <Badge variant="secondary" className="shrink-0 text-xs font-bold">
            {meal.calories} kcal
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{meal.description}</p>
        <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Beef className="h-3 w-3 text-red-400" />{meal.protein_g}g</span>
          <span className="flex items-center gap-1"><Wheat className="h-3 w-3 text-amber-400" />{meal.carbs_g}g</span>
          <span className="flex items-center gap-1"><Droplet className="h-3 w-3 text-blue-400" />{meal.fat_g}g</span>
        </div>
      </div>
    </div>
  );
}

function DayCard({ dayPlan, index }: { dayPlan: DayPlan; index: number }) {
  const totalCals = dayPlan.meals.reduce((s, m) => s + m.calories, 0);
  const totalProtein = dayPlan.meals.reduce((s, m) => s + m.protein_g, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">{dayPlan.day}</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold">{totalCals} kcal</span>
            <span>•</span>
            <span>{totalProtein}g protein</span>
          </div>
        </div>
        <div className="space-y-2">
          {dayPlan.meals.map((meal, i) => (
            <MealCard key={i} meal={meal} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export default function MealPlan() {
  const { user } = useAuth();
  const { mealPlan, isLoading, error, generatePlan } = useWeeklyMealPlan();
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <CalendarDays className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Meal Planner</h1>
          <p className="text-muted-foreground">Sign in to generate personalized meal plans</p>
          <Button onClick={() => setAuthOpen(true)} className="gradient-primary text-primary-foreground font-semibold rounded-xl h-12 px-8">
            Sign In
          </Button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24 space-y-5 max-w-lg mx-auto">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
            <ChefHat className="h-6 w-6 text-primary" />
            Weekly Meal Plan
          </h1>
          <p className="text-sm text-muted-foreground">AI-generated meals tailored to your goals</p>
        </div>

        {/* Cuisine selector */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Choose your cuisine</p>
          <div className="grid grid-cols-3 gap-2">
            {cuisineOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => setSelectedCuisine(c.value)}
                className={cn(
                  "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-sm font-medium",
                  selectedCuisine === c.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                )}
              >
                <span className="text-xl">{c.emoji}</span>
                {c.value}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => selectedCuisine && generatePlan(selectedCuisine)}
          disabled={!selectedCuisine || isLoading}
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
        >
          {isLoading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Generating plan...</span>
          ) : (
            <span className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Generate Meal Plan</span>
          )}
        </Button>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence>
          {mealPlan && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {mealPlan.map((day, i) => (
                <DayCard key={day.day} dayPlan={day} index={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
