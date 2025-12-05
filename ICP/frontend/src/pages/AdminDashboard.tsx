import { useState } from 'react';
import { useGetAllFunds, useGetAllFundStates, useGetPendingTransactions } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Users, Activity, Settings, FileText } from 'lucide-react';
import FundsOverview from '../components/FundsOverview';
import AdminPanel from '../components/AdminPanel';
import MyTransactions from '../components/MyTransactions';
import FundDetailsDialog from '../components/FundDetailsDialog';
import type { FundId } from '../backend';

export default function AdminDashboard() {
    const { data: funds, isLoading: fundsLoading } = useGetAllFunds();
    const { data: fundStates, isLoading: statesLoading } = useGetAllFundStates();
    const { data: pendingTransactions } = useGetPendingTransactions();
    const [selectedFundId, setSelectedFundId] = useState<FundId | null>(null);

    const isLoading = fundsLoading || statesLoading;

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalAUM = fundStates?.reduce((sum, [, state]) => sum + state.aum, 0) || 0;
    const totalFunds = funds?.length || 0;
    const activeFunds = funds?.filter(([, config]) => !config.isPaused).length || 0;
    const pendingTxCount = pendingTransactions?.length || 0;

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/5 to-background p-8">
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                        <img src="/assets/generated/admin-dashboard-hero.dim_1200x800.png" alt="Admin Dashboard" className="h-16 w-16 rounded-lg" />
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
                            <p className="text-muted-foreground">Manage funds, operations, and platform settings</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total AUM</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${totalAUM.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Across all funds</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Funds</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFunds}</div>
                        <p className="text-xs text-muted-foreground">{activeFunds} active</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingTxCount}</div>
                        <p className="text-xs text-muted-foreground">Awaiting processing</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Platform Status</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <Badge className="bg-green-500">Operational</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">All systems running</p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="funds" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="funds" className="gap-2">
                        <TrendingUp className="h-4 w-4" />
                        My Funds
                    </TabsTrigger>
                    <TabsTrigger value="operations" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Operations
                    </TabsTrigger>
                    <TabsTrigger value="transactions" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Transactions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="funds" className="space-y-4">
                    <FundsOverview funds={funds || []} fundStates={fundStates || []} />
                </TabsContent>

                <TabsContent value="operations">
                    <AdminPanel />
                </TabsContent>

                <TabsContent value="transactions">
                    <MyTransactions />
                </TabsContent>
            </Tabs>

            {selectedFundId !== null && (
                <FundDetailsDialog fundId={selectedFundId} open={true} onOpenChange={() => setSelectedFundId(null)} />
            )}
        </div>
    );
}
