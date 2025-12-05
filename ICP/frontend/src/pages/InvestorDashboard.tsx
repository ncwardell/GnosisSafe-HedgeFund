import { useState } from 'react';
import { useGetMyInvestedFunds, useGetMyPortfolioSummary, useGetFundConfig, useGetFundState } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, DollarSign, Briefcase, FileText, AlertCircle, Eye } from 'lucide-react';
import MyTransactions from '../components/MyTransactions';
import FundDetailsDialog from '../components/FundDetailsDialog';
import InvestorPortfolioView from '../components/InvestorPortfolioView';
import type { FundId } from '../backend';

export default function InvestorDashboard() {
    const { data: investedFunds, isLoading: fundsLoading } = useGetMyInvestedFunds();
    const { data: portfolioSummary, isLoading: portfolioLoading } = useGetMyPortfolioSummary();
    const [selectedFundId, setSelectedFundId] = useState<FundId | null>(null);

    const isLoading = fundsLoading || portfolioLoading;

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalPortfolioValue = portfolioSummary?.reduce((sum, [, , value]) => sum + value, 0) || 0;
    const totalFunds = investedFunds?.length || 0;

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/assets/generated/investor-dashboard-hero.dim_1200x600.png" alt="Investor Dashboard" className="h-16 w-16 rounded-lg" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Investor Dashboard</h2>
                            <p className="text-muted-foreground">Track your investments and portfolio performance</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalPortfolioValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground">Current market value</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Invested Funds</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFunds}</div>
                        <p className="text-xs text-muted-foreground">Active positions</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Portfolio Status</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Badge className="bg-green-500">Active</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">All positions healthy</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            {totalFunds === 0 ? (
                <Card>
                    <CardContent className="flex min-h-[400px] flex-col items-center justify-center gap-4 py-12">
                        <div className="rounded-full bg-muted p-4">
                            <AlertCircle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="text-center">
                            <h3 className="mb-2 text-lg font-semibold">No Investments Yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Start investing by browsing the marketplace and selecting funds that match your investment goals.
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                Browse Marketplace
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue="portfolio" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="portfolio" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            Portfolio
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Transactions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="portfolio" className="space-y-4">
                        <InvestorPortfolioView
                            portfolioSummary={portfolioSummary || []}
                            onViewFund={setSelectedFundId}
                        />
                    </TabsContent>

                    <TabsContent value="transactions">
                        <MyTransactions />
                    </TabsContent>
                </Tabs>
            )}

            {selectedFundId !== null && (
                <FundDetailsDialog fundId={selectedFundId} open={true} onOpenChange={() => setSelectedFundId(null)} />
            )}
        </div>
    );
}
