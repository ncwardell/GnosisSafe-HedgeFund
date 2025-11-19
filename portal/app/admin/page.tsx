'use client'

import { Navigation } from '@/components/Navigation'
import { StatsCard } from '@/components/StatsCard'
import { FeeManagement } from './components/FeeManagement'
import { VaultControls } from './components/VaultControls'
import { useAccount } from 'wagmi'
import {
  useAccruedFees,
  useQueueLengths,
  useUserRoles,
  useVaultStatus,
} from '@/hooks/useVault'
import { formatUSD } from '@/lib/utils'
import {
  DollarSign,
  Users,
  Settings,
  Shield,
  AlertCircle
} from 'lucide-react'

export default function AdminDashboard() {
  const { isConnected } = useAccount()
  const roles = useUserRoles()
  const fees = useAccruedFees()
  const queues = useQueueLengths()
  const vaultStatus = useVaultStatus()

  if (!isConnected) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="card max-w-md w-full text-center">
            <Shield className="h-16 w-16 text-primary-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Connect Your Wallet
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to access the admin panel
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!roles.isAdmin && !roles.isLoading) {
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
              You do not have admin permissions for this vault
            </p>
          </div>
        </div>
      </>
    )
  }

  const totalFees =
    (fees.data?.[0] ?? 0n) +
    (fees.data?.[1] ?? 0n) +
    (fees.data?.[2] ?? 0n) +
    (fees.data?.[3] ?? 0n)

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Status Alerts */}
          {vaultStatus.paused && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 mr-3" />
              <div>
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                  Vault Paused
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  The vault is currently paused. Use the controls below to unpause.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage vault configuration and operations
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Accrued Fees"
              value={formatUSD(totalFees, 18)}
              subtitle="Ready for payout"
              icon={DollarSign}
              loading={fees.isLoading}
            />
            <StatsCard
              title="Deposit Queue"
              value={queues.data?.[0]?.toString() ?? '0'}
              subtitle="Pending deposits"
              icon={Users}
              loading={queues.isLoading}
            />
            <StatsCard
              title="Redemption Queue"
              value={queues.data?.[1]?.toString() ?? '0'}
              subtitle="Pending redemptions"
              icon={Users}
              loading={queues.isLoading}
            />
          </div>

          {/* Vault Controls */}
          <div className="mb-8">
            <VaultControls />
          </div>

          {/* Fee Management */}
          <div className="mb-8">
            <FeeManagement />
          </div>
        </div>
      </div>
    </>
  )
}
