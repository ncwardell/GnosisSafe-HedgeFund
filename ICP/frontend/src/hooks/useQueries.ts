import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import type { UserProfile, FundConfig, FundId, FundState, Transaction, TransactionType, FundRole, TimelockProposal } from '../backend';
import { toast } from 'sonner';

// User Profile Queries
export function useGetCallerUserProfile() {
    const { actor, isFetching: actorFetching } = useActor();

    const query = useQuery<UserProfile | null>({
        queryKey: ['currentUserProfile'],
        queryFn: async () => {
            if (!actor) throw new Error('Actor not available');
            return actor.getCallerUserProfile();
        },
        enabled: !!actor && !actorFetching,
        retry: false,
    });

    return {
        ...query,
        isLoading: actorFetching || query.isLoading,
        isFetched: !!actor && query.isFetched,
    };
}

export function useSaveCallerUserProfile() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (profile: UserProfile) => {
            if (!actor) throw new Error('Actor not available');
            return actor.saveCallerUserProfile(profile);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
            toast.success('Profile saved successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to save profile: ${error.message}`);
        },
    });
}

// Fund Queries
export function useGetAllFunds() {
    const { actor, isFetching } = useActor();

    return useQuery<Array<[FundId, FundConfig]>>({
        queryKey: ['funds'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getAllFunds();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetAllFundStates() {
    const { actor, isFetching } = useActor();

    return useQuery<Array<[FundId, FundState]>>({
        queryKey: ['fundStates'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getAllFundStates();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetMarketplaceFunds() {
    const { actor, isFetching } = useActor();

    return useQuery<Array<[FundId, FundConfig, FundState]>>({
        queryKey: ['marketplaceFunds'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getMarketplaceFunds();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetFundConfig(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<FundConfig | null>({
        queryKey: ['fundConfig', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return null;
            return actor.getFundConfig(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

export function useGetFundState(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<FundState | null>({
        queryKey: ['fundState', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return null;
            return actor.getFundState(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

export function useCreateFund() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (config: FundConfig) => {
            if (!actor) throw new Error('Actor not available');
            return actor.createFund(config);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funds'] });
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Fund created successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to create fund: ${error.message}`);
        },
    });
}

// Transaction Queries
export function useGetMyTransactions() {
    const { actor, isFetching } = useActor();

    return useQuery<Transaction[]>({
        queryKey: ['myTransactions'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getMyTransactions();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetMyPendingTransactions() {
    const { actor, isFetching } = useActor();

    return useQuery<Transaction[]>({
        queryKey: ['myPendingTransactions'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getMyPendingTransactions();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetFundTransactions(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<Transaction[]>({
        queryKey: ['fundTransactions', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return [];
            return actor.getFundTransactions(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

export function useGetPendingTransactions() {
    const { actor, isFetching } = useActor();

    return useQuery<Transaction[]>({
        queryKey: ['pendingTransactions'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getPendingTransactions();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useSubmitTransaction() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fundId, amount, txType }: { fundId: FundId; amount: number; txType: TransactionType }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.submitTransaction(fundId, amount, txType);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['myPendingTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myInvestedFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myPortfolioSummary'] });
            toast.success('Transaction submitted successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to submit transaction: ${error.message}`);
        },
    });
}

export function useProcessTransaction() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (txId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.processTransaction(txId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pendingTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['fundTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myInvestedFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myPortfolioSummary'] });
            toast.success('Transaction processed successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to process transaction: ${error.message}`);
        },
    });
}

export function useCancelTransaction() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (txId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.cancelTransaction(txId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myTransactions'] });
            queryClient.invalidateQueries({ queryKey: ['myPendingTransactions'] });
            toast.success('Transaction cancelled successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to cancel transaction: ${error.message}`);
        },
    });
}

// Portfolio Queries
export function useGetMyInvestedFunds() {
    const { actor, isFetching } = useActor();

    return useQuery<FundId[]>({
        queryKey: ['myInvestedFunds'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getMyInvestedFunds();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetMyPortfolioSummary() {
    const { actor, isFetching } = useActor();

    return useQuery<Array<[FundId, number, number]>>({
        queryKey: ['myPortfolioSummary'],
        queryFn: async () => {
            if (!actor) return [];
            return actor.getMyPortfolioSummary();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useGetMyFundPosition(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<number>({
        queryKey: ['myFundPosition', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return 0;
            return actor.getMyFundPosition(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

// AUM Management
export function useUpdateAUM() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fundId, newAUM }: { fundId: FundId; newAUM: number }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.updateAUM(fundId, newAUM);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myPortfolioSummary'] });
            toast.success('AUM updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update AUM: ${error.message}`);
        },
    });
}

export function useAggregateAUM() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fundId: FundId) => {
            if (!actor) throw new Error('Actor not available');
            return actor.aggregateAUM(fundId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            queryClient.invalidateQueries({ queryKey: ['myPortfolioSummary'] });
            toast.success('AUM aggregated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to aggregate AUM: ${error.message}`);
        },
    });
}

// Fee Management
export function useCalculateFees(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<number>({
        queryKey: ['fees', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return 0;
            return actor.calculateFees(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

export function useCollectFees() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fundId: FundId) => {
            if (!actor) throw new Error('Actor not available');
            return actor.collectFees(fundId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Fees collected successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to collect fees: ${error.message}`);
        },
    });
}

// Emergency Controls
export function usePauseFund() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fundId: FundId) => {
            if (!actor) throw new Error('Actor not available');
            return actor.pauseFund(fundId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funds'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Fund paused successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to pause fund: ${error.message}`);
        },
    });
}

export function useResumeFund() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fundId: FundId) => {
            if (!actor) throw new Error('Actor not available');
            return actor.resumeFund(fundId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funds'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Fund resumed successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to resume fund: ${error.message}`);
        },
    });
}

export function useEmergencyWithdraw() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fundId: FundId) => {
            if (!actor) throw new Error('Actor not available');
            return actor.emergencyWithdraw(fundId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['funds'] });
            queryClient.invalidateQueries({ queryKey: ['fundStates'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Emergency withdrawal initiated');
        },
        onError: (error: Error) => {
            toast.error(`Failed to initiate emergency withdrawal: ${error.message}`);
        },
    });
}

// Role Management
export function useAssignFundRole() {
    const { actor } = useActor();

    return useMutation({
        mutationFn: async ({ user, role }: { user: string; role: FundRole }) => {
            if (!actor) throw new Error('Actor not available');
            const principal = { toString: () => user } as any;
            return actor.assignFundRole(principal, role);
        },
        onSuccess: () => {
            toast.success('Role assigned successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to assign role: ${error.message}`);
        },
    });
}

export function useIsCallerAdmin() {
    const { actor, isFetching } = useActor();

    return useQuery<boolean>({
        queryKey: ['isAdmin'],
        queryFn: async () => {
            if (!actor) return false;
            return actor.isCallerAdmin();
        },
        enabled: !!actor && !isFetching,
    });
}

// Platform Fee Management
export function useGetPlatformFeeRate() {
    const { actor, isFetching } = useActor();

    return useQuery<number>({
        queryKey: ['platformFeeRate'],
        queryFn: async () => {
            if (!actor) return 0;
            return actor.getPlatformFeeRate();
        },
        enabled: !!actor && !isFetching,
    });
}

export function useSetPlatformFeeRate() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (newRate: number) => {
            if (!actor) throw new Error('Actor not available');
            return actor.setPlatformFeeRate(newRate);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['platformFeeRate'] });
            toast.success('Platform fee rate updated successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to update platform fee rate: ${error.message}`);
        },
    });
}

// Timelock Queries
export function useGetFundTimelockProposals(fundId: FundId | null) {
    const { actor, isFetching } = useActor();

    return useQuery<TimelockProposal[]>({
        queryKey: ['timelockProposals', fundId?.toString()],
        queryFn: async () => {
            if (!actor || fundId === null) return [];
            return actor.getFundTimelockProposals(fundId);
        },
        enabled: !!actor && !isFetching && fundId !== null,
    });
}

export function useProposeTimelockChange() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ fundId, newConfig, delaySeconds }: { fundId: FundId; newConfig: FundConfig; delaySeconds: bigint }) => {
            if (!actor) throw new Error('Actor not available');
            return actor.proposeTimelockChange(fundId, newConfig, delaySeconds);
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['timelockProposals', variables.fundId.toString()] });
            toast.success('Configuration change proposed successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to propose change: ${error.message}`);
        },
    });
}

export function useExecuteTimelockChange() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (proposalId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.executeTimelockChange(proposalId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timelockProposals'] });
            queryClient.invalidateQueries({ queryKey: ['funds'] });
            queryClient.invalidateQueries({ queryKey: ['marketplaceFunds'] });
            toast.success('Configuration change executed successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to execute change: ${error.message}`);
        },
    });
}

export function useCancelTimelockChange() {
    const { actor } = useActor();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (proposalId: bigint) => {
            if (!actor) throw new Error('Actor not available');
            return actor.cancelTimelockChange(proposalId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timelockProposals'] });
            toast.success('Configuration change cancelled successfully');
        },
        onError: (error: Error) => {
            toast.error(`Failed to cancel change: ${error.message}`);
        },
    });
}
