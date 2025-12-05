/**
 * React hook for interacting with the playground canister
 * Handles Decimal conversions and provides typed API
 */

import { useState, useCallback } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import {
  PlaygroundFundConfig,
  QueueStatus,
  FeeBreakdownDisplay,
  HWMStatusDisplay,
} from '../types/backend';
import {
  toDecimal,
  formatDisplay,
  parseDecimal,
  DECIMAL_PRECISION,
} from '../utils/decimal';
import {
  feeBreakdownToDisplay,
  hwmStatusToDisplay,
} from '../utils/converters';

// IDL interface for playground canister
const playgroundIDL = ({ IDL }: any) => {
  const Decimal = IDL.Nat;

  const FundConfig = IDL.Record({
    name: IDL.Text,
    managementFeeBps: IDL.Nat,
    performanceFeeBps: IDL.Nat,
    entranceFeeBps: IDL.Nat,
    exitFeeBps: IDL.Nat,
    minInvestment: Decimal,
  });

  const QueueStatus = IDL.Record({
    deposits: IDL.Nat,
    redemptions: IDL.Nat,
  });

  const PendingAmounts = IDL.Record({
    deposits: IDL.Text,
    redemptions: IDL.Text,
  });

  const FeeBreakdown = IDL.Record({
    mgmt: IDL.Text,
    perf: IDL.Text,
    entrance: IDL.Text,
    exit: IDL.Text,
    total: IDL.Text,
  });

  const HWMStatus = IDL.Record({
    hwm: IDL.Text,
    lowestNav: IDL.Text,
    daysToReset: IDL.Nat,
  });

  const TestDecimalResult = IDL.Record({
    addition: IDL.Text,
    multiplication: IDL.Text,
    division: IDL.Text,
    basisPoints: IDL.Text,
  });

  return IDL.Service({
    initializeFund: IDL.Func([FundConfig], [IDL.Text], []),
    getFundConfig: IDL.Func([], [IDL.Opt(FundConfig)], ['query']),
    mintTestTokens: IDL.Func([IDL.Nat], [Decimal], []),
    getMyTokenBalance: IDL.Func([IDL.Principal], [IDL.Text], ['query']),
    getMyShares: IDL.Func([IDL.Principal], [IDL.Text], ['query']),
    getCurrentNav: IDL.Func([], [IDL.Text], ['query']),
    deposit: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat], []),
    processDeposits: IDL.Func([IDL.Nat], [IDL.Nat], []),
    redeem: IDL.Func([IDL.Nat, IDL.Nat], [IDL.Nat], []),
    processRedemptions: IDL.Func([IDL.Nat], [IDL.Nat], []),
    updateAUM: IDL.Func([IDL.Nat], [IDL.Text], []),
    getQueueStatus: IDL.Func([], [QueueStatus], ['query']),
    getMyPending: IDL.Func([IDL.Principal], [PendingAmounts], ['query']),
    getFeeBreakdown: IDL.Func([], [FeeBreakdown], ['query']),
    getHWMStatus: IDL.Func([], [HWMStatus], ['query']),
    getTotalShares: IDL.Func([], [IDL.Text], ['query']),
    cancelMyDeposits: IDL.Func([IDL.Nat], [IDL.Nat], []),
    cancelMyRedemptions: IDL.Func([IDL.Nat], [IDL.Nat], []),
    testDecimal: IDL.Func([], [TestDecimalResult], ['query']),
  });
};

export interface PlaygroundCanisterHook {
  // Fund management
  initializeFund: (config: PlaygroundFundConfig) => Promise<string>;
  getFundConfig: () => Promise<PlaygroundFundConfig | null>;

  // Token operations
  mintTestTokens: (amount: number) => Promise<string>;
  getMyTokenBalance: () => Promise<string>;
  getMyShares: () => Promise<string>;

  // Trading
  deposit: (amount: number, minShares: number) => Promise<number>;
  redeem: (shares: number, minPayout: number) => Promise<number>;

  // Admin
  processDeposits: (maxToProcess: number) => Promise<number>;
  processRedemptions: (maxToProcess: number) => Promise<number>;
  updateAUM: (newAum: number) => Promise<string>;

  // Queries
  getCurrentNav: () => Promise<string>;
  getQueueStatus: () => Promise<QueueStatus>;
  getMyPending: () => Promise<{ deposits: string; redemptions: string }>;
  getFeeBreakdown: () => Promise<FeeBreakdownDisplay>;
  getHWMStatus: () => Promise<HWMStatusDisplay>;
  getTotalShares: () => Promise<string>;

  // Cancellations
  cancelMyDeposits: (maxCancellations: number) => Promise<number>;
  cancelMyRedemptions: (maxCancellations: number) => Promise<number>;

  // Testing
  testDecimal: () => Promise<any>;

  // State
  loading: boolean;
  error: string | null;
}

export function usePlaygroundCanister(canisterId: string): PlaygroundCanisterHook {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actor, setActor] = useState<any>(null);

  // Initialize actor
  const initActor = useCallback(async () => {
    try {
      const agent = new HttpAgent({
        host: process.env.DFX_NETWORK === 'ic'
          ? 'https://ic0.app'
          : 'http://localhost:4943',
      });

      // Fetch root key for local development
      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
      }

      const newActor = Actor.createActor(playgroundIDL, {
        agent,
        canisterId,
      });

      setActor(newActor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize actor');
    }
  }, [canisterId]);

  // Helper to handle async calls
  const handleCall = useCallback(async <T,>(
    fn: () => Promise<T>,
    transform?: (result: any) => T
  ): Promise<T> => {
    if (!actor) {
      await initActor();
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fn();
      return transform ? transform(result) : result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [actor, initActor]);

  return {
    initializeFund: (config) => handleCall(() =>
      actor.initializeFund({
        ...config,
        minInvestment: config.minInvestment,
      })
    ),

    getFundConfig: () => handleCall(() => actor.getFundConfig()),

    mintTestTokens: (amount) => handleCall(async () => {
      const result = await actor.mintTestTokens(BigInt(amount));
      return formatDisplay(result);
    }),

    getMyTokenBalance: () => handleCall(async () => {
      const principal = await window.ic?.plug?.getPrincipal();
      return actor.getMyTokenBalance(principal);
    }),

    getMyShares: () => handleCall(async () => {
      const principal = await window.ic?.plug?.getPrincipal();
      return actor.getMyShares(principal);
    }),

    deposit: (amount, minShares) => handleCall(() =>
      actor.deposit(BigInt(amount), BigInt(minShares))
    ),

    redeem: (shares, minPayout) => handleCall(() =>
      actor.redeem(BigInt(shares), BigInt(minPayout))
    ),

    processDeposits: (maxToProcess) => handleCall(() =>
      actor.processDeposits(BigInt(maxToProcess))
    ),

    processRedemptions: (maxToProcess) => handleCall(() =>
      actor.processRedemptions(BigInt(maxToProcess))
    ),

    updateAUM: (newAum) => handleCall(() =>
      actor.updateAUM(BigInt(newAum))
    ),

    getCurrentNav: () => handleCall(() => actor.getCurrentNav()),

    getQueueStatus: () => handleCall(() => actor.getQueueStatus()),

    getMyPending: () => handleCall(async () => {
      const principal = await window.ic?.plug?.getPrincipal();
      return actor.getMyPending(principal);
    }),

    getFeeBreakdown: () => handleCall(async () => {
      const fees = await actor.getFeeBreakdown();
      return {
        mgmt: fees.mgmt,
        perf: fees.perf,
        entrance: fees.entrance,
        exit: fees.exit,
        total: fees.total,
      };
    }),

    getHWMStatus: () => handleCall(async () => {
      const status = await actor.getHWMStatus();
      return {
        hwm: status.hwm,
        lowestNav: status.lowestNav,
        daysToReset: Number(status.daysToReset),
        inDrawdown: status.lowestNav !== '0.000000',
      };
    }),

    getTotalShares: () => handleCall(() => actor.getTotalShares()),

    cancelMyDeposits: (maxCancellations) => handleCall(() =>
      actor.cancelMyDeposits(BigInt(maxCancellations))
    ),

    cancelMyRedemptions: (maxCancellations) => handleCall(() =>
      actor.cancelMyRedemptions(BigInt(maxCancellations))
    ),

    testDecimal: () => handleCall(() => actor.testDecimal()),

    loading,
    error,
  };
}
