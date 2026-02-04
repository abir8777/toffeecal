import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, Plus, Sparkles } from 'lucide-react';
import { useWaterIntake, calculateWaterGoal } from '@/hooks/useWaterIntake';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface WaterIntakeCardProps {
  weightKg: number | null | undefined;
  dailyGoal: number | null | undefined;
}

const QUICK_ADD_OPTIONS = [150, 250, 500];

export function WaterIntakeCard({ weightKg, dailyGoal }: WaterIntakeCardProps) {
  const { totalToday, isLoading, addWaterIntake, isAdding } = useWaterIntake();
  const [showOptions, setShowOptions] = useState(false);

  const aiGoal = calculateWaterGoal(weightKg);
  const goal = dailyGoal || aiGoal;
  const progress = Math.min((totalToday / goal) * 100, 100);
  const remaining = Math.max(goal - totalToday, 0);

  const handleAddWater = (amount: number) => {
    addWaterIntake(amount, {
      onSuccess: () => {
        toast.success(`Added ${amount}ml of water`);
        setShowOptions(false);
      },
      onError: () => {
        toast.error('Failed to log water intake');
      },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Droplets className="h-4 w-4 text-primary" />
          </div>
            <div>
              <h3 className="font-medium text-sm">Water Intake</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-accent" />
                AI Goal: {(goal / 1000).toFixed(1)}L
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showOptions && (
          <div className="flex gap-2 mb-3">
            {QUICK_ADD_OPTIONS.map((amount) => (
              <Button
                key={amount}
                size="sm"
                variant="secondary"
                className="flex-1 text-xs"
                onClick={() => handleAddWater(amount)}
                disabled={isAdding}
              >
                {amount}ml
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {(totalToday / 1000).toFixed(1)}L / {(goal / 1000).toFixed(1)}L
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {remaining > 0 
              ? `${(remaining / 1000).toFixed(1)}L remaining today`
              : '🎉 Goal reached!'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
