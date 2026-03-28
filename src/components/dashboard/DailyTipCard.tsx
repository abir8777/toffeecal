import { Lightbulb, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { memo } from 'react';

interface DailyTipCardProps {
  tip: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export const DailyTipCard = memo(function DailyTipCard({ tip, isLoading, onRefresh }: DailyTipCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tip) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-semibold text-foreground">Daily Tip</h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  localStorage.removeItem(`daily-tip-${today}`);
                  onRefresh();
                }}
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{tip}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
