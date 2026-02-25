import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flame, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AppLayout } from '@/components/layout/AppLayout';
import { FoodLogCard } from '@/components/food/FoodLogCard';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFoodLogs, useWeeklySummary } from '@/hooks/useFoodLogs';
import { format, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { formatCalories } from '@/lib/calories';
import { Skeleton } from '@/components/ui/skeleton';

export default function History() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { logs, isLoading, deleteFoodLog, dailySummary } = useFoodLogs(selectedDate);
  const { data: weeklySummary, isLoading: weeklyLoading } = useWeeklySummary();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const calorieTarget = profile?.daily_calorie_target || 2000;
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getCaloriesForDay = (date: Date) => {
    const summary = weeklySummary?.find(s => s.date === format(date, 'yyyy-MM-dd'));
    return summary?.total_calories || 0;
  };

  const weeklyTotal = weeklySummary?.reduce((sum, day) => sum + day.total_calories, 0) || 0;
  const weeklyAverage = weeklySummary?.length ? Math.round(weeklyTotal / weeklySummary.length) : 0;

  return (
    <AppLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            History
          </h1>
        </motion.div>

        {/* Week Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(subDays(selectedDate, 7))}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <span className="font-medium text-foreground">
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  disabled={isSameDay(weekEnd, new Date()) || weekEnd > new Date()}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              {/* Day Pills */}
              <div className="grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const isFuture = day > new Date();
                  const dayCalories = getCaloriesForDay(day);
                  const percentage = Math.min((dayCalories / calorieTarget) * 100, 100);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => !isFuture && setSelectedDate(day)}
                      disabled={isFuture}
                      className={`p-2 rounded-xl transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : isFuture
                          ? 'bg-muted/50 text-muted-foreground/50'
                          : 'bg-muted hover:bg-muted/80 text-foreground'
                      }`}
                    >
                      {/* Progress indicator */}
                      {!isFuture && !isSelected && dayCalories > 0 && (
                        <motion.div
                          className="absolute bottom-0 left-0 right-0 bg-primary/20"
                          initial={{ height: 0 }}
                          animate={{ height: `${percentage}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      <div className="relative z-10">
                        <div className="text-xs font-medium">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-lg font-bold ${isToday && !isSelected ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                Weekly Summary
              </h2>
              {weeklyLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <div className="text-2xl font-bold text-foreground">
                      {formatCalories(weeklyTotal)}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Calories</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {formatCalories(weeklyAverage)}
                    </div>
                    <div className="text-xs text-muted-foreground">Daily Average</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Selected Day Details */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'EEEE, MMM d')}
            </h2>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Flame className="h-4 w-4 text-accent" />
              {formatCalories(dailySummary.total_calories)} cal
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : logs && logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <FoodLogCard
                  key={log.id}
                  log={log}
                  onDelete={deleteFoodLog}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-4xl mb-2">🍽️</div>
                <p className="text-muted-foreground">No meals logged for this day</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
