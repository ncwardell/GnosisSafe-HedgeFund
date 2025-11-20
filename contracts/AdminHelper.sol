// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FeeManager.sol";

library AdminHelper {
    using SafeERC20 for IERC20;

    function rescueERC20(
        address token,
        uint256 amount,
        address baseToken,
        address rescueTreasury,
        function(address, uint256) internal emitRescued,
        function() internal pure revertCannotRescueBase
    ) internal {
        if (token == baseToken) revertCannotRescueBase();
        IERC20(token).safeTransfer(rescueTreasury, amount);
        emitRescued(token, amount);
    }

    function rescueETH(
        address rescueTreasury,
        function(uint256) internal emitRescued
    ) internal {
        uint256 bal = address(this).balance;
        if (bal > 0) {
            payable(rescueTreasury).transfer(bal);
            emitRescued(bal);
        }
    }

    function applyConfigChange(
        bytes32 keyHash,
        uint256 value,
        FeeManager.FeeStorage storage feeStorage,
        uint256 minDeposit,
        uint256 minRedemption,
        uint256 maxAumAge,
        uint256 maxBatchSize
    ) internal returns (
        uint256 newMinDeposit,
        uint256 newMinRedemption,
        uint256 newMaxAumAge,
        uint256 newMaxBatchSize
    ) {
        newMinDeposit = minDeposit;
        newMinRedemption = minRedemption;
        newMaxAumAge = maxAumAge;
        newMaxBatchSize = maxBatchSize;

        if (keyHash == keccak256("mgmt")) {
            feeStorage.managementFeeBps = value;
        } else if (keyHash == keccak256("perf")) {
            feeStorage.performanceFeeBps = value;
        } else if (keyHash == keccak256("entrance")) {
            feeStorage.entranceFeeBps = value;
        } else if (keyHash == keccak256("exit")) {
            feeStorage.exitFeeBps = value;
        } else if (keyHash == keccak256("targetLiquidity")) {
            feeStorage.targetLiquidityBps = value;
        } else if (keyHash == keccak256("minDeposit")) {
            newMinDeposit = value;
        } else if (keyHash == keccak256("minRedemption")) {
            newMinRedemption = value;
        } else if (keyHash == keccak256("maxAumAge")) {
            newMaxAumAge = value;
        } else if (keyHash == keccak256("maxBatchSize")) {
            newMaxBatchSize = value;
        } else if (keyHash == keccak256("hwmDrawdownPct")) {
            feeStorage.hwmDrawdownPct = value;
        } else if (keyHash == keccak256("hwmRecoveryPct")) {
            feeStorage.hwmRecoveryPct = value;
        } else if (keyHash == keccak256("hwmRecoveryPeriod")) {
            feeStorage.hwmRecoveryPeriod = value;
        }
    }
}
