/**
 * Converters between backend types (Decimal/bigint) and display types (string/number)
 */

import {
  FundConfig,
  FundConfigDisplay,
  FundState,
  FundStateDisplay,
  Transaction,
  TransactionDisplay,
  FeeBreakdown,
  FeeBreakdownDisplay,
  HWMStatus,
  HWMStatusDisplay,
  TransactionType,
  TransactionStatus,
} from '../types/backend';
import {
  formatDisplay,
  formatBps,
  formatWithCommas,
  formatCompact,
  fromDecimal,
} from './decimal';

/**
 * Convert nanoseconds timestamp to Date
 */
export function timestampToDate(nanos: bigint): Date {
  return new Date(Number(nanos) / 1_000_000);
}

/**
 * Convert Date to nanoseconds timestamp
 */
export function dateToTimestamp(date: Date): bigint {
  return BigInt(date.getTime()) * BigInt(1_000_000);
}

/**
 * Convert transaction type variant to string
 */
export function transactionTypeToString(txType: TransactionType): 'deposit' | 'redemption' {
  if ('deposit' in txType) return 'deposit';
  if ('redemption' in txType) return 'redemption';
  throw new Error('Unknown transaction type');
}

/**
 * Convert transaction status variant to string
 */
export function transactionStatusToString(status: TransactionStatus): 'pending' | 'processed' | 'cancelled' {
  if ('pending' in status) return 'pending';
  if ('processed' in status) return 'processed';
  if ('cancelled' in status) return 'cancelled';
  throw new Error('Unknown transaction status');
}

/**
 * Convert FundConfig to display format
 */
export function fundConfigToDisplay(config: FundConfig): FundConfigDisplay {
  return {
    name: config.name,
    managementFee: formatBps(Number(config.managementFee)),
    performanceFee: formatBps(Number(config.performanceFee)),
    entranceFee: formatBps(Number(config.entranceFee)),
    exitFee: formatBps(Number(config.exitFee)),
    minInvestment: formatWithCommas(config.minInvestment),
    isPaused: config.isPaused,
    highWaterMark: formatDisplay(config.highWaterMark),
    creatorMetadata: config.creatorMetadata,
    baseToken: config.baseToken,
    autoDeposit: config.autoDeposit,
    autoWithdrawal: config.autoWithdrawal,
  };
}

/**
 * Convert FundState to display format
 */
export function fundStateToDisplay(state: FundState): FundStateDisplay {
  return {
    aum: formatWithCommas(state.aum),
    nav: formatDisplay(state.nav),
    totalShares: formatWithCommas(state.totalShares, 0),
    accruedFees: formatWithCommas(state.accruedFees),
    lastUpdated: timestampToDate(state.lastUpdated),
    historicalAUM: state.historicalAUM.map(record => ({
      timestamp: timestampToDate(record.timestamp),
      aum: formatWithCommas(record.aum),
    })),
  };
}

/**
 * Convert Transaction to display format
 */
export function transactionToDisplay(tx: Transaction): TransactionDisplay {
  return {
    id: tx.id.toString(),
    fundId: tx.fundId.toString(),
    user: tx.user,
    amount: formatWithCommas(tx.amount),
    shares: formatWithCommas(tx.shares, 6),
    txType: transactionTypeToString(tx.txType),
    status: transactionStatusToString(tx.status),
    timestamp: timestampToDate(tx.timestamp),
  };
}

/**
 * Convert FeeBreakdown to display format
 */
export function feeBreakdownToDisplay(fees: FeeBreakdown): FeeBreakdownDisplay {
  return {
    mgmt: formatWithCommas(fees.mgmt),
    perf: formatWithCommas(fees.perf),
    entrance: formatWithCommas(fees.entrance),
    exit: formatWithCommas(fees.exit),
    total: formatWithCommas(fees.total),
  };
}

/**
 * Convert HWMStatus to display format
 */
export function hwmStatusToDisplay(status: HWMStatus): HWMStatusDisplay {
  const inDrawdown = status.lowestNav > BigInt(0);

  return {
    hwm: formatDisplay(status.hwm),
    lowestNav: inDrawdown ? formatDisplay(status.lowestNav) : 'N/A',
    daysToReset: Number(status.daysToReset),
    inDrawdown,
  };
}

/**
 * Format AUM for compact display (K, M, B)
 */
export function formatAUMCompact(aum: bigint): string {
  return formatCompact(aum);
}

/**
 * Calculate APY from management fee basis points
 */
export function calculateAPY(managementFeeBps: number): string {
  const apy = managementFeeBps / 100;
  return `${apy.toFixed(2)}%`;
}

/**
 * Calculate time remaining until proposal execution
 */
export function timeUntilExecution(executeAfter: bigint): string {
  const now = Date.now() * 1_000_000; // Convert to nanoseconds
  const diff = Number(executeAfter) - now;

  if (diff <= 0) {
    return 'Ready to execute';
  }

  const seconds = Math.floor(diff / 1_000_000_000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
}

/**
 * Format time ago from timestamp
 */
export function timeAgo(timestamp: bigint): string {
  const date = timestampToDate(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(oldValue: bigint, newValue: bigint): string {
  if (oldValue === BigInt(0)) {
    return 'N/A';
  }

  const change = fromDecimal(newValue) - fromDecimal(oldValue);
  const percentChange = (change / fromDecimal(oldValue)) * 100;

  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(2)}%`;
}

/**
 * Get status badge color
 */
export function getStatusColor(status: 'pending' | 'processed' | 'cancelled'): string {
  switch (status) {
    case 'pending':
      return 'yellow';
    case 'processed':
      return 'green';
    case 'cancelled':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get transaction type color
 */
export function getTxTypeColor(txType: 'deposit' | 'redemption'): string {
  return txType === 'deposit' ? 'blue' : 'purple';
}
