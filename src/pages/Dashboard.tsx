import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, Plus, TrendingUp, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { MacroBar } from '@/components/ui/MacroBar';
import { FoodLogCard } from '@/components/food/FoodLogCard';
import { DailyTipCard } from '@/components/dashboard/DailyTipCard';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFoodLogs } from '@/hooks/useFoodLogs';
import { getProgressPercentage, getRemainingCalories, calculateMacroTargets, formatCalories } from '@/lib/calories';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyTip } from '@/hooks/useDailyTip';

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { dailySummary, logs, isLoading: logsLoading, deleteFoodLog } = useFoodLogs();
  const { tip, isLoading: tipLoading, refresh: refreshTip } = useDailyTip();
  const [authOpen, setAuthOpen] = useState(!user);

  if (!user) {
    return (
      <AppLayout>
        <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <Flame className="h-12 w-12 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Welcome to NutriTrack</h1>
          <p className="text-muted-foreground">Sign in to start tracking your nutrition</p>
          <Button
            onClick={() => setAuthOpen(true)}
            className="gradient-primary text-primary-foreground font-semibold rounded-xl h-12 px-8"
          >
            Get Started
          </Button>
          <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
        </div>
      </AppLayout>
    );
  }

  if (profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding" replace />;
  }

  const calorieTarget = profile?.daily_calorie_target || 2000;
  const consumed = dailySummary.total_calories;
  const remaining = getRemainingCalories(consumed, calorieTarget);
  const progress = getProgressPercentage(consumed, calorieTarget);
  const macroTargets = calculateMacroTargets(calorieTarget, profile?.goal || 'maintain');

  const isLoading = profileLoading || logsLoading;

  return (
    <AppLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {profile?.name ? `Hey, ${profile.name}!` : 'Hey there!'} 👋
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), 'EEEE, MMMM d')}
            </p>
          </div>
          <Link to="/premium">
            <Button variant="outline" size="sm" className="rounded-full gap-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              Premium
            </Button>
          </Link>
        </motion.div>

        {/* Daily Motivational Tip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <DailyTipCard tip={tip} isLoading={tipLoading} onRefresh={refreshTip} />
        </motion.div>

        {/* Calorie Progress Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col items-center">
                {isLoading ? (
                  <Skeleton className="w-48 h-48 rounded-full" />
                ) : (
                  <CircularProgress percentage={progress} size={192} strokeWidth={14}>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-accent mb-1">
                        <Flame className="h-5 w-5" />
                        <span className="text-sm font-medium">Remaining</span>
                      </div>
                      <div className="text-4xl font-bold text-foreground">
                        {formatCalories(remaining)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of {formatCalories(calorieTarget)} cal
                      </div>
                    </div>
                  </CircularProgress>
                )}

                <div className="grid grid-cols-2 gap-4 mt-6 w-full text-center">
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <div className="text-2xl font-bold text-foreground">
                      {formatCalories(consumed)}
                    </div>
                    <div className="text-xs text-muted-foreground">Consumed</div>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/50">
                    <div className="text-2xl font-bold text-primary">
                      {formatCalories(remaining)}
                    </div>
                    <div className="text-xs text-muted-foreground">Remaining</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Macro Progress */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 space-y-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Macros
              </h2>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <>
                  <MacroBar
                    label="Protein"
                    current={dailySummary.total_protein}
                    target={macroTargets.protein}
                    color="protein"
                  />
                  <MacroBar
                    label="Carbs"
                    current={dailySummary.total_carbs}
                    target={macroTargets.carbs}
                    color="carbs"
                  />
                  <MacroBar
                    label="Fat"
                    current={dailySummary.total_fat}
                    target={macroTargets.fat}
                    color="fat"
                  />
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Add Button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/log">
            <Button className="w-full h-14 rounded-xl gradient-primary text-primary-foreground font-semibold text-lg gap-2">
              <Plus className="h-5 w-5" />
              Log Food
            </Button>
          </Link>
        </motion.div>

        {/* Today's Meals */}
        {logs && logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-3"
          >
            <h2 className="font-semibold text-foreground">Today's Meals</h2>
            <div className="space-y-3">
              {logs.slice(0, 3).map((log) => (
                <FoodLogCard
                  key={log.id}
                  log={log}
                  onDelete={deleteFoodLog}
                />
              ))}
              {logs.length > 3 && (
                <Link to="/history" className="block">
                  <Button variant="outline" className="w-full rounded-xl">
                    View all {logs.length} meals
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-center text-muted-foreground px-4">
          ⚠️ Calorie estimates are approximate. Always consult a healthcare professional for dietary advice.
        </p>
      </div>
    </AppLayout>
  );
}
