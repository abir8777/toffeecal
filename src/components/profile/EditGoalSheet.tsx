import { useState } from 'react';
import { TrendingDown, Minus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface EditGoalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentGoal: 'lose_weight' | 'maintain' | 'gain_muscle' | null;
  onSave: (goal: 'lose_weight' | 'maintain' | 'gain_muscle') => void;
  isLoading?: boolean;
}

const goals = [
  { value: 'lose_weight' as const, label: 'Lose Weight', icon: TrendingDown, color: 'text-accent' },
  { value: 'maintain' as const, label: 'Maintain Weight', icon: Minus, color: 'text-primary' },
  { value: 'gain_muscle' as const, label: 'Build Muscle', icon: TrendingUp, color: 'text-protein' },
];

export function EditGoalSheet({ open, onOpenChange, currentGoal, onSave, isLoading }: EditGoalSheetProps) {
  const [selected, setSelected] = useState<typeof currentGoal>(currentGoal);

  const handleSave = () => {
    if (selected) {
      onSave(selected);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Choose Your Goal</SheetTitle>
          <SheetDescription>
            Select your fitness goal to calculate your daily calorie target.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {goals.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selected === goal.value;
            
            return (
              <button
                key={goal.value}
                onClick={() => setSelected(goal.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  isSelected ? "bg-primary/10" : "bg-secondary"
                )}>
                  <Icon className={cn("h-6 w-6", goal.color)} />
                </div>
                <span className="font-medium text-foreground">{goal.label}</span>
                {isSelected && (
                  <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button 
          className="w-full mt-6 h-12 rounded-xl" 
          onClick={handleSave}
          disabled={!selected || isLoading}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
