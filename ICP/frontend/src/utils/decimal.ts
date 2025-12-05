/**
 * Decimal utility functions for working with 18-decimal fixed-point numbers
 * Matches the backend Decimal.mo implementation
 */

// Precision: 10^18
export const DECIMAL_PRECISION = BigInt("1000000000000000000");

/**
 * Convert a number to Decimal (BigInt with 18 decimals)
 */
export function toDecimal(value: number): bigint {
  return BigInt(Math.floor(value * Number(DECIMAL_PRECISION)));
}

/**
 * Convert Decimal (BigInt) to number
 * WARNING: May lose precision for very large numbers
 */
export function fromDecimal(decimal: bigint): number {
  return Number(decimal) / Number(DECIMAL_PRECISION);
}

/**
 * Format Decimal as string with specified decimal places
 */
export function formatDecimal(decimal: bigint, decimalPlaces: number = 6): string {
  const whole = decimal / DECIMAL_PRECISION;
  const fractional = decimal % DECIMAL_PRECISION;

  if (decimalPlaces === 0) {
    return whole.toString();
  }

  const divisor = DECIMAL_PRECISION / BigInt(10 ** decimalPlaces);
  const truncated = fractional / divisor;
  const fractionalStr = truncated.toString().padStart(decimalPlaces, '0');

  return `${whole}.${fractionalStr}`;
}

/**
 * Format as currency (2 decimal places)
 */
export function formatCurrency(decimal: bigint): string {
  return formatDecimal(decimal, 2);
}

/**
 * Format for display (6 decimal places)
 */
export function formatDisplay(decimal: bigint): string {
  return formatDecimal(decimal, 6);
}

/**
 * Parse string to Decimal
 */
export function parseDecimal(str: string): bigint {
  const [whole = "0", fractional = "0"] = str.split(".");
  const wholeBigInt = BigInt(whole) * DECIMAL_PRECISION;

  // Pad or truncate fractional part to 18 digits
  const paddedFractional = fractional.padEnd(18, '0').slice(0, 18);
  const fractionalBigInt = BigInt(paddedFractional);

  return wholeBigInt + fractionalBigInt;
}

/**
 * Add two Decimals
 */
export function addDecimal(a: bigint, b: bigint): bigint {
  return a + b;
}

/**
 * Subtract two Decimals
 */
export function subDecimal(a: bigint, b: bigint): bigint {
  if (b > a) {
    throw new Error("Subtraction would result in negative value");
  }
  return a - b;
}

/**
 * Multiply two Decimals
 */
export function mulDecimal(a: bigint, b: bigint): bigint {
  return (a * b) / DECIMAL_PRECISION;
}

/**
 * Divide two Decimals
 */
export function divDecimal(a: bigint, b: bigint): bigint {
  if (b === BigInt(0)) {
    throw new Error("Division by zero");
  }
  return (a * DECIMAL_PRECISION) / b;
}

/**
 * Multiply by basis points (e.g., 250 bps = 2.5%)
 */
export function mulBps(amount: bigint, bps: number): bigint {
  return (amount * BigInt(bps)) / BigInt(10000);
}

/**
 * Calculate percentage
 */
export function percentage(part: bigint, whole: bigint): number {
  if (whole === BigInt(0)) return 0;
  return Number((part * BigInt(10000)) / whole);
}

/**
 * Format basis points as percentage string
 */
export function formatBps(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

/**
 * Convert between old Float format and new Decimal
 * Used for migration/backward compatibility
 */
export function floatToDecimal(float: number): bigint {
  return toDecimal(float);
}

/**
 * Format Decimal with thousands separators
 */
export function formatWithCommas(decimal: bigint, decimalPlaces: number = 2): string {
  const formatted = formatDecimal(decimal, decimalPlaces);
  const [whole, fractional] = formatted.split('.');

  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return fractional ? `${withCommas}.${fractional}` : withCommas;
}

/**
 * Format as compact notation (K, M, B)
 */
export function formatCompact(decimal: bigint): string {
  const num = fromDecimal(decimal);

  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K`;
  }

  return formatDisplay(decimal);
}

/**
 * Check if Decimal is zero
 */
export function isZero(decimal: bigint): boolean {
  return decimal === BigInt(0);
}

/**
 * Check if Decimal is greater than zero
 */
export function isPositive(decimal: bigint): boolean {
  return decimal > BigInt(0);
}

/**
 * Get min of two Decimals
 */
export function minDecimal(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Get max of two Decimals
 */
export function maxDecimal(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
