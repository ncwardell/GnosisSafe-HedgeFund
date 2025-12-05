import { useState, useMemo } from 'react';
import { useGetMarketplaceFunds } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, DollarSign, Users, Search, Mail, Globe, AlertCircle, MessageCircle, Coins } from 'lucide-react';
import FundDetailsDialog from './FundDetailsDialog';
import FundPerformanceChart from './FundPerformanceChart';
import type { FundId } from '../backend';

export default function MarketplacePage() {
    const { data: marketplaceFunds, isLoading } = useGetMarketplaceFunds();
    const [selectedFundId, setSelectedFundId] = useState<FundId | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'aum' | 'nav' | 'name'>('aum');

    const filteredAndSortedFunds = useMemo(() => {
        if (!marketplaceFunds) return [];

        let filtered = marketplaceFunds.filter(([_, config]) =>
            config.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        filtered.sort((a, b) => {
            const [, configA, stateA] = a;
            const [, configB, stateB] = b;

            switch (sortBy) {
                case 'aum':
                    return stateB.aum - stateA.aum;
                case 'nav':
                    return stateB.nav - stateA.nav;
                case 'name':
                    return configA.name.localeCompare(configB.name);
                default:
                    return 0;
            }
        });

        return filtered;
    }, [marketplaceFunds, searchQuery, sortBy]);

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading marketplace...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8 mb-8">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/assets/generated/marketplace-hero.dim_1200x600.png" alt="Marketplace" className="h-16 w-16 rounded-lg" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Hedge Fund Marketplace</h2>
                            <p className="text-muted-foreground">Discover and invest in top-performing hedge funds</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search funds by name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="aum">Sort by AUM</SelectItem>
                        <SelectItem value="nav">Sort by NAV</SelectItem>
                        <SelectItem value="name">Sort by Name</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Fund Grid */}
            {filteredAndSortedFunds.length === 0 ? (
                <Card>
                    <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-12">
                        <div className="rounded-full bg-muted p-4">
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                            <h3 className="mb-2 text-lg font-semibold">No Funds Found</h3>
                            <p className="text-sm text-muted-foreground">
                                {searchQuery ? 'Try adjusting your search criteria' : 'No funds are currently available in the marketplace'}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {filteredAndSortedFunds.map(([fundId, config, state]) => {
                        const hasHistoricalData = state.historicalAUM && state.historicalAUM.length > 1;
                        const growth = hasHistoricalData
                            ? ((state.aum - state.historicalAUM[0].aum) / state.historicalAUM[0].aum) * 100
                            : 0;

                        return (
                            <Card key={fundId.toString()} className="overflow-hidden transition-all hover:shadow-lg group">
                                <CardHeader className="border-b bg-gradient-to-br from-primary/5 to-accent/5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <CardTitle className="mb-2 group-hover:text-primary transition-colors">
                                                {config.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">Fund ID: {fundId.toString()}</CardDescription>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            {config.isPaused && (
                                                <Badge variant="destructive" className="ml-2">
                                                    Paused
                                                </Badge>
                                            )}
                                            <Badge variant="outline" className="gap-1 ml-2">
                                                <Coins className="h-3 w-3" />
                                                {config.baseToken}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-6 space-y-4">
                                    {/* Performance Chart */}
                                    {hasHistoricalData && (
                                        <div className="h-24 -mx-2">
                                            <FundPerformanceChart data={state.historicalAUM} compact />
                                        </div>
                                    )}

                                    {/* Metrics */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <DollarSign className="h-4 w-4" />
                                                <span>AUM</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-semibold">
                                                    ${state.aum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </span>
                                                {hasHistoricalData && (
                                                    <div className={`text-xs ${growth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                        {growth >= 0 ? '+' : ''}{growth.toFixed(2)}%
                                                    </div>
                                                )}
                                            </div>
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

                                    {/* Processing Mode Badges */}
                                    <div className="flex gap-2 pt-2 border-t">
                                        <Badge variant={config.autoDeposit ? "default" : "secondary"} className="text-xs">
                                            {config.autoDeposit ? "Auto" : "Manual"} Deposits
                                        </Badge>
                                        <Badge variant={config.autoWithdrawal ? "default" : "secondary"} className="text-xs">
                                            {config.autoWithdrawal ? "Auto" : "Manual"} Withdrawals
                                        </Badge>
                                    </div>

                                    {/* Creator Metadata */}
                                    {(config.creatorMetadata.website || config.creatorMetadata.contactEmail || config.creatorMetadata.telegramHandle || config.creatorMetadata.description) && (
                                        <div className="pt-3 border-t space-y-2">
                                            {config.creatorMetadata.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {config.creatorMetadata.description}
                                                </p>
                                            )}
                                            <div className="flex flex-wrap gap-2">
                                                {config.creatorMetadata.website && (
                                                    <a
                                                        href={config.creatorMetadata.website}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Globe className="h-3 w-3" />
                                                        Website
                                                    </a>
                                                )}
                                                {config.creatorMetadata.contactEmail && (
                                                    <a
                                                        href={`mailto:${config.creatorMetadata.contactEmail}`}
                                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Mail className="h-3 w-3" />
                                                        Contact
                                                    </a>
                                                )}
                                                {config.creatorMetadata.telegramHandle && (
                                                    <a
                                                        href={`https://t.me/${config.creatorMetadata.telegramHandle.replace('@', '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <MessageCircle className="h-3 w-3" />
                                                        Telegram
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="pt-2">
                                        <Button
                                            variant="default"
                                            className="w-full"
                                            onClick={() => setSelectedFundId(fundId)}
                                            disabled={config.isPaused}
                                        >
                                            {config.isPaused ? 'Fund Paused' : 'View & Invest'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {selectedFundId !== null && (
                <FundDetailsDialog fundId={selectedFundId} open={true} onOpenChange={() => setSelectedFundId(null)} />
            )}
        </>
    );
}
