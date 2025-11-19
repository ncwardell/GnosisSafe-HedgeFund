'use client'

import { useAccruedFees, usePayoutFees } from '@/hooks/useVault'
import { formatUSD, bpsToPercent } from '@/lib/utils'
import { DollarSign, Loader2, CheckCircle, XCircle } from 'lucide-react'

export function FeeManagement() {
  const fees = useAccruedFees()
  const payout = usePayoutFees()

  const managementFees = fees.data?.[0] ?? 0n
  const performanceFees = fees.data?.[1] ?? 0n
  const entranceFees = fees.data?.[2] ?? 0n
  const exitFees = fees.data?.[3] ?? 0n
  const totalFees = managementFees + performanceFees + entranceFees + exitFees

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Fee Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and payout accrued fees
          </p>
        </div>
        <DollarSign className="h-8 w-8 text-green-600" />
      </div>

      {fees.isLoading ? (
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">
                Management Fees
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatUSD(managementFees, 18)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">
                Performance Fees
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatUSD(performanceFees, 18)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">
                Entrance Fees
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatUSD(entranceFees, 18)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-gray-700">
              <span className="text-gray-700 dark:text-gray-300">Exit Fees</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatUSD(exitFees, 18)}
              </span>
            </div>

            <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-4">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Accrued
              </span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatUSD(totalFees, 18)}
              </span>
            </div>
          </div>

          <button
            onClick={() => payout.payoutFees()}
            disabled={payout.isPending || payout.isConfirming || totalFees === 0n}
            className="btn-primary w-full"
          >
            {payout.isPending || payout.isConfirming ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Processing Payout...
              </>
            ) : (
              'Payout Fees'
            )}
          </button>

          {payout.isSuccess && (
            <div className="mt-4 flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
              <CheckCircle className="h-5 w-5" />
              <span>Fees paid out successfully!</span>
            </div>
          )}

          {payout.error && (
            <div className="mt-4 flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
              <XCircle className="h-5 w-5" />
              <span>Error: {payout.error.message}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
