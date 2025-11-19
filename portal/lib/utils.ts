import { formatUnits, parseUnits } from 'viem'
import clsx, { ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatToken(value: bigint | undefined, decimals: number = 18, displayDecimals: number = 4): string {
  if (value === undefined) return '0'
  const formatted = formatUnits(value, decimals)
  const num = parseFloat(formatted)
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: displayDecimals,
  })
}

export function formatUSD(value: bigint | undefined, decimals: number = 18): string {
  if (value === undefined) return '$0.00'
  const formatted = formatUnits(value, decimals)
  const num = parseFloat(formatted)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatPercent(value: number | undefined, decimals: number = 2): string {
  if (value === undefined) return '0%'
  return `${value.toFixed(decimals)}%`
}

export function formatAddress(address: string | undefined): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function parseTokenInput(value: string, decimals: number = 18): bigint {
  try {
    return parseUnits(value, decimals)
  } catch {
    return 0n
  }
}

export function calculateSlippage(amount: bigint, slippageBps: number = 50): bigint {
  // slippageBps is in basis points (50 = 0.5%)
  return (amount * BigInt(10000 - slippageBps)) / 10000n
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ready'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function bpsToPercent(bps: number): number {
  return bps / 100
}

export function percentToBps(percent: number): number {
  return Math.round(percent * 100)
}
