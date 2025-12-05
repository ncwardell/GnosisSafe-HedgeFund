import { useState } from 'react';
import { useIsCallerAdmin } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Briefcase, Plus, Loader2 } from 'lucide-react';
import AdminDashboard from './AdminDashboard';
import InvestorDashboard from './InvestorDashboard';
import MarketplacePage from '../components/MarketplacePage';
import CreateFundDialog from '../components/CreateFundDialog';

export default function DashboardRouter() {
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const { data: isAdmin, isLoading: adminLoading } = useIsCallerAdmin();

    if (adminLoading) {
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
                    <p className="text-muted-foreground">
                        {isAdmin ? 'Manage your hedge funds and operations' : 'Track your investments and portfolio'}
                    </p>
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
                    <TabsTrigger value="marketplace" className="gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Marketplace
                    </TabsTrigger>
                    {isAdmin ? (
                        <TabsTrigger value="admin" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            Admin Dashboard
                        </TabsTrigger>
                    ) : (
                        <TabsTrigger value="investor" className="gap-2">
                            <Briefcase className="h-4 w-4" />
                            My Portfolio
                        </TabsTrigger>
                    )}
                </TabsList>

                <TabsContent value="marketplace" className="space-y-6">
                    <MarketplacePage />
                </TabsContent>

                {isAdmin ? (
                    <TabsContent value="admin">
                        <AdminDashboard />
                    </TabsContent>
                ) : (
                    <TabsContent value="investor">
                        <InvestorDashboard />
                    </TabsContent>
                )}
            </Tabs>

            <CreateFundDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
        </div>
    );
}
