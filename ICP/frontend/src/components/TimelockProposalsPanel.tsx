import { useState } from 'react';
import type { FundId, FundConfig } from '../backend';
import { useGetFundTimelockProposals, useProposeTimelockChange, useExecuteTimelockChange, useCancelTimelockChange } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Variant_cancelled_pending_executed } from '../backend';

interface TimelockProposalsPanelProps {
    fundId: FundId;
    config: FundConfig;
}

export default function TimelockProposalsPanel({ fundId, config }: TimelockProposalsPanelProps) {
    const [showProposalForm, setShowProposalForm] = useState(false);
    const { data: proposals, isLoading } = useGetFundTimelockProposals(fundId);

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Configuration Management</CardTitle>
                            <CardDescription>Propose and manage fund configuration changes with timelock protection</CardDescription>
                        </div>
                        <Button onClick={() => setShowProposalForm(!showProposalForm)}>
                            {showProposalForm ? 'Cancel' : 'Propose Change'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {showProposalForm && (
                        <ProposalForm fundId={fundId} currentConfig={config} onSuccess={() => setShowProposalForm(false)} />
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Proposals</CardTitle>
                    <CardDescription>Configuration changes awaiting execution or already processed</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex min-h-[200px] items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : !proposals || proposals.length === 0 ? (
                        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                            <AlertCircle className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No proposals found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {proposals.map((proposal) => (
                                <ProposalCard key={proposal.id.toString()} proposal={proposal} />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function ProposalForm({ fundId, currentConfig, onSuccess }: { fundId: FundId; currentConfig: FundConfig; onSuccess: () => void }) {
    const [formData, setFormData] = useState({
        name: currentConfig.name,
        managementFee: (currentConfig.managementFee * 100).toString(),
        performanceFee: (currentConfig.performanceFee * 100).toString(),
        entranceFee: (currentConfig.entranceFee * 100).toString(),
        exitFee: (currentConfig.exitFee * 100).toString(),
        minInvestment: currentConfig.minInvestment.toString(),
        highWaterMark: currentConfig.highWaterMark.toString(),
        website: currentConfig.creatorMetadata.website,
        contactEmail: currentConfig.creatorMetadata.contactEmail,
        description: currentConfig.creatorMetadata.description,
        telegramHandle: currentConfig.creatorMetadata.telegramHandle || '',
        baseToken: currentConfig.baseToken,
        autoDeposit: currentConfig.autoDeposit,
        autoWithdrawal: currentConfig.autoWithdrawal,
        delayDays: '7',
    });

    const { mutate: proposeChange, isPending } = useProposeTimelockChange();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const newConfig: FundConfig = {
            name: formData.name,
            managementFee: parseFloat(formData.managementFee) / 100,
            performanceFee: parseFloat(formData.performanceFee) / 100,
            entranceFee: parseFloat(formData.entranceFee) / 100,
            exitFee: parseFloat(formData.exitFee) / 100,
            minInvestment: BigInt(formData.minInvestment),
            highWaterMark: parseFloat(formData.highWaterMark),
            isPaused: currentConfig.isPaused,
            baseToken: formData.baseToken,
            autoDeposit: formData.autoDeposit,
            autoWithdrawal: formData.autoWithdrawal,
            creatorMetadata: {
                website: formData.website,
                contactEmail: formData.contactEmail,
                description: formData.description,
                telegramHandle: formData.telegramHandle || undefined,
            },
        };

        const delaySeconds = BigInt(parseInt(formData.delayDays) * 24 * 60 * 60);

        proposeChange({ fundId, newConfig, delaySeconds }, {
            onSuccess: () => {
                onSuccess();
            },
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
            <div className="space-y-4">
                <h4 className="text-sm font-semibold">Proposed Configuration</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Fund Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="baseToken">Base Token</Label>
                        <Input
                            id="baseToken"
                            value={formData.baseToken}
                            onChange={(e) => setFormData({ ...formData, baseToken: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="managementFee">Management Fee (%)</Label>
                        <Input
                            id="managementFee"
                            type="number"
                            step="0.01"
                            value={formData.managementFee}
                            onChange={(e) => setFormData({ ...formData, managementFee: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="performanceFee">Performance Fee (%)</Label>
                        <Input
                            id="performanceFee"
                            type="number"
                            step="0.01"
                            value={formData.performanceFee}
                            onChange={(e) => setFormData({ ...formData, performanceFee: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="entranceFee">Entrance Fee (%)</Label>
                        <Input
                            id="entranceFee"
                            type="number"
                            step="0.01"
                            value={formData.entranceFee}
                            onChange={(e) => setFormData({ ...formData, entranceFee: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="exitFee">Exit Fee (%)</Label>
                        <Input
                            id="exitFee"
                            type="number"
                            step="0.01"
                            value={formData.exitFee}
                            onChange={(e) => setFormData({ ...formData, exitFee: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="minInvestment">Minimum Investment</Label>
                        <Input
                            id="minInvestment"
                            type="number"
                            value={formData.minInvestment}
                            onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="delayDays">Timelock Delay (Days)</Label>
                        <Input
                            id="delayDays"
                            type="number"
                            min="1"
                            value={formData.delayDays}
                            onChange={(e) => setFormData({ ...formData, delayDays: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="autoDeposit">Automatic Deposit Processing</Label>
                        <Switch
                            id="autoDeposit"
                            checked={formData.autoDeposit}
                            onCheckedChange={(checked) => setFormData({ ...formData, autoDeposit: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label htmlFor="autoWithdrawal">Automatic Withdrawal Processing</Label>
                        <Switch
                            id="autoWithdrawal"
                            checked={formData.autoWithdrawal}
                            onCheckedChange={(checked) => setFormData({ ...formData, autoWithdrawal: checked })}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={2}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                            id="website"
                            type="url"
                            value={formData.website}
                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <Input
                            id="contactEmail"
                            type="email"
                            value={formData.contactEmail}
                            onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="telegramHandle">Telegram Handle</Label>
                        <Input
                            id="telegramHandle"
                            value={formData.telegramHandle}
                            onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Proposing...
                    </>
                ) : (
                    'Propose Configuration Change'
                )}
            </Button>
        </form>
    );
}

function ProposalCard({ proposal }: { proposal: any }) {
    const { mutate: executeChange, isPending: isExecuting } = useExecuteTimelockChange();
    const { mutate: cancelChange, isPending: isCancelling } = useCancelTimelockChange();

    const now = Date.now() * 1_000_000;
    const canExecute = proposal.status === Variant_cancelled_pending_executed.pending && Number(proposal.executeAfter) <= now;
    const timeRemaining = Number(proposal.executeAfter) - now;
    const daysRemaining = Math.ceil(timeRemaining / (24 * 60 * 60 * 1_000_000_000));

    const getStatusBadge = () => {
        switch (proposal.status) {
            case Variant_cancelled_pending_executed.pending:
                return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
            case Variant_cancelled_pending_executed.executed:
                return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Executed</Badge>;
            case Variant_cancelled_pending_executed.cancelled:
                return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Cancelled</Badge>;
            default:
                return null;
        }
    };

    return (
        <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-semibold">Proposal #{proposal.id.toString()}</p>
                    <p className="text-sm text-muted-foreground">
                        Proposed: {new Date(Number(proposal.timestamp) / 1_000_000).toLocaleString()}
                    </p>
                </div>
                {getStatusBadge()}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <span className="text-muted-foreground">Fund Name:</span>
                    <span className="ml-2 font-medium">{proposal.proposedConfig.name}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Base Token:</span>
                    <span className="ml-2 font-medium">{proposal.proposedConfig.baseToken}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Management Fee:</span>
                    <span className="ml-2 font-medium">{(proposal.proposedConfig.managementFee * 100).toFixed(2)}%</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Performance Fee:</span>
                    <span className="ml-2 font-medium">{(proposal.proposedConfig.performanceFee * 100).toFixed(2)}%</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Auto Deposit:</span>
                    <span className="ml-2 font-medium">{proposal.proposedConfig.autoDeposit ? 'Yes' : 'No'}</span>
                </div>
                <div>
                    <span className="text-muted-foreground">Auto Withdrawal:</span>
                    <span className="ml-2 font-medium">{proposal.proposedConfig.autoWithdrawal ? 'Yes' : 'No'}</span>
                </div>
            </div>

            {proposal.status === Variant_cancelled_pending_executed.pending && (
                <>
                    <Separator />
                    <div className="flex items-center justify-between">
                        <div className="text-sm">
                            {canExecute ? (
                                <span className="text-green-600 dark:text-green-400 font-medium">Ready to execute</span>
                            ) : (
                                <span className="text-muted-foreground">
                                    Executable in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelChange(proposal.id)}
                                disabled={isCancelling}
                            >
                                {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cancel'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => executeChange(proposal.id)}
                                disabled={!canExecute || isExecuting}
                            >
                                {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Execute'}
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
