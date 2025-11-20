// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./FeeManager.sol";
import "./QueueManager.sol";

library ViewHelper {

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

    function getHWMStatus(
        uint256 hwm,
        uint256 lowestNav,
        uint256 recoveryStart,
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
