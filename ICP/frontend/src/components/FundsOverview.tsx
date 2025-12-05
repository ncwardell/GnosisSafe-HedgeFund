import { useState } from 'react';
import type { FundId, FundConfig, FundState } from '../backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react';
import FundDetailsDialog from './FundDetailsDialog';

interface FundsOverviewProps {
    funds: Array<[FundId, FundConfig]>;
    fundStates: Array<[FundId, FundState]>;
}

export default function FundsOverview({ funds, fundStates }: FundsOverviewProps) {
    const [selectedFundId, setSelectedFundId] = useState<FundId | null>(null);

    const getStateForFund = (fundId: FundId): FundState | undefined => {
        return fundStates.find(([id]) => id === fundId)?.[1];
    };

    if (funds.length === 0) {
        return (
            <Card>
                <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-12">
                    <div className="rounded-full bg-muted p-4">
                        <AlertCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="text-center">
                        <h3 className="mb-2 text-lg font-semibold">No Funds Available</h3>
                        <p className="text-sm text-muted-foreground">
                            There are currently no hedge funds available. Check back later or contact an administrator.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {funds.map(([fundId, config]) => {
                    const state = getStateForFund(fundId);
                    return (
                        <Card key={fundId.toString()} className="overflow-hidden transition-all hover:shadow-lg">
                            <CardHeader className="border-b bg-muted/30">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="mb-2">{config.name}</CardTitle>
                                        <CardDescription>Fund ID: {fundId.toString()}</CardDescription>
                                    </div>
                                    {config.isPaused && (
                                        <Badge variant="destructive" className="ml-2">
                                            Paused
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <DollarSign className="h-4 w-4" />
                                            <span>AUM</span>
                                        </div>
                                        <span className="text-lg font-semibold">
                                            ${state ? state.aum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <TrendingUp className="h-4 w-4" />
                                            <span>NAV/Share</span>
                                        </div>
                                        <span className="text-lg font-semibold">
                                            ${state ? state.nav.toFixed(4) : '1.0000'}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Users className="h-4 w-4" />
                                            <span>Total Shares</span>
                                        </div>
                                        <span className="text-lg font-semibold">
                                            {state ? state.totalShares.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'}
                                        </span>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setSelectedFundId(fundId)}
                                            disabled={config.isPaused}
                                        >
                                            View Details
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {selectedFundId !== null && (
                <FundDetailsDialog fundId={selectedFundId} open={true} onOpenChange={() => setSelectedFundId(null)} />
            )}
        </>
    );
}
