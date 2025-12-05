import { useGetMyTransactions, useGetMyPendingTransactions, useCancelTransaction } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, X, AlertCircle } from 'lucide-react';
import { TransactionStatus, TransactionType } from '../backend';
import type { Transaction } from '../backend';

export default function MyTransactions() {
    const { data: allTransactions, isLoading: allLoading } = useGetMyTransactions();
    const { data: pendingTransactions, isLoading: pendingLoading } = useGetMyPendingTransactions();
    const { mutate: cancelTransaction, isPending: isCancelling } = useCancelTransaction();

    const isLoading = allLoading || pendingLoading;

    if (isLoading) {
        return (
            <Card>
                <CardContent className="flex min-h-[400px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
                <TabsTrigger value="all">
                    All Transactions ({allTransactions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="pending">
                    Pending ({pendingTransactions?.length || 0})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
                <Card>
                    <CardHeader>
                        <CardTitle>All Transactions</CardTitle>
                        <CardDescription>Complete history of your fund transactions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!allTransactions || allTransactions.length === 0 ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
                                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">No transactions yet</p>
                            </div>
                        ) : (
                            <TransactionTable transactions={allTransactions} onCancel={cancelTransaction} isCancelling={isCancelling} />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="pending">
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Transactions</CardTitle>
                        <CardDescription>Transactions awaiting processing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {!pendingTransactions || pendingTransactions.length === 0 ? (
                            <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
                                <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">No pending transactions</p>
                            </div>
                        ) : (
                            <TransactionTable
                                transactions={pendingTransactions}
                                onCancel={cancelTransaction}
                                isCancelling={isCancelling}
                                showCancel
                            />
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    );
}

function TransactionTable({
    transactions,
    onCancel,
    isCancelling,
    showCancel = false,
}: {
    transactions: Transaction[];
    onCancel: (txId: bigint) => void;
    isCancelling: boolean;
    showCancel?: boolean;
}) {
    const getStatusBadge = (status: TransactionStatus) => {
        if (status === TransactionStatus.pending) return <Badge variant="outline">Pending</Badge>;
        if (status === TransactionStatus.processed) return <Badge className="bg-green-500">Processed</Badge>;
        if (status === TransactionStatus.cancelled) return <Badge variant="destructive">Cancelled</Badge>;
        return <Badge>Unknown</Badge>;
    };

    const getTypeBadge = (txType: TransactionType) => {
        if (txType === TransactionType.deposit) return <Badge variant="outline" className="bg-green-500/10">Deposit</Badge>;
        if (txType === TransactionType.redemption) return <Badge variant="outline" className="bg-orange-500/10">Redemption</Badge>;
        return <Badge>Unknown</Badge>;
    };

    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fund ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        {showCancel && <TableHead>Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((tx) => (
                        <TableRow key={tx.id.toString()}>
                            <TableCell className="font-mono text-xs">{tx.id.toString()}</TableCell>
                            <TableCell>{tx.fundId.toString()}</TableCell>
                            <TableCell>{getTypeBadge(tx.txType)}</TableCell>
                            <TableCell className="font-semibold">${tx.amount.toFixed(2)}</TableCell>
                            <TableCell>{getStatusBadge(tx.status)}</TableCell>
                            <TableCell className="text-sm">
                                {new Date(Number(tx.timestamp) / 1_000_000).toLocaleString()}
                            </TableCell>
                            {showCancel && (
                                <TableCell>
                                    {tx.status === TransactionStatus.pending && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onCancel(tx.id)}
                                            disabled={isCancelling}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            )}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
