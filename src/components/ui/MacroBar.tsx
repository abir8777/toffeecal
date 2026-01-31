import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MacroBarProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  color: 'protein' | 'carbs' | 'fat';
}

const colorClasses = {
  protein: 'bg-protein',
  carbs: 'bg-carbs',
  fat: 'bg-fat',
};

const textColorClasses = {
  protein: 'text-protein',
  carbs: 'text-carbs',
  fat: 'text-fat',
};

export function MacroBar({ label, current, target, unit = 'g', color }: MacroBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className={cn("font-medium", textColorClasses[color])}>{label}</span>
        <span className="text-muted-foreground">
          {Math.round(current)}{unit} / {target}{unit}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
