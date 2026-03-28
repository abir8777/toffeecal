import { useState } from 'react';
import { CalendarDays, ChefHat, Flame, Loader2, AlertCircle, Save, RefreshCw } from 'lucide-react';
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

const mealTypeBadge: Record<string, { label: string; className: string }> = {
  breakfast: { label: 'B', className: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
  lunch: { label: 'L', className: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' },
  dinner: { label: 'D', className: 'bg-indigo-500/15 text-indigo-600 border-indigo-500/30' },
  snack: { label: 'S', className: 'bg-rose-500/15 text-rose-600 border-rose-500/30' },
};

function MealRow({ meal }: { meal: Meal }) {
  const badge = mealTypeBadge[meal.type] || mealTypeBadge.snack;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      <span className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border shrink-0', badge.className)}>
        {badge.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{meal.name}</p>
        <div className="flex gap-3 mt-0.5 text-[11px] text-muted-foreground">
          <span>P: {meal.protein_g}g</span>
          <span>C: {meal.carbs_g}g</span>
          <span>F: {meal.fat_g}g</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-foreground shrink-0">{meal.calories}</span>
    </div>
  );
}

function DayCard({ dayPlan, index }: { dayPlan: DayPlan; index: number }) {
  const totalCals = dayPlan.meals.reduce((s, m) => s + m.calories, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="p-4 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground text-base">{dayPlan.day}</h3>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Flame className="h-4 w-4" />
            {totalCals} kcal
          </div>
        </div>
        <div className="divide-y-0">
          {dayPlan.meals.map((meal, i) => (
            <MealRow key={i} meal={meal} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

export default function MealPlan() {
  const { user } = useAuth();
  const { mealPlan, isLoading, isLoadingSaved, isSaving, error, generatePlan, savePlan, currentCuisine: savedCuisine } = useWeeklyMealPlan();
  const [authOpen, setAuthOpen] = useState(false);
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  // Sync cuisine selector when a saved plan is loaded
  useState(() => {
    if (savedCuisine && !selectedCuisine) {
      setSelectedCuisine(savedCuisine);
    }
  });

  // Keep cuisine in sync when savedCuisine loads
  if (savedCuisine && !selectedCuisine) {
    setSelectedCuisine(savedCuisine);
  }

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ChefHat className="h-6 w-6 text-primary" />
              Meal Plan
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">AI-powered weekly meals for your goals</p>
          </div>
          {mealPlan && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => selectedCuisine && generatePlan(selectedCuisine)}
              disabled={isLoading || !selectedCuisine}
              className="rounded-xl gap-1.5"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Regenerate
            </Button>
          )}
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

        {/* Generate / Save buttons */}
        {!mealPlan && (
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
        )}

        {isLoading && mealPlan && (
          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Regenerating your meal plan...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <AnimatePresence>
          {mealPlan && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <Button
                onClick={savePlan}
                disabled={isSaving}
                variant="outline"
                className="w-full h-11 rounded-xl font-semibold border-primary text-primary hover:bg-primary/5"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving...</span>
                ) : (
                  <span className="flex items-center gap-2"><Save className="h-4 w-4" />Save Meal Plan</span>
                )}
              </Button>
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
