import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGetFundConfig, useGetFundState } from '../hooks/useQueries';
import { TrendingUp, DollarSign, Eye, Coins } from 'lucide-react';
import FundPerformanceChart from './FundPerformanceChart';
import type { FundId } from '../backend';

interface InvestorPortfolioViewProps {
    portfolioSummary: Array<[FundId, number, number]>;
    onViewFund: (fundId: FundId) => void;
}

export default function InvestorPortfolioView({ portfolioSummary, onViewFund }: InvestorPortfolioViewProps) {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {portfolioSummary.map(([fundId, shares, value]) => (
                <PortfolioFundCard
                    key={fundId.toString()}
                    fundId={fundId}
                    shares={shares}
                    value={value}
                    onViewFund={onViewFund}
                />
            ))}
        </div>
    );
}

function PortfolioFundCard({
    fundId,
    shares,
    value,
    onViewFund,
}: {
    fundId: FundId;
    shares: number;
    value: number;
    onViewFund: (fundId: FundId) => void;
}) {
    const { data: config } = useGetFundConfig(fundId);
    const { data: state } = useGetFundState(fundId);

    if (!config || !state) {
        return null;
    }

    const hasHistoricalData = state.historicalAUM && state.historicalAUM.length > 1;

    return (
        <Card className="overflow-hidden transition-all hover:shadow-lg">
            <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="mb-2">{config.name}</CardTitle>
                        <CardDescription className="text-xs">Fund ID: {fundId.toString()}</CardDescription>
                    </div>
                    <Badge variant="outline" className="gap-1">
                        <Coins className="h-3 w-3" />
                        {config.baseToken}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
                {/* Performance Chart */}
                {hasHistoricalData && (
                    <div className="h-24 -mx-2">
                        <FundPerformanceChart data={state.historicalAUM} compact />
                    </div>
                )}

                {/* Position Details */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>Position Value</span>
                        </div>
                        <span className="text-lg font-semibold">
                            ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>Shares Owned</span>
                        </div>
                        <span className="text-lg font-semibold">
                            {shares.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>NAV/Share</span>
                        </div>
                        <span className="text-lg font-semibold">${state.nav.toFixed(4)}</span>
                    </div>
                </div>

                {/* Action Button */}
                <div className="pt-2">
                    <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => onViewFund(fundId)}
                    >
                        <Eye className="h-4 w-4" />
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
