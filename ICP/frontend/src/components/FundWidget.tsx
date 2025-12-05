import { useGetFundConfig, useGetFundState, useGetFundTransactions } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Users, Coins, Activity } from 'lucide-react';
import { TransactionType, TransactionStatus } from '../backend';
import type { FundId } from '../backend';

interface FundWidgetProps {
    fundId: FundId;
    compact?: boolean;
}

export default function FundWidget({ fundId, compact = false }: FundWidgetProps) {
    const { data: config, isLoading: configLoading } = useGetFundConfig(fundId);
    const { data: state, isLoading: stateLoading } = useGetFundState(fundId);
    const { data: transactions, isLoading: txLoading } = useGetFundTransactions(fundId);

    const isLoading = configLoading || stateLoading || txLoading;

    if (isLoading) {
        return (
            <Card className="w-full max-w-md">
                <CardContent className="flex min-h-[300px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    if (!config || !state) {
        return (
            <Card className="w-full max-w-md">
                <CardContent className="flex min-h-[300px] items-center justify-center">
                    <p className="text-sm text-muted-foreground">Fund not found</p>
                </CardContent>
            </Card>
        );
    }

    const recentTransactions = transactions?.slice(-5).reverse() || [];

    return (
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <CardTitle className="mb-2">{config.name}</CardTitle>
                        <CardDescription>Fund ID: {fundId.toString()}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                        {config.isPaused && (
                            <Badge variant="destructive">Paused</Badge>
                        )}
                        <Badge variant="outline" className="gap-1">
                            <Coins className="h-3 w-3" />
                            {config.baseToken}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
                {/* Live Metrics */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            <span>AUM</span>
                        </div>
                        <span className="text-lg font-semibold">
                            ${state.aum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <TrendingUp className="h-4 w-4" />
                            <span>NAV/Share</span>
                        </div>
                        <span className="text-lg font-semibold">${state.nav.toFixed(4)}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>Total Shares</span>
                        </div>
                        <span className="text-lg font-semibold">
                            {state.totalShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                    </div>
                </div>

                {/* Recent Transactions */}
                {!compact && recentTransactions.length > 0 && (
                    <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <h4 className="text-sm font-semibold">Recent Activity</h4>
                        </div>
                        <div className="space-y-2">
                            {recentTransactions.map((tx) => (
                                <div key={tx.id.toString()} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <Badge
                                            variant={tx.txType === TransactionType.deposit ? "default" : "secondary"}
                                            className="text-xs"
                                        >
                                            {tx.txType === TransactionType.deposit ? 'Deposit' : 'Redemption'}
                                        </Badge>
                                        <span className="text-muted-foreground">
                                            ${tx.amount.toFixed(2)}
                                        </span>
                                    </div>
                                    <Badge
                                        variant={tx.status === TransactionStatus.processed ? "outline" : "secondary"}
                                        className="text-xs"
                                    >
                                        {tx.status === TransactionStatus.processed ? 'Processed' :
                                            tx.status === TransactionStatus.pending ? 'Pending' : 'Cancelled'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Embed Info */}
                <div className="pt-4 border-t">
                    <p className="text-xs text-center text-muted-foreground">
                        Powered by ICP Hedge Fund Platform
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
