import { motion } from 'framer-motion';
import { Trash2, Flame, Beef, Wheat, Droplets } from 'lucide-react';
import { FoodLog } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FoodLogCardProps {
  log: FoodLog;
  onDelete?: (id: string) => void;
}

const mealTypeIcons = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

export function FoodLogCard({ log, onDelete }: FoodLogCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      layout
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{mealTypeIcons[log.meal_type]}</span>
                <h3 className="font-semibold text-foreground truncate">
                  {log.food_name}
                </h3>
              </div>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-accent" />
                  {log.calories} cal
                </span>
                <span className="flex items-center gap-1">
                  <Beef className="h-3.5 w-3.5 text-protein" />
                  {log.protein_g}g
                </span>
                <span className="flex items-center gap-1">
                  <Wheat className="h-3.5 w-3.5 text-carbs" />
                  {log.carbs_g}g
                </span>
                <span className="flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5 text-fat" />
                  {log.fat_g}g
                </span>
              </div>
              
              {log.calories_min && log.calories_max && (
                <p className="text-xs text-muted-foreground mt-1">
                  Range: {log.calories_min} - {log.calories_max} cal
                </p>
              )}
            </div>
            
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(log.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {log.ai_suggestions && (
            <div className="mt-3 p-3 rounded-lg bg-secondary/50">
              <p className="text-xs text-secondary-foreground">
                💡 {log.ai_suggestions}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
