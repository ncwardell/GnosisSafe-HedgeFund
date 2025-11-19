'use client'

import { Navigation } from '@/components/Navigation'
import { StatsCard } from '@/components/StatsCard'
import { useAccount } from 'wagmi'
import {
  useVaultStatus,
  useEmergencyControls,
  useUserRoles,
  useQueueLengths,
  useTotalAum,
} from '@/hooks/useVault'
import { formatUSD } from '@/lib/utils'
import {
  Shield,
  AlertTriangle,
  Pause,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'

export default function GuardianDashboard() {
  const { isConnected } = useAccount()
  const roles = useUserRoles()
  const vaultStatus = useVaultStatus()
  const controls = useEmergencyControls()
  const queues = useQueueLengths()
  const totalAum = useTotalAum()

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
              Please connect your wallet to access the guardian panel
            </p>
          </div>
        </div>
      </>
    )
  }

  if (!roles.isGuardian && !roles.isLoading) {
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
              You do not have guardian permissions for this vault
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
              Guardian Dashboard
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Emergency controls and vault protection
            </p>
          </div>

          {/* Status Alert */}
          {vaultStatus.emergencyMode && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-500 mt-0.5 mr-3" />
                <div>
                  <h3 className="font-semibold text-red-800 dark:text-red-300 text-lg">
                    Emergency Mode Active
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    The vault is currently in emergency mode. Only emergency withdrawals are available.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Vault Status"
              value={vaultStatus.paused ? 'Paused' : 'Active'}
              subtitle={vaultStatus.emergencyMode ? 'Emergency Mode' : 'Normal'}
              icon={vaultStatus.paused ? Pause : Play}
              loading={vaultStatus.isLoading}
            />
            <StatsCard
              title="Total AUM"
              value={formatUSD(totalAum.data, 18)}
              subtitle="Assets under management"
              icon={Shield}
              loading={totalAum.isLoading}
            />
            <StatsCard
              title="Queue Length"
              value={(depositQueueLength + redemptionQueueLength).toString()}
              subtitle="Total pending transactions"
              icon={AlertCircle}
              loading={queues.isLoading}
            />
          </div>

          {/* Emergency Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Pause Control */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <div className={`p-2 rounded-lg ${vaultStatus.paused ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                  {vaultStatus.paused ? (
                    <Pause className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  ) : (
                    <Play className="h-6 w-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Pause Control
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {vaultStatus.paused ? 'Vault is paused' : 'Vault is active'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    {vaultStatus.paused
                      ? 'Unpausing will resume normal vault operations including deposits and redemptions.'
                      : 'Pausing will temporarily halt all deposits and redemptions. Existing positions remain safe.'}
                  </p>
                </div>

                {vaultStatus.paused ? (
                  <button
                    onClick={() => controls.unpause()}
                    disabled={controls.isPending || controls.isConfirming}
                    className="btn-primary w-full"
                  >
                    {controls.isPending || controls.isConfirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Unpausing...
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5 mr-2" />
                        Unpause Vault
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => controls.pause()}
                    disabled={controls.isPending || controls.isConfirming}
                    className="btn-danger w-full"
                  >
                    {controls.isPending || controls.isConfirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Pausing...
                      </>
                    ) : (
                      <>
                        <Pause className="h-5 w-5 mr-2" />
                        Pause Vault
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Emergency Mode Control */}
            <div className="card">
              <div className="flex items-center space-x-3 mb-6">
                <div className={`p-2 rounded-lg ${vaultStatus.emergencyMode ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
                  <AlertTriangle className={`h-6 w-6 ${vaultStatus.emergencyMode ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Emergency Mode
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {vaultStatus.emergencyMode ? 'Emergency active' : 'Normal operations'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    Critical Action
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Emergency mode enables pro-rata withdrawals and snapshots current AUM. Only use in critical situations like smart contract vulnerabilities or oracle failures.
                  </p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-1 text-sm">
                    Effects of Emergency Mode
                  </h4>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5 list-disc list-inside">
                    <li>Normal deposits/redemptions disabled</li>
                    <li>Users can withdraw pro-rata share</li>
                    <li>AUM is snapshotted at trigger time</li>
                    <li>Queues are frozen</li>
                  </ul>
                </div>

                {vaultStatus.emergencyMode ? (
                  <button
                    onClick={() => controls.exitEmergency()}
                    disabled={controls.isPending || controls.isConfirming}
                    className="btn-primary w-full"
                  >
                    {controls.isPending || controls.isConfirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Exiting...
                      </>
                    ) : (
                      'Exit Emergency Mode'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to trigger emergency mode? This action should only be taken in critical situations.')) {
                        controls.triggerEmergency()
                      }
                    }}
                    disabled={controls.isPending || controls.isConfirming}
                    className="btn-danger w-full"
                  >
                    {controls.isPending || controls.isConfirming ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Triggering...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Trigger Emergency
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {controls.isSuccess && (
            <div className="card">
              <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                <CheckCircle className="h-5 w-5" />
                <span>Operation completed successfully!</span>
              </div>
            </div>
          )}

          {controls.error && (
            <div className="card">
              <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                <XCircle className="h-5 w-5" />
                <span>Error: {controls.error.message}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
