// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./FeeManager.sol";

/**
 * @title AdminHelper
 * @notice Library for admin functions to reduce main contract size
 * @dev Storage-modifying functions are internal; utility functions can be external
 */
library AdminHelper {
    using SafeERC20 for IERC20;

    /**
     * @notice Rescue accidentally sent ERC20 tokens (except base token)
     * @param token Address of the token to rescue
     * @param amount Amount of tokens to rescue
     * @param baseToken Address of the base token (cannot be rescued)
     * @param rescueTreasury Address to send rescued tokens
     * @param emitRescued Function to emit TokensRescued event
     * @param revertCannotRescueBase Function to revert with CannotRescueBase error
     */
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

    /**
     * @notice Rescue accidentally sent ETH
     * @param rescueTreasury Address to send rescued ETH
     * @param emitRescued Function to emit ETHRescued event
     */
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

    /**
     * @notice Apply configuration change
     * @param keyHash Hash of the configuration key
     * @param value New value for the configuration
     * @param feeStorage Fee storage struct
     * @param minDeposit Current minimum deposit (passed by reference for update)
     * @param minRedemption Current minimum redemption (passed by reference for update)
     * @param maxAumAge Current max AUM age (passed by reference for update)
     * @param maxBatchSize Current max batch size (passed by reference for update)
     * @return newMinDeposit Updated minimum deposit
     * @return newMinRedemption Updated minimum redemption
     * @return newMaxAumAge Updated max AUM age
     * @return newMaxBatchSize Updated max batch size
     */
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
        // Initialize with current values
        newMinDeposit = minDeposit;
        newMinRedemption = minRedemption;
        newMaxAumAge = maxAumAge;
        newMaxBatchSize = maxBatchSize;

        // Apply changes based on key
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
