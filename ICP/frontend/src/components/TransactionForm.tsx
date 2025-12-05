import { useState } from 'react';
import type { FundId, FundConfig, FundState } from '../backend';
import { TransactionType } from '../backend';
import { useSubmitTransaction } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowDownCircle, ArrowUpCircle, Info } from 'lucide-react';

interface TransactionFormProps {
    fundId: FundId;
    config: FundConfig;
    state: FundState;
}

export default function TransactionForm({ fundId, config, state }: TransactionFormProps) {
    const [amount, setAmount] = useState('');
    const [txType, setTxType] = useState<'deposit' | 'redemption'>('deposit');
    const { mutate: submitTransaction, isPending } = useSubmitTransaction();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        const transactionType = txType === 'deposit' ? TransactionType.deposit : TransactionType.redemption;
        submitTransaction(
            { fundId, amount: numAmount, txType: transactionType },
            {
                onSuccess: () => {
                    setAmount('');
                },
            }
        );
    };

    const minInvestment = Number(config.minInvestment);
    const numAmount = parseFloat(amount) || 0;
    const isValidAmount = numAmount >= minInvestment;
    const estimatedShares = txType === 'deposit' ? numAmount / state.nav : 0;
    const fee = txType === 'deposit' ? numAmount * config.entranceFee : numAmount * config.exitFee;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Submit Transaction</CardTitle>
                <CardDescription>Deposit funds or request redemption</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-3">
                        <Label>Transaction Type</Label>
                        <RadioGroup value={txType} onValueChange={(value) => setTxType(value as 'deposit' | 'redemption')}>
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                                <RadioGroupItem value="deposit" id="deposit" />
                                <Label htmlFor="deposit" className="flex flex-1 cursor-pointer items-center gap-2">
                                    <ArrowDownCircle className="h-5 w-5 text-green-500" />
                                    <div>
                                        <p className="font-medium">Deposit</p>
                                        <p className="text-sm text-muted-foreground">Add funds to the vault</p>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 rounded-lg border p-4">
                                <RadioGroupItem value="redemption" id="redemption" />
                                <Label htmlFor="redemption" className="flex flex-1 cursor-pointer items-center gap-2">
                                    <ArrowUpCircle className="h-5 w-5 text-orange-500" />
                                    <div>
                                        <p className="font-medium">Redemption</p>
                                        <p className="text-sm text-muted-foreground">Withdraw funds from the vault</p>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder={`Minimum: $${minInvestment.toLocaleString()}`}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            disabled={isPending}
                        />
                        {amount && !isValidAmount && (
                            <p className="text-sm text-destructive">
                                Amount must be at least ${minInvestment.toLocaleString()}
                            </p>
                        )}
                    </div>

                    {amount && isValidAmount && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="space-y-1">
                                {txType === 'deposit' && (
                                    <>
                                        <p>Estimated shares: {estimatedShares.toFixed(4)}</p>
                                        <p>Entrance fee ({(config.entranceFee * 100).toFixed(2)}%): ${fee.toFixed(2)}</p>
                                        <p className="font-medium">Net investment: ${(numAmount - fee).toFixed(2)}</p>
                                    </>
                                )}
                                {txType === 'redemption' && (
                                    <>
                                        <p>Exit fee ({(config.exitFee * 100).toFixed(2)}%): ${fee.toFixed(2)}</p>
                                        <p className="font-medium">Net redemption: ${(numAmount - fee).toFixed(2)}</p>
                                    </>
                                )}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button type="submit" className="w-full" disabled={!isValidAmount || isPending}>
                        {isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            `Submit ${txType === 'deposit' ? 'Deposit' : 'Redemption'}`
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
