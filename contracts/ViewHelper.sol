// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FeeManager.sol";
import "./QueueManager.sol";

/**
 * @title ViewHelper
 * @notice External library for view functions to reduce main contract size
 * @dev All functions are external/public to keep bytecode out of main contract
 */
library ViewHelper {
    /**
     * @notice Calculate NAV (Net Asset Value) per share
     * @param aum Total assets under management (normalized)
     * @param totalSupply Total share supply
     * @param totalFees Total accrued fees (normalized)
     * @param decimalFactor Decimal normalization factor
     * @return Current NAV per share in 18 decimals
     */
    function calculateNav(
        uint256 aum,
        uint256 totalSupply,
        uint256 totalFees,
        uint256 decimalFactor
    ) external pure returns (uint256) {
        uint256 netAum = aum > totalFees ? aum - totalFees : 0;
        if (totalSupply == 0) {
            return decimalFactor * 1e18;
        }
        return (netAum * 1e18) / totalSupply;
    }

    /**
     * @notice Estimate shares to be received for a deposit amount
     * @param amount Amount of base tokens to deposit (native decimals)
     * @param entranceFeeBps Entrance fee in basis points
     * @param nav Current NAV per share
     * @param decimalFactor Decimal normalization factor
     * @return Estimated shares after entrance fees
     */
    function estimateShares(
        uint256 amount,
        uint256 entranceFeeBps,
        uint256 nav,
        uint256 decimalFactor
    ) external pure returns (uint256) {
        uint256 netAmount = amount - (amount * entranceFeeBps) / 10000;
        uint256 normalized = netAmount * decimalFactor;
        return nav > 0 ? (normalized * 1e18) / nav : normalized;
    }

    /**
     * @notice Estimate payout for redeeming shares
     * @param shares Number of shares to redeem
     * @param nav Current NAV per share
     * @param exitFeeBps Exit fee in basis points
     * @param decimalFactor Decimal normalization factor
     * @return Estimated base tokens after exit fees (native decimals)
     */
    function estimatePayout(
        uint256 shares,
        uint256 nav,
        uint256 exitFeeBps,
        uint256 decimalFactor
    ) external pure returns (uint256) {
        uint256 gross = (shares * nav) / 1e18;
        uint256 net = gross - (gross * exitFeeBps) / 10000;
        return net / decimalFactor;
    }

    /**
     * @notice Get high water mark status and recovery progress
     * @param hwm Current high water mark
     * @param lowestNav Lowest NAV during drawdown
     * @param recoveryStart Recovery start timestamp
     * @param currentNav Current NAV per share
     * @param hwmRecoveryPeriod Recovery period duration
     * @return hwmOut Current high water mark
     * @return lowestNavOut Lowest NAV during drawdown period
     * @return recoveryStartOut Timestamp when recovery period started
     * @return daysToReset Days remaining until HWM reset
     */
    function getHWMStatus(
        uint256 hwm,
        uint256 lowestNav,
        uint256 recoveryStart,
        uint256 currentNav,
        uint256 hwmRecoveryPeriod
    ) external view returns (
        uint256 hwmOut,
        uint256 lowestNavOut,
        uint256 recoveryStartOut,
        uint256 daysToReset
    ) {
        hwmOut = hwm;
        lowestNavOut = lowestNav;
        recoveryStartOut = recoveryStart;

        if (recoveryStart > 0 && block.timestamp < recoveryStart + hwmRecoveryPeriod) {
            uint256 elapsed = block.timestamp - recoveryStart;
            uint256 remaining = hwmRecoveryPeriod - elapsed;
            daysToReset = remaining / 1 days;
        } else {
            daysToReset = 0;
        }

        return (hwmOut, lowestNavOut, recoveryStartOut, daysToReset);
    }

    /**
     * @notice Get breakdown of all accrued fees
     * @param accruedMgmtFees Accrued management fees
     * @param accruedPerfFees Accrued performance fees
     * @param accruedEntranceFees Accrued entrance fees
     * @param accruedExitFees Accrued exit fees
     * @param decimalFactor Decimal normalization factor
     * @return mgmt Accrued management fees
     * @return perf Accrued performance fees
     * @return entrance Accrued entrance fees
     * @return exit Accrued exit fees
     * @return total Total accrued fees (normalized)
     * @return totalNative Total accrued fees in native token decimals
     */
    function accruedFeesBreakdown(
        uint256 accruedMgmtFees,
        uint256 accruedPerfFees,
        uint256 accruedEntranceFees,
        uint256 accruedExitFees,
        uint256 decimalFactor
    ) external pure returns (
        uint256 mgmt,
        uint256 perf,
        uint256 entrance,
        uint256 exit,
        uint256 total,
        uint256 totalNative
    ) {
        mgmt = accruedMgmtFees;
        perf = accruedPerfFees;
        entrance = accruedEntranceFees;
        exit = accruedExitFees;
        total = mgmt + perf + entrance + exit;
        totalNative = total / decimalFactor;
    }

    /**
     * @notice Get user's position details
     * @param shareBalance User's share balance
     * @param nav Current NAV per share
     * @param pendingDep User's pending deposits amount
     * @param pendingRed User's pending redemptions amount
     * @param decimalFactor Decimal normalization factor
     * @return shares User's share balance
     * @return value Current value of shares in base tokens
     * @return pendingDepOut User's pending deposits amount
     * @return pendingRedOut User's pending redemptions amount
     */
    function getPosition(
        uint256 shareBalance,
        uint256 nav,
        uint256 pendingDep,
        uint256 pendingRed,
        uint256 decimalFactor
    ) external pure returns (
        uint256 shares,
        uint256 value,
        uint256 pendingDepOut,
        uint256 pendingRedOut
    ) {
        shares = shareBalance;
        value = ((shares * nav) / 1e18) / decimalFactor;
        pendingDepOut = pendingDep;
        pendingRedOut = pendingRed;
    }

    /**
     * @notice Get total AUM (Assets Under Management) after fees
     * @param vaultBalance Vault's base token balance
     * @param safeBalance Safe's base token balance
     * @param totalFees Total accrued fees (normalized)
     * @param decimalFactor Decimal normalization factor
     * @return Total AUM in base token decimals
     */
    function getTotalAum(
        uint256 vaultBalance,
        uint256 safeBalance,
        uint256 totalFees,
        uint256 decimalFactor
    ) external pure returns (uint256) {
        uint256 onChain = vaultBalance + safeBalance;
        uint256 fees = totalFees / decimalFactor;
        return onChain >= fees ? onChain - fees : 0;
    }

    /**
     * @notice Comprehensive fund configuration view
     * @dev Struct definition kept in library for use by main contract
     */
    struct FundConfig {
        uint256 managementFeeBps;
        uint256 performanceFeeBps;
        uint256 entranceFeeBps;
        uint256 exitFeeBps;
        uint256 targetLiquidityBps;
        uint256 minDeposit;
        uint256 minRedemption;
        uint256 maxAumAge;
        uint256 maxBatchSize;
        uint256 hwmDrawdownPct;
        uint256 hwmRecoveryPct;
        uint256 hwmRecoveryPeriod;
        bool autoProcessDeposits;
        bool autoPayoutRedemptions;
        address feeRecipient;
        address rescueTreasury;
        uint256 lastAumUpdate;
    }
}
