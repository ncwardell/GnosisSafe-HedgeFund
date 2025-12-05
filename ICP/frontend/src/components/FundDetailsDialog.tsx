import { useState } from 'react';
import type { FundId } from '../backend';
import { useGetFundConfig, useGetFundState, useCalculateFees } from '../hooks/useQueries';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Globe, Mail, MessageCircle, Coins, Settings } from 'lucide-react';
import TransactionForm from './TransactionForm';
import FundPerformanceChart from './FundPerformanceChart';
import TimelockProposalsPanel from './TimelockProposalsPanel';

interface FundDetailsDialogProps {
    fundId: FundId;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function FundDetailsDialog({ fundId, open, onOpenChange }: FundDetailsDialogProps) {
    const { data: config, isLoading: configLoading } = useGetFundConfig(fundId);
    const { data: state, isLoading: stateLoading } = useGetFundState(fundId);
    const { data: calculatedFees, isLoading: feesLoading } = useCalculateFees(fundId);

    const isLoading = configLoading || stateLoading || feesLoading;

    if (isLoading || !config || !state) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl">
                    <div className="flex min-h-[400px] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    const hasHistoricalData = state.historicalAUM && state.historicalAUM.length > 1;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl">{config.name}</DialogTitle>
                        <div className="flex gap-2">
                            {config.isPaused && (
                                <Badge variant="destructive">Paused</Badge>
                            )}
                            <Badge variant="outline" className="gap-1">
                                <Coins className="h-3 w-3" />
                                {config.baseToken}
                            </Badge>
                        </div>
                    </div>
                    <DialogDescription>Fund ID: {fundId.toString()}</DialogDescription>
                </DialogHeader>

                {/* Creator Metadata */}
                {(config.creatorMetadata.description || config.creatorMetadata.website || config.creatorMetadata.contactEmail || config.creatorMetadata.telegramHandle) && (
                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                        {config.creatorMetadata.description && (
                            <p className="text-sm text-muted-foreground">{config.creatorMetadata.description}</p>
                        )}
                        {(config.creatorMetadata.website || config.creatorMetadata.contactEmail || config.creatorMetadata.telegramHandle) && (
                            <div className="flex flex-wrap gap-4">
                                {config.creatorMetadata.website && (
                                    <a
                                        href={config.creatorMetadata.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <Globe className="h-4 w-4" />
                                        Visit Website
                                    </a>
                                )}
                                {config.creatorMetadata.contactEmail && (
                                    <a
                                        href={`mailto:${config.creatorMetadata.contactEmail}`}
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Contact Fund
                                    </a>
                                )}
                                {config.creatorMetadata.telegramHandle && (
                                    <a
                                        href={`https://t.me/${config.creatorMetadata.telegramHandle.replace('@', '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        {config.creatorMetadata.telegramHandle}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <Tabs defaultValue="overview" className="mt-4">
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="performance">Performance</TabsTrigger>
                        <TabsTrigger value="fees">Fees</TabsTrigger>
                        <TabsTrigger value="invest">Invest</TabsTrigger>
                        <TabsTrigger value="settings">
                            <Settings className="h-4 w-4" />
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Fund Metrics</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Assets Under Management</p>
                                        <p className="text-2xl font-bold">
                                            ${state.aum.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">NAV per Share</p>
                                        <p className="text-2xl font-bold">${state.nav.toFixed(4)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Shares Outstanding</p>
                                        <p className="text-2xl font-bold">
                                            {state.totalShares.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Accrued Fees</p>
                                        <p className="text-2xl font-bold">
                                            ${state.accruedFees.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Base Token</p>
                                        <p className="text-lg font-semibold">{config.baseToken}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">High Water Mark</p>
                                        <p className="text-lg font-semibold">${config.highWaterMark.toFixed(4)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Minimum Investment</p>
                                        <p className="text-lg font-semibold">
                                            ${Number(config.minInvestment).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Last Updated</p>
                                        <p className="text-lg font-semibold">
                                            {new Date(Number(state.lastUpdated) / 1_000_000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <span className="text-sm text-muted-foreground">Deposit Processing</span>
                                        <Badge variant={config.autoDeposit ? "default" : "secondary"}>
                                            {config.autoDeposit ? "Automatic" : "Manual"}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <span className="text-sm text-muted-foreground">Withdrawal Processing</span>
                                        <Badge variant={config.autoWithdrawal ? "default" : "secondary"}>
                                            {config.autoWithdrawal ? "Automatic" : "Manual"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historical Performance</CardTitle>
                                <CardDescription>Assets Under Management over time</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {hasHistoricalData ? (
                                    <div className="h-[300px]">
                                        <FundPerformanceChart data={state.historicalAUM} />
                                    </div>
                                ) : (
                                    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                                        No historical performance data available yet
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="fees" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Fee Structure</CardTitle>
                                <CardDescription>All fees are expressed as percentages</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-muted-foreground">Management Fee</p>
                                        <p className="text-2xl font-bold">{(config.managementFee * 100).toFixed(2)}%</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-muted-foreground">Performance Fee</p>
                                        <p className="text-2xl font-bold">{(config.performanceFee * 100).toFixed(2)}%</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-muted-foreground">Entrance Fee</p>
                                        <p className="text-2xl font-bold">{(config.entranceFee * 100).toFixed(2)}%</p>
                                    </div>
                                    <div className="rounded-lg border p-4">
                                        <p className="text-sm font-medium text-muted-foreground">Exit Fee</p>
                                        <p className="text-2xl font-bold">{(config.exitFee * 100).toFixed(2)}%</p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="rounded-lg bg-muted/50 p-4">
                                    <p className="text-sm font-medium text-muted-foreground">Calculated Fees (Current Period)</p>
                                    <p className="text-2xl font-bold">
                                        ${calculatedFees?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0.00'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="invest">
                        <TransactionForm fundId={fundId} config={config} state={state} />
                    </TabsContent>

                    <TabsContent value="settings">
                        <TimelockProposalsPanel fundId={fundId} config={config} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
