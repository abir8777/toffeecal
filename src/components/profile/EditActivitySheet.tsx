import { useState } from 'react';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

interface EditActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLevel: ActivityLevel | null;
  onSave: (level: ActivityLevel) => void;
  isLoading?: boolean;
}

const activityLevels = [
  { value: 'sedentary' as const, label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light' as const, label: 'Lightly Active', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate' as const, label: 'Moderately Active', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active' as const, label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active' as const, label: 'Very Active', description: 'Very hard exercise & physical job' },
];

export function EditActivitySheet({ open, onOpenChange, currentLevel, onSave, isLoading }: EditActivitySheetProps) {
  const [selected, setSelected] = useState<ActivityLevel | null>(currentLevel);

  const handleSave = () => {
    if (selected) {
      onSave(selected);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Activity Level</SheetTitle>
          <SheetDescription>
            Select your typical weekly activity level.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-3">
          {activityLevels.map((level) => {
            const isSelected = selected === level.value;
            
            return (
              <button
                key={level.value}
                onClick={() => setSelected(level.value)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/50"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  isSelected ? "bg-primary/10" : "bg-secondary"
                )}>
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground block">{level.label}</span>
                  <span className="text-xs text-muted-foreground">{level.description}</span>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
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
