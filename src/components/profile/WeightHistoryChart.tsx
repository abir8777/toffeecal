import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface WeightLog {
  id: string;
  weight_kg: number;
  logged_at: string;
}

interface WeightHistoryChartProps {
  logs: WeightLog[] | undefined;
  isLoading: boolean;
}

const chartConfig = {
  weight: {
    label: 'Weight (kg)',
    color: 'hsl(var(--primary))',
  },
};

export function WeightHistoryChart({ logs, isLoading }: WeightHistoryChartProps) {
  const chartData = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    
    // Reverse to show oldest first (for chart)
    return [...logs].reverse().map((log) => ({
      date: format(parseISO(log.logged_at), 'MMM d'),
      fullDate: format(parseISO(log.logged_at), 'MMM d, yyyy'),
      weight: Number(log.weight_kg),
    }));
  }, [logs]);

  const trend = useMemo(() => {
    if (!logs || logs.length < 2) return null;
    const latest = Number(logs[0].weight_kg);
    const oldest = Number(logs[logs.length - 1].weight_kg);
    const diff = latest - oldest;
    return {
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same',
      value: Math.abs(diff).toFixed(1),
    };
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No weight data yet. Update your weight in Personal Info to start tracking.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Weight History</CardTitle>
          {trend && (
            <div className={`flex items-center gap-1 text-sm ${
              trend.direction === 'down' ? 'text-primary' : 
              trend.direction === 'up' ? 'text-accent' : 'text-muted-foreground'
            }`}>
              {trend.direction === 'down' && <TrendingDown className="h-4 w-4" />}
              {trend.direction === 'up' && <TrendingUp className="h-4 w-4" />}
              {trend.direction === 'same' && <Minus className="h-4 w-4" />}
              <span>{trend.value} kg</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-32 w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={['dataMin - 1', 'dataMax + 1']}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <ChartTooltip 
              content={<ChartTooltipContent labelKey="fullDate" />}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
