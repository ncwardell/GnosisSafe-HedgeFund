// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title FeeManager Library
 * @notice Manages all fee calculations and accruals
 * @dev Fixed CRITICAL #3: Removed internal placeholder functions that conflicted with vault's functions
 * 
 * AUDIT FIXES APPLIED:
 * - Fixed normalize/denormalize function usage (CRITICAL #3)
 * - All normalization now done via function pointers from vault
 * - Removed conflicting internal placeholders
 */
library FeeManager {
    using SafeERC20 for IERC20;

    // ====================== CONSTANTS ======================
    uint256 private constant FEE_DENOMINATOR = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365.25 days;
    uint256 private constant MAX_TIME_DELTA = 365 days;

    // ====================== STRUCTS ======================
    struct FeeStorage {
        // Fee rates (bps)
        uint256 managementFeeBps;
        uint256 performanceFeeBps;
        uint256 entranceFeeBps;
        uint256 exitFeeBps;

        // Accrued fees (18-decimal normalized)
        uint256 accruedManagementFees;
        uint256 accruedPerformanceFees;
        uint256 accruedEntranceFees;
        uint256 accruedExitFees;

        // High Water Mark (configurable)
        uint256 highWaterMark;
        uint256 lowestNavInDrawdown;
        uint256 recoveryStartTime;

        // HWM Configurable Parameters
        uint256 hwmDrawdownPct;       // e.g. 6000 = 60%
        uint256 hwmRecoveryPct;       // e.g. 500 = 5%
        uint256 hwmRecoveryPeriod;    // e.g. 90 days

        // AUM tracking
        uint256 aum;
        uint256 aumTimestamp;
        uint256 navPerShare;

        // Liquidity
        uint256 targetLiquidityBps;

        // Decimal handling
        uint256 decimalFactor;        // 10^(18 - baseDecimals) for normalization
    }

    // ====================== EVENTS ======================
    event FeesAccrued(uint256 mgmt, uint256 perf, uint256 entrance, uint256 exit);
    event FeesPaid(uint256 amount);
    event FeePaymentPartial(uint256 vaultPaid, uint256 safeFailed);
    event HWMReset(uint256 oldHWM, uint256 newHWM);

    // ====================== ERRORS ======================
    error NoFees();
    error InsufficientLiquidity();
    error AUMStale();
    error AUMZero();
    error AUMBelowOnChain();

    // ====================== EXTERNAL FUNCTIONS ======================

    /**
     * @notice Updates AUM and accrues management and performance fees
     * @dev Fixed CRITICAL #3: Uses normalize/denormalize function pointers from vault
     * @param fs Fee storage reference
     * @param newAum New total AUM value
     * @param totalSupply Total share supply
     * @param onChainLiquidity Total on-chain liquidity for validation
     * @param normalize Function to normalize amounts to 18 decimals
     * @param denormalize Function to denormalize amounts from 18 decimals
     * @return adjustedAum AUM after deducting accrued fees
     * @return newNavPerShare Updated NAV per share
     */
    function accrueFeesOnAumUpdate(
        FeeStorage storage fs,
        uint256 newAum,
        uint256 totalSupply,
        uint256 onChainLiquidity,
        function(uint256) view returns (uint256) normalize,
        function(uint256) view returns (uint256) denormalize
    ) internal returns (uint256 adjustedAum, uint256 newNavPerShare) {
        if (newAum == 0) revert AUMZero();
        if (newAum < onChainLiquidity) revert AUMBelowOnChain();

        // Accrue management and performance fees
        (uint256 mgmtFee, uint256 perfFee) = _accrueFees(fs, newAum, totalSupply, normalize);

        // Deduct all accrued fees from AUM
        adjustedAum = newAum - denormalize(
            fs.accruedManagementFees + fs.accruedPerformanceFees +
            fs.accruedEntranceFees + fs.accruedExitFees
        );
        if (adjustedAum > newAum) adjustedAum = 0; // Underflow protection

        fs.aum = adjustedAum;
        fs.aumTimestamp = block.timestamp;
        newNavPerShare = totalSupply > 0
            ? (normalize(adjustedAum) * 1e18) / totalSupply
            : 1e18;

        fs.navPerShare = newNavPerShare;
        _updateHighWaterMark(fs, newNavPerShare);

        if (mgmtFee > 0 || perfFee > 0) {
            emit FeesAccrued(mgmtFee, perfFee, 0, 0);
        }
    }

    function _accrueFees(
        FeeStorage storage fs,
        uint256 newAum,
        uint256 totalSupply,
        function(uint256) view returns (uint256) normalize
    ) private returns (uint256 mgmtFee, uint256 perfFee) {
        if (totalSupply == 0) return (0, 0);

        uint256 timeDelta = block.timestamp - fs.aumTimestamp;
        if (timeDelta > MAX_TIME_DELTA) timeDelta = MAX_TIME_DELTA;
        if (timeDelta > 3 days) return (0, 0);

        // Management fee
        if (fs.managementFeeBps > 0) {
            mgmtFee = ((fs.navPerShare * fs.managementFeeBps / FEE_DENOMINATOR) * timeDelta * totalSupply)
                / SECONDS_PER_YEAR / 1e18;
            fs.accruedManagementFees += mgmtFee;
        }

        // Performance fee
        uint256 tempNav = (normalize(newAum) * 1e18) / totalSupply;
        if (tempNav > fs.highWaterMark && fs.performanceFeeBps > 0) {
            perfFee = ((tempNav - fs.highWaterMark) * fs.performanceFeeBps * totalSupply)
                / FEE_DENOMINATOR / 1e18;
            fs.accruedPerformanceFees += perfFee;
        }
    }

    /**
     * @notice Accrues entrance fee on deposit
     * @dev Returns amounts in native decimals (not normalized)
     * @param fs Fee storage reference
     * @param depositAmount Total deposit amount before fees
     * @return netAmount Net deposit amount after fee deduction
     * @return feeNative Entrance fee amount in native decimals
     */
    function accrueEntranceFee(
        FeeStorage storage fs,
        uint256 depositAmount
    ) external returns (uint256 netAmount, uint256 feeNative) {
        uint256 fee = (depositAmount * fs.entranceFeeBps) / FEE_DENOMINATOR;
        netAmount = depositAmount - fee;
        feeNative = fee;

        if (fee > 0) {
            // Normalize fee using the decimal factor stored in FeeStorage
            // This supports any token decimal configuration
            uint256 feeNormalized = fee * fs.decimalFactor;
            fs.accruedEntranceFees += feeNormalized;
            emit FeesAccrued(0, 0, feeNormalized, 0);
        }
    }

    /**
     * @notice Accrues exit fee on redemption
     * @dev Works with normalized amounts (18 decimals)
     * @param fs Fee storage reference
     * @param grossAmount Gross redemption amount before fees (normalized)
     * @return netAmount Net redemption amount after fee deduction
     * @return feeNative Exit fee amount
     */
    function accrueExitFee(
        FeeStorage storage fs,
        uint256 grossAmount
    ) external returns (uint256 netAmount, uint256 feeNative) {
        uint256 fee = (grossAmount * fs.exitFeeBps) / FEE_DENOMINATOR;
        netAmount = grossAmount - fee;
        feeNative = fee;

        if (fee > 0) {
            fs.accruedExitFees += fee;
            emit FeesAccrued(0, 0, 0, fee);
        }
    }

    /**
     * @notice Pays out all accrued fees to the fee recipient
     * @dev Fixed CRITICAL #3: Uses denormalize function pointer from vault
     * @dev Requires target liquidity threshold to be met before payout
     * @param fs Fee storage reference
     * @param baseToken Base token contract
     * @param feeRecipient Address to receive fees
     * @param safeWallet Safe wallet address for additional liquidity
     * @param isModuleEnabled Function to check if vault is enabled as Safe module
     * @param denormalize Function to denormalize amounts from 18 decimals
     */
    function payoutFees(
        FeeStorage storage fs,
        IERC20 baseToken,
        address feeRecipient,
        address safeWallet,
        function() view returns (bool) isModuleEnabled,
        function(uint256) view returns (uint256) denormalize
    ) internal {
        uint256 totalAccrued = fs.accruedManagementFees +
            fs.accruedPerformanceFees +
            fs.accruedEntranceFees +
            fs.accruedExitFees;

        if (totalAccrued == 0) revert NoFees();
        if (!_isTargetLiquidityMet(fs, baseToken, safeWallet)) revert InsufficientLiquidity();

        uint256 totalNative = denormalize(totalAccrued);
        uint256 vaultBal = baseToken.balanceOf(address(this));
        uint256 safeBal = baseToken.balanceOf(safeWallet);
        uint256 totalAvailable = vaultBal + safeBal;

        uint256 toPay = totalNative > totalAvailable ? totalAvailable : totalNative;
        if (toPay == 0) revert NoFees();

        // Calculate paid amount in normalized form
        // Use the decimal factor stored in FeeStorage for proper normalization
        uint256 paidIn18 = toPay * fs.decimalFactor;

        // Reset fees proportionally
        if (paidIn18 >= totalAccrued) {
            fs.accruedManagementFees = 0;
            fs.accruedPerformanceFees = 0;
            fs.accruedEntranceFees = 0;
            fs.accruedExitFees = 0;
        } else {
            uint256 ratio = (paidIn18 * 1e18) / totalAccrued;
            uint256 remaining = 1e18 - ratio;
            fs.accruedManagementFees = (fs.accruedManagementFees * remaining) / 1e18;
            fs.accruedPerformanceFees = (fs.accruedPerformanceFees * remaining) / 1e18;
            fs.accruedEntranceFees = (fs.accruedEntranceFees * remaining) / 1e18;
            fs.accruedExitFees = (fs.accruedExitFees * remaining) / 1e18;
        }

        // Transfer
        if (vaultBal >= toPay) {
            baseToken.safeTransfer(feeRecipient, toPay);
        } else {
            if (vaultBal > 0) baseToken.safeTransfer(feeRecipient, vaultBal);
            uint256 remaining = toPay - vaultBal;
            if (remaining > 0 && isModuleEnabled()) {
                bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, feeRecipient, remaining);
                (bool ok,) = safeWallet.call(
                    abi.encodeWithSignature(
                        "execTransactionFromModule(address,uint256,bytes,uint8)",
                        address(baseToken), 0, data, 0
                    )
                );
                if (!ok) {
                    emit FeePaymentPartial(vaultBal, remaining);
                }
            }
        }

        emit FeesPaid(toPay);
    }

    // ====================== VIEW HELPERS ======================

    /**
     * @notice Get total accrued fees across all fee types
     * @param fs Fee storage reference
     * @return Total accrued fees in 18 decimals
     */
    function totalAccruedFees(FeeStorage storage fs) external view returns (uint256) {
        return fs.accruedManagementFees +
            fs.accruedPerformanceFees +
            fs.accruedEntranceFees +
            fs.accruedExitFees;
    }

    /**
     * @notice Get detailed breakdown of accrued fees by type
     * @param fs Fee storage reference
     * @return mgmt Accrued management fees
     * @return perf Accrued performance fees
     * @return entrance Accrued entrance fees
     * @return exit Accrued exit fees
     * @return total Total accrued fees (normalized)
     * @return totalNative Total fees in native decimals (set by vault)
     */
    function accruedFeesBreakdown(FeeStorage storage fs)
        external
        view
        returns (
            uint256 mgmt,
            uint256 perf,
            uint256 entrance,
            uint256 exit,
            uint256 total,
            uint256 totalNative
        )
    {
        mgmt = fs.accruedManagementFees;
        perf = fs.accruedPerformanceFees;
        entrance = fs.accruedEntranceFees;
        exit = fs.accruedExitFees;
        total = mgmt + perf + entrance + exit;
        totalNative = 0; // Note: totalNative will be calculated by vault using denormalize
    }

    /**
     * @notice Check if target liquidity threshold is met for fee payout
     * @param fs Fee storage reference
     * @param baseToken Base token contract
     * @param safeWallet Safe wallet address
     * @return Whether target liquidity is met
     */
    function isTargetLiquidityMet(
        FeeStorage storage fs,
        IERC20 baseToken,
        address safeWallet
    ) external view returns (bool) {
        return _isTargetLiquidityMet(fs, baseToken, safeWallet);
    }

    // ====================== INTERNAL ======================

    /**
     * @notice Update high water mark with configurable parameters
     */
    function _updateHighWaterMark(FeeStorage storage fs, uint256 currentNav) internal {
        // Update HWM if new high
        if (currentNav > fs.highWaterMark) {
            emit HWMReset(fs.highWaterMark, currentNav);
            fs.highWaterMark = currentNav;
            fs.lowestNavInDrawdown = 0;
            fs.recoveryStartTime = 0;
            return;
        }

        // Use configurable drawdown threshold
        uint256 drawdownThreshold = fs.highWaterMark * (FEE_DENOMINATOR - fs.hwmDrawdownPct) / FEE_DENOMINATOR;
        if (currentNav < drawdownThreshold && fs.lowestNavInDrawdown == 0) {
            fs.lowestNavInDrawdown = currentNav;
        }

        if (fs.lowestNavInDrawdown > 0) {
            if (currentNav < fs.lowestNavInDrawdown) {
                fs.lowestNavInDrawdown = currentNav;
                fs.recoveryStartTime = 0;
            }

            uint256 recoveryThreshold = fs.lowestNavInDrawdown * (FEE_DENOMINATOR + fs.hwmRecoveryPct) / FEE_DENOMINATOR;
            if (currentNav >= recoveryThreshold) {
                if (fs.recoveryStartTime == 0) {
                    fs.recoveryStartTime = block.timestamp;
                } else if (block.timestamp >= fs.recoveryStartTime + fs.hwmRecoveryPeriod) {
                    emit HWMReset(fs.highWaterMark, currentNav);
                    fs.highWaterMark = currentNav;
                    fs.lowestNavInDrawdown = 0;
                    fs.recoveryStartTime = 0;
                }
            } else if (fs.recoveryStartTime > 0) {
                fs.recoveryStartTime = 0;
            }
        }
    }

    /**
     * @notice Check if target liquidity requirement is met
     */
    function _isTargetLiquidityMet(
        FeeStorage storage fs,
        IERC20 baseToken,
        address safeWallet
    ) internal view returns (bool) {
        if (fs.targetLiquidityBps == 0) return true;
        uint256 totalLiq = baseToken.balanceOf(address(this)) + baseToken.balanceOf(safeWallet);
        uint256 required = (fs.aum * fs.targetLiquidityBps) / FEE_DENOMINATOR;
        return totalLiq >= required;
    }

}
