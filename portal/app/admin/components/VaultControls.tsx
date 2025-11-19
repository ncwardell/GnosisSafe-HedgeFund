'use client'

import { useEmergencyControls, useVaultStatus } from '@/hooks/useVault'
import { Pause, Play, Loader2, CheckCircle, XCircle } from 'lucide-react'

export function VaultControls() {
  const controls = useEmergencyControls()
  const vaultStatus = useVaultStatus()

  return (
    <div className="card">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Vault Controls
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pause/Unpause */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Pause Status
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vaultStatus.paused ? 'Vault is paused' : 'Vault is active'}
              </p>
            </div>
            {vaultStatus.paused ? (
              <Pause className="h-8 w-8 text-yellow-600" />
            ) : (
              <Play className="h-8 w-8 text-green-600" />
            )}
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

        {/* Emergency Mode */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Emergency Mode
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {vaultStatus.emergencyMode ? 'Emergency active' : 'Normal operations'}
              </p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700 dark:text-red-400">
              Warning: Emergency mode enables pro-rata withdrawals. Only use in critical situations.
            </p>
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
              onClick={() => controls.triggerEmergency()}
              disabled={controls.isPending || controls.isConfirming}
              className="btn-danger w-full"
            >
              {controls.isPending || controls.isConfirming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Triggering...
                </>
              ) : (
                'Trigger Emergency'
              )}
            </button>
          )}
        </div>
      </div>

      {controls.isSuccess && (
        <div className="mt-4 flex items-center space-x-2 text-green-600 dark:text-green-400 text-sm">
          <CheckCircle className="h-5 w-5" />
          <span>Operation completed successfully!</span>
        </div>
      )}

      {controls.error && (
        <div className="mt-4 flex items-center space-x-2 text-red-600 dark:text-red-400 text-sm">
          <XCircle className="h-5 w-5" />
          <span>Error: {controls.error.message}</span>
        </div>
      )}
    </div>
  )
}
