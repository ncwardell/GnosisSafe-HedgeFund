/**
 * TypeScript types matching the new Motoko backend
 * Updated to use Decimal (bigint) instead of Float (number)
 */

// Decimal type (internally represented as bigint)
export type Decimal = bigint;

// User roles
export type UserRole =
  | { admin: null }
  | { user: null }
  | { guest: null };

// Fund-specific roles
export type FundRole =
  | { admin: null }
  | { processor: null }
  | { aumUpdater: null }
  | { guardian: null };

// Transaction types
export type TransactionType =
  | { deposit: null }
  | { redemption: null };

// Transaction status
export type TransactionStatus =
  | { pending: null }
  | { processed: null }
  | { cancelled: null };

// Creator metadata
export interface CreatorMetadata {
  website: string;
  contactEmail: string;
  description: string;
  telegramHandle: [] | [string];
}

// Fund configuration
export interface FundConfig {
  name: string;
  managementFee: Decimal;
  performanceFee: Decimal;
  entranceFee: Decimal;
  exitFee: Decimal;
  minInvestment: bigint;
  isPaused: boolean;
  highWaterMark: Decimal;
  creatorMetadata: CreatorMetadata;
  baseToken: string;
  autoDeposit: boolean;
  autoWithdrawal: boolean;
}

// Fund configuration with basis points (for forms)
export interface FundConfigInput {
  name: string;
  managementFeeBps: number;  // basis points
  performanceFeeBps: number;
  entranceFeeBps: number;
  exitFeeBps: number;
  minInvestment: Decimal;
  isPaused: boolean;
  highWaterMark: Decimal;
  creatorMetadata: CreatorMetadata;
  baseToken: string;
  autoDeposit: boolean;
  autoWithdrawal: boolean;
}

// AUM record
export interface AUMRecord {
  timestamp: bigint;  // Time.Time (nanoseconds)
  aum: Decimal;
}

// Fund state
export interface FundState {
  aum: Decimal;
  nav: Decimal;
  totalShares: Decimal;
  accruedFees: Decimal;
  lastUpdated: bigint;  // Time.Time
  historicalAUM: AUMRecord[];
}

// Transaction
export interface Transaction {
  id: bigint;
  fundId: bigint;
  user: string;  // Principal as string
  amount: Decimal;
  shares: Decimal;
  txType: TransactionType;
  status: TransactionStatus;
  timestamp: bigint;  // Time.Time
}

// Timelock proposal status
export type ProposalStatus =
  | { pending: null }
  | { executed: null }
  | { cancelled: null };

// Timelock proposal
export interface TimelockProposal {
  id: bigint;
  fundId: bigint;
  proposedConfig: FundConfig;
  proposer: string;  // Principal
  timestamp: bigint;
  executeAfter: bigint;
  status: ProposalStatus;
}

// Queue status
export interface QueueStatus {
  deposits: bigint;
  redemptions: bigint;
}

// Pending amounts
export interface PendingAmounts {
  deposits: Decimal;
  redemptions: Decimal;
}

// Fee breakdown
export interface FeeBreakdown {
  mgmt: Decimal;
  perf: Decimal;
  entrance: Decimal;
  exit: Decimal;
  total: Decimal;
}

// HWM status
export interface HWMStatus {
  hwm: Decimal;
  lowestNav: Decimal;
  recoveryStart: [] | [bigint];
  daysToReset: bigint;
}

// User position
export interface UserPosition {
  shares: Decimal;
  value: Decimal;
  pendingDep: Decimal;
  pendingRed: Decimal;
}

// Portfolio summary
export interface PortfolioItem {
  fundId: bigint;
  shares: Decimal;
  value: Decimal;
}

// Marketplace fund data
export interface MarketplaceFund {
  fundId: bigint;
  config: FundConfig;
  state: FundState;
}

// User profile
export interface UserProfile {
  name: string;
}

// API Response types for playground canister
export interface PlaygroundFundConfig {
  name: string;
  managementFeeBps: bigint;
  performanceFeeBps: bigint;
  entranceFeeBps: bigint;
  exitFeeBps: bigint;
  minInvestment: Decimal;
}

// Display-friendly versions (converted from Decimal)
export interface FundConfigDisplay {
  name: string;
  managementFee: string;  // Formatted percentage
  performanceFee: string;
  entranceFee: string;
  exitFee: string;
  minInvestment: string;  // Formatted with decimals
  isPaused: boolean;
  highWaterMark: string;
  creatorMetadata: CreatorMetadata;
  baseToken: string;
  autoDeposit: boolean;
  autoWithdrawal: boolean;
}

export interface FundStateDisplay {
  aum: string;
  nav: string;
  totalShares: string;
  accruedFees: string;
  lastUpdated: Date;
  historicalAUM: Array<{ timestamp: Date; aum: string }>;
}

export interface TransactionDisplay {
  id: string;
  fundId: string;
  user: string;
  amount: string;
  shares: string;
  txType: 'deposit' | 'redemption';
  status: 'pending' | 'processed' | 'cancelled';
  timestamp: Date;
}

export interface FeeBreakdownDisplay {
  mgmt: string;
  perf: string;
  entrance: string;
  exit: string;
  total: string;
}

export interface HWMStatusDisplay {
  hwm: string;
  lowestNav: string;
  daysToReset: number;
  inDrawdown: boolean;
}
