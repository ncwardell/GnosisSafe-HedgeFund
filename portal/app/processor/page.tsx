'use client'

import { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { StatsCard } from '@/components/StatsCard'
import { useAccount } from 'wagmi'
import {
  useQueueLengths,
  useProcessQueues,
  useUserRoles,
} from '@/hooks/useVault'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

export default function ProcessorDashboard() {
  const { isConnected } = useAccount()
  const roles = useUserRoles()
  const queues = useQueueLengths()
  const processQueues = useProcessQueues()

  const [depositBatchSize, setDepositBatchSize] = useState('10')
  const [redemptionBatchSize, setRedemptionBatchSize] = useState('10')

  const handleProcessDeposits = () => {
    const batchSize = BigInt(depositBatchSize)
    processQueues.processDeposits(batchSize)
  }

  const handleProcessRedemptions = () => {
    const batchSize = BigInt(redemptionBatchSize)
    processQueues.processRedemptions(batchSize)
  }

  if (!isConnected) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="card max-w-md w-full text-center">
            <Users className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to access the processor panel
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!roles.isProcessor && !roles.isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="card max-w-md w-full text-center">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You do not have processor permissions for this vault
            </p>
          </div>
        </div>
      </>
    )
  }

  const depositQueueLength = queues.data?.[0] ?? 0n
  const redemptionQueueLength = queues.data?.[1] ?? 0n

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Processor Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Process deposit and redemption queues
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatsCard
              title="Deposit Queue"
              value={depositQueueLength.toString()}
              subtitle="Pending deposits to process"
              icon={TrendingUp}
              loading={queues.isLoading}
            />
            <StatsCard
              title="Redemption Queue"
              value={redemptionQueueLength.toString()}
              subtitle="Pending redemptions to process"
              icon={TrendingDown}
              loading={queues.isLoading}
            />
          </div>

          {/* Processing Forms */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Process Deposits */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Process Deposits
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {depositQueueLength.toString()} in queue
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={depositBatchSize}
                    onChange={(e) => setDepositBatchSize(e.target.value)}
                    min="1"
                    max="50"
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Maximum 50 deposits per transaction
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">
                    Processing Notes
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                    <li>Entrance fees will be accrued</li>
                    <li>Shares will be minted to users</li>
                    <li>Funds transferred to Safe wallet</li>
                    <li>Deposits with slippage issues are skipped</li>
                  </ul>
                </div>

                <button
                  onClick={handleProcessDeposits}
                  disabled={
                    processQueues.isPending ||
                    processQueues.isConfirming ||
                    depositQueueLength === 0n
                  }
                  className="btn-primary w-full"
                >
                  {processQueues.isPending || processQueues.isConfirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Process Deposits'
                  )}
                </button>
              </div>
            </div>

            {/* Process Redemptions */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Process Redemptions
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {redemptionQueueLength.toString()} in queue
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={redemptionBatchSize}
                    onChange={(e) => setRedemptionBatchSize(e.target.value)}
                    min="1"
                    max="50"
                    className="input-field"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Maximum 50 redemptions per transaction
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300 text-sm mb-1">
                    Processing Notes
                  </h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-0.5 list-disc list-inside">
                    <li>Exit fees will be accrued</li>
                    <li>Shares will be burned</li>
                    <li>Payouts executed from Safe wallet</li>
                    <li>Falls back to vault if Safe unavailable</li>
                  </ul>
                </div>

                <button
                  onClick={handleProcessRedemptions}
                  disabled={
                    processQueues.isPending ||
                    processQueues.isConfirming ||
                    redemptionQueueLength === 0n
                  }
                  className="btn-danger w-full"
                >
                  {processQueues.isPending || processQueues.isConfirming ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Process Redemptions'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {processQueues.isSuccess && (
            <div className="mt-6 card">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Queue processed successfully!</span>
              </div>
            </div>
          )}

          {processQueues.error && (
            <div className="mt-6 card">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                <span>Error: {processQueues.error.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
