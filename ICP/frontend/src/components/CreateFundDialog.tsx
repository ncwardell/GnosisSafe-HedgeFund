import { useState } from 'react';
import { useCreateFund, useGetPlatformFeeRate } from '../hooks/useQueries';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { FundConfig } from '../backend';

interface CreateFundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateFundDialog({ open, onOpenChange }: CreateFundDialogProps) {
    const [formData, setFormData] = useState({
        name: '',
        managementFee: '2',
        performanceFee: '20',
        entranceFee: '0',
        exitFee: '0',
        minInvestment: '10000',
        highWaterMark: '1',
        website: '',
        contactEmail: '',
        description: '',
        telegramHandle: '',
        baseToken: 'ICP',
        autoDeposit: true,
        autoWithdrawal: true,
    });

    const { mutate: createFund, isPending } = useCreateFund();
    const { data: platformFeeRate, isLoading: feeRateLoading } = useGetPlatformFeeRate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const config: FundConfig = {
            name: formData.name,
            managementFee: parseFloat(formData.managementFee) / 100,
            performanceFee: parseFloat(formData.performanceFee) / 100,
            entranceFee: parseFloat(formData.entranceFee) / 100,
            exitFee: parseFloat(formData.exitFee) / 100,
            minInvestment: BigInt(formData.minInvestment),
            highWaterMark: parseFloat(formData.highWaterMark),
            isPaused: false,
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

        createFund(config, {
            onSuccess: () => {
                onOpenChange(false);
                setFormData({
                    name: '',
                    managementFee: '2',
                    performanceFee: '20',
                    entranceFee: '0',
                    exitFee: '0',
                    minInvestment: '10000',
                    highWaterMark: '1',
                    website: '',
                    contactEmail: '',
                    description: '',
                    telegramHandle: '',
                    baseToken: 'ICP',
                    autoDeposit: true,
                    autoWithdrawal: true,
                });
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Fund</DialogTitle>
                    <DialogDescription>Configure a new hedge fund with custom parameters and creator information</DialogDescription>
                </DialogHeader>

                {!feeRateLoading && platformFeeRate !== undefined && (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            Platform fee: {(platformFeeRate * 100).toFixed(2)}% will be charged upon fund creation
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Fund Information</h3>

                        <div className="space-y-2">
                            <Label htmlFor="name">Fund Name *</Label>
                            <Input
                                id="name"
                                placeholder="e.g., Global Macro Fund"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Brief description of your fund's strategy and objectives..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="baseToken">Base/Deposit Token *</Label>
                            <Input
                                id="baseToken"
                                placeholder="e.g., ICP, BTC, ETH"
                                value={formData.baseToken}
                                onChange={(e) => setFormData({ ...formData, baseToken: e.target.value })}
                                required
                            />
                            <p className="text-xs text-muted-foreground">The token used for deposits and withdrawals</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Processing Modes</h3>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="autoDeposit">Automatic Deposit Processing</Label>
                                <p className="text-sm text-muted-foreground">Process deposits automatically without manual approval</p>
                            </div>
                            <Switch
                                id="autoDeposit"
                                checked={formData.autoDeposit}
                                onCheckedChange={(checked) => setFormData({ ...formData, autoDeposit: checked })}
                            />
                        </div>

                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label htmlFor="autoWithdrawal">Automatic Withdrawal Processing</Label>
                                <p className="text-sm text-muted-foreground">Process withdrawals automatically without manual approval</p>
                            </div>
                            <Switch
                                id="autoWithdrawal"
                                checked={formData.autoWithdrawal}
                                onCheckedChange={(checked) => setFormData({ ...formData, autoWithdrawal: checked })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Contact Information</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    type="url"
                                    placeholder="https://example.com"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="contactEmail">Contact Email</Label>
                                <Input
                                    id="contactEmail"
                                    type="email"
                                    placeholder="contact@example.com"
                                    value={formData.contactEmail}
                                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2 col-span-2">
                                <Label htmlFor="telegramHandle">Telegram Handle (Optional)</Label>
                                <Input
                                    id="telegramHandle"
                                    placeholder="@username"
                                    value={formData.telegramHandle}
                                    onChange={(e) => setFormData({ ...formData, telegramHandle: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Fee Structure</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="managementFee">Management Fee (%) *</Label>
                                <Input
                                    id="managementFee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.managementFee}
                                    onChange={(e) => setFormData({ ...formData, managementFee: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="performanceFee">Performance Fee (%) *</Label>
                                <Input
                                    id="performanceFee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.performanceFee}
                                    onChange={(e) => setFormData({ ...formData, performanceFee: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="entranceFee">Entrance Fee (%) *</Label>
                                <Input
                                    id="entranceFee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.entranceFee}
                                    onChange={(e) => setFormData({ ...formData, entranceFee: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="exitFee">Exit Fee (%) *</Label>
                                <Input
                                    id="exitFee"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={formData.exitFee}
                                    onChange={(e) => setFormData({ ...formData, exitFee: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold">Fund Parameters</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="minInvestment">Minimum Investment ($) *</Label>
                                <Input
                                    id="minInvestment"
                                    type="number"
                                    min="0"
                                    value={formData.minInvestment}
                                    onChange={(e) => setFormData({ ...formData, minInvestment: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="highWaterMark">Initial High Water Mark *</Label>
                                <Input
                                    id="highWaterMark"
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={formData.highWaterMark}
                                    onChange={(e) => setFormData({ ...formData, highWaterMark: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isPending} className="flex-1">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Fund'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
