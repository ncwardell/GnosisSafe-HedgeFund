import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { AUMRecord } from '../backend';

interface FundPerformanceChartProps {
    data: AUMRecord[];
    compact?: boolean;
}

export default function FundPerformanceChart({ data, compact = false }: FundPerformanceChartProps) {
    const chartData = useMemo(() => {
        return data.map((record) => ({
            timestamp: Number(record.timestamp) / 1_000_000,
            aum: record.aum,
            date: new Date(Number(record.timestamp) / 1_000_000).toLocaleDateString(),
        }));
    }, [data]);

    if (chartData.length === 0) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No historical data available
            </div>
        );
    }

    const minAUM = Math.min(...chartData.map((d) => d.aum));
    const maxAUM = Math.max(...chartData.map((d) => d.aum));
    const isPositiveGrowth = chartData[chartData.length - 1].aum >= chartData[0].aum;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                {!compact && (
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                    />
                )}
                {!compact && (
                    <YAxis
                        domain={[minAUM * 0.95, maxAUM * 1.05]}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                        tickLine={false}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                )}
                {!compact && (
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '0.5rem',
                            fontSize: '12px',
                        }}
                        labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                        formatter={(value: number) => [`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'AUM']}
                    />
                )}
                <Line
                    type="monotone"
                    dataKey="aum"
                    stroke={isPositiveGrowth ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'}
                    strokeWidth={compact ? 1.5 : 2}
                    dot={!compact}
                    activeDot={!compact ? { r: 4 } : false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
