import { useState } from 'react';
import { useGetAllFunds, useGetAllFundStates, useIsCallerAdmin } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FundsOverview from '../components/FundsOverview';
import CreateFundDialog from '../components/CreateFundDialog';
import MyTransactions from '../components/MyTransactions';
import AdminPanel from '../components/AdminPanel';
import MarketplacePage from '../components/MarketplacePage';
import { Button } from '@/components/ui/button';
import { Plus, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const { data: funds, isLoading: fundsLoading } = useGetAllFunds();
    const { data: fundStates, isLoading: statesLoading } = useGetAllFundStates();
    const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

    const isLoading = fundsLoading || statesLoading || adminLoading;

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground">Manage your hedge fund investments and operations</p>
                </div>
                {isAdmin && (
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Fund
                    </Button>
                )}
            </div>

            <Tabs defaultValue="marketplace" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                    <TabsTrigger value="overview">My Funds</TabsTrigger>
                    <TabsTrigger value="transactions">My Transactions</TabsTrigger>
                    {isAdmin && <TabsTrigger value="admin">Admin Panel</TabsTrigger>}
                </TabsList>

                <TabsContent value="marketplace" className="space-y-6">
                    <MarketplacePage />
                </TabsContent>

                <TabsContent value="overview" className="space-y-6">
                    <FundsOverview funds={funds || []} fundStates={fundStates || []} />
                </TabsContent>

                <TabsContent value="transactions">
                    <MyTransactions />
                </TabsContent>

                {isAdmin && (
                    <TabsContent value="admin">
                        <AdminPanel />
                    </TabsContent>
                )}
            </Tabs>

            <CreateFundDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        </div>
    );
}
