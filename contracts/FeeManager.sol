// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

library FeeManager {
    using SafeERC20 for IERC20;

    uint256 private constant FEE_DENOMINATOR = 10_000;
    uint256 private constant SECONDS_PER_YEAR = 365.25 days;
    uint256 private constant MAX_TIME_DELTA = 365 days;

    struct FeeStorage {
        uint256 managementFeeBps;
        uint256 performanceFeeBps;
        uint256 entranceFeeBps;
        uint256 exitFeeBps;

        uint256 accruedManagementFees;
        uint256 accruedPerformanceFees;
        uint256 accruedEntranceFees;
        uint256 accruedExitFees;

        uint256 highWaterMark;
        uint256 lowestNavInDrawdown;
        uint256 recoveryStartTime;

        uint256 hwmDrawdownPct;
        uint256 hwmRecoveryPct;
        uint256 hwmRecoveryPeriod;

        uint256 aum;
        uint256 aumTimestamp;
        uint256 navPerShare;

        uint256 targetLiquidityBps;

        uint256 decimalFactor;
    }

    event FeesAccrued(uint256 mgmt, uint256 perf, uint256 entrance, uint256 exit);
    event FeesPaid(uint256 amount);
    event FeePaymentPartial(uint256 vaultPaid, uint256 safeFailed);
    event HWMReset(uint256 oldHWM, uint256 newHWM);

    error NoFees();
    error InsufficientLiquidity();
    error AUMStale();
    error AUMZero();
    error AUMBelowOnChain();

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

        (uint256 mgmtFee, uint256 perfFee) = _accrueFees(fs, newAum, totalSupply, normalize);

        adjustedAum = newAum - denormalize(
            fs.accruedManagementFees + fs.accruedPerformanceFees +
            fs.accruedEntranceFees + fs.accruedExitFees
        );
        if (adjustedAum > newAum) adjustedAum = 0;

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

        if (fs.managementFeeBps > 0) {
            mgmtFee = ((fs.navPerShare * fs.managementFeeBps / FEE_DENOMINATOR) * timeDelta * totalSupply)
                / SECONDS_PER_YEAR / 1e18;
            fs.accruedManagementFees += mgmtFee;
        }

        uint256 tempNav = (normalize(newAum) * 1e18) / totalSupply;
        if (tempNav > fs.highWaterMark && fs.performanceFeeBps > 0) {
            perfFee = ((tempNav - fs.highWaterMark) * fs.performanceFeeBps * totalSupply)
                / FEE_DENOMINATOR / 1e18;
            fs.accruedPerformanceFees += perfFee;
        }
    }

    function accrueEntranceFee(
        FeeStorage storage fs,
        uint256 depositAmount
    ) external returns (uint256 netAmount, uint256 feeNative) {
        uint256 fee = (depositAmount * fs.entranceFeeBps) / FEE_DENOMINATOR;
        netAmount = depositAmount - fee;
        feeNative = fee;

        if (fee > 0) {
            uint256 feeNormalized = fee * fs.decimalFactor;
            fs.accruedEntranceFees += feeNormalized;
            emit FeesAccrued(0, 0, feeNormalized, 0);
        }
    }

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

    function payoutFees(
        FeeStorage storage fs,
        IERC20 baseToken,
        address feeRecipient,
        address safeWallet,
        function() view returns (bool) isModuleEnabled,
        function(uint256) view returns (uint256) denormalize
    ) internal {
        uint256 totalAccrued = fs.accruedManagementFees + fs.accruedPerformanceFees +
            fs.accruedEntranceFees + fs.accruedExitFees;

        if (totalAccrued == 0) revert NoFees();
        if (!_isTargetLiquidityMet(fs, baseToken, safeWallet)) revert InsufficientLiquidity();

        uint256 totalNative = denormalize(totalAccrued);
        uint256 totalAvailable = baseToken.balanceOf(address(this)) + baseToken.balanceOf(safeWallet);
        uint256 toPay = totalNative > totalAvailable ? totalAvailable : totalNative;

        if (toPay == 0) revert NoFees();

        _resetFeesProportionally(fs, toPay, totalAccrued);

        _executeFeePayout(baseToken, feeRecipient, safeWallet, toPay, isModuleEnabled);

        emit FeesPaid(toPay);
    }

    function _resetFeesProportionally(
        FeeStorage storage fs,
        uint256 toPay,
        uint256 totalAccrued
    ) private {
        uint256 paidIn18 = toPay * fs.decimalFactor;

        if (paidIn18 >= totalAccrued) {
            fs.accruedManagementFees = 0;
            fs.accruedPerformanceFees = 0;
            fs.accruedEntranceFees = 0;
            fs.accruedExitFees = 0;
        } else {
            uint256 remaining = 1e18 - (paidIn18 * 1e18) / totalAccrued;
            fs.accruedManagementFees = (fs.accruedManagementFees * remaining) / 1e18;
            fs.accruedPerformanceFees = (fs.accruedPerformanceFees * remaining) / 1e18;
            fs.accruedEntranceFees = (fs.accruedEntranceFees * remaining) / 1e18;
            fs.accruedExitFees = (fs.accruedExitFees * remaining) / 1e18;
        }
    }

    function _executeFeePayout(
        IERC20 baseToken,
        address feeRecipient,
        address safeWallet,
        uint256 toPay,
        function() view returns (bool) isModuleEnabled
    ) private {
        uint256 vaultBal = baseToken.balanceOf(address(this));

        if (vaultBal >= toPay) {
            baseToken.safeTransfer(feeRecipient, toPay);
            return;
        }

        if (vaultBal > 0) baseToken.safeTransfer(feeRecipient, vaultBal);

        uint256 remaining = toPay - vaultBal;
        if (remaining > 0 && isModuleEnabled()) {
            (bool ok,) = safeWallet.call(
                abi.encodeWithSignature(
                    "execTransactionFromModule(address,uint256,bytes,uint8)",
                    address(baseToken), 0,
                    abi.encodeWithSelector(IERC20.transfer.selector, feeRecipient, remaining),
                    0
                )
            );
            if (!ok) {
                emit FeePaymentPartial(vaultBal, remaining);
            }
        }
    }

    function totalAccruedFees(FeeStorage storage fs) external view returns (uint256) {
        return fs.accruedManagementFees +
            fs.accruedPerformanceFees +
            fs.accruedEntranceFees +
            fs.accruedExitFees;
    }

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
        totalNative = 0;
    }

    function isTargetLiquidityMet(
        FeeStorage storage fs,
        IERC20 baseToken,
        address safeWallet
    ) external view returns (bool) {
        return _isTargetLiquidityMet(fs, baseToken, safeWallet);
    }

    function _updateHighWaterMark(FeeStorage storage fs, uint256 currentNav) internal {
        if (currentNav > fs.highWaterMark) {
            emit HWMReset(fs.highWaterMark, currentNav);
            fs.highWaterMark = currentNav;
            fs.lowestNavInDrawdown = 0;
            fs.recoveryStartTime = 0;
            return;
        }

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
