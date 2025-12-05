import { useState } from 'react';
import { useGetPendingTransactions, useProcessTransaction, useUpdateAUM, usePauseFund, useResumeFund } from '../hooks/useQueries';
import { useGetAllFunds } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Pause, CheckCircle, AlertCircle } from 'lucide-react';
import { TransactionType } from '../backend';
import type { FundId } from '../backend';

export default function AdminPanel() {
  const { data: pendingTransactions, isLoading: txLoading } = useGetPendingTransactions();
  const { data: funds } = useGetAllFunds();
  const { mutate: processTransaction, isPending: isProcessing } = useProcessTransaction();

  return (
    <Tabs defaultValue="transactions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="transactions">Pending Transactions</TabsTrigger>
        <TabsTrigger value="aum">Update AUM</TabsTrigger>
        <TabsTrigger value="controls">Fund Controls</TabsTrigger>
      </TabsList>

      <TabsContent value="transactions">
        <Card>
          <CardHeader>
            <CardTitle>Pending Transactions</CardTitle>
            <CardDescription>Process pending deposits and redemptions</CardDescription>
          </CardHeader>
          <CardContent>
            {txLoading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !pendingTransactions || pendingTransactions.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-4">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <p className="text-sm text-muted-foreground">No pending transactions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>TX ID</TableHead>
                      <TableHead>Fund ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransactions.map((tx) => (
                      <TableRow key={tx.id.toString()}>
                        <TableCell className="font-mono text-xs">{tx.id.toString()}</TableCell>
                        <TableCell>{tx.fundId.toString()}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {tx.user.toString().slice(0, 10)}...
                        </TableCell>
                        <TableCell>
                          {tx.txType === TransactionType.deposit ? (
                            <Badge variant="outline" className="bg-green-500/10">Deposit</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-500/10">Redemption</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-semibold">${tx.amount.toFixed(2)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(Number(tx.timestamp) / 1_000_000).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => processTransaction(tx.id)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Process'
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="aum">
        <AUMUpdateForm funds={funds || []} />
      </TabsContent>

      <TabsContent value="controls">
        <FundControlsPanel funds={funds || []} />
      </TabsContent>
    </Tabs>
  );
}

function AUMUpdateForm({ funds }: { funds: Array<[FundId, any]> }) {
  const [selectedFund, setSelectedFund] = useState<string>('');
  const [newAUM, setNewAUM] = useState('');
  const { mutate: updateAUM, isPending } = useUpdateAUM();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFund || !newAUM) return;

    updateAUM(
      { fundId: BigInt(selectedFund), newAUM: parseFloat(newAUM) },
      {
        onSuccess: () => {
          setNewAUM('');
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update AUM</CardTitle>
        <CardDescription>Update the Assets Under Management for a fund</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fund">Select Fund</Label>
            <Select value={selectedFund} onValueChange={setSelectedFund}>
              <SelectTrigger id="fund">
                <SelectValue placeholder="Choose a fund" />
              </SelectTrigger>
              <SelectContent>
                {funds.map(([id, config]) => (
                  <SelectItem key={id.toString()} value={id.toString()}>
                    {config.name} (ID: {id.toString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aum">New AUM ($)</Label>
            <Input
              id="aum"
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter new AUM value"
              value={newAUM}
              onChange={(e) => setNewAUM(e.target.value)}
              disabled={isPending}
            />
          </div>

          <Button type="submit" disabled={!selectedFund || !newAUM || isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update AUM'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function FundControlsPanel({ funds }: { funds: Array<[FundId, any]> }) {
  const { mutate: pauseFund, isPending: isPausing } = usePauseFund();
  const { mutate: resumeFund, isPending: isResuming } = useResumeFund();

  if (funds.length === 0) {
    return (
      <Card>
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No funds available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fund Controls</CardTitle>
        <CardDescription>Pause or resume fund operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funds.map(([id, config]) => (
            <div key={id.toString()} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-semibold">{config.name}</p>
                <p className="text-sm text-muted-foreground">Fund ID: {id.toString()}</p>
              </div>
              <div className="flex items-center gap-3">
                {config.isPaused ? (
                  <>
                    <Badge variant="destructive">Paused</Badge>
                    <Button
                      size="sm"
                      onClick={() => resumeFund(id)}
                      disabled={isResuming}
                      className="gap-2"
                    >
                      {isResuming ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Resume
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge className="bg-green-500">Active</Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => pauseFund(id)}
                      disabled={isPausing}
                      className="gap-2"
                    >
                      {isPausing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Pause className="h-4 w-4" />
                          Pause
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
