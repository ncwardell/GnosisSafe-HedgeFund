// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library EmergencyManager {
    using SafeERC20 for IERC20;

    uint256 private constant EMERGENCY_THRESHOLD = 30 days;

    struct EmergencyStorage {
        bool emergencyMode;
        uint256 emergencySnapshot;
        uint256 emergencyTotalWithdrawn;
        uint256 pauseTimestamp;
    }

    event EmergencyToggled(bool enabled);
    event EmergencyRedeemed(address indexed user, uint256 shares, uint256 amount);
    event PayoutFailed(address indexed user, uint256 amount, string reason);

    error NotInEmergency();
    error NoSupply();
    error PayoutExecutionFailed();
    error ModuleNotEnabled();
    error NotPaused();
    error ThresholdNotMet();

    function triggerEmergency(
        EmergencyStorage storage es,
        uint256 currentAum
    ) external {
        if (es.emergencyMode) return;
        es.emergencyMode = true;
        es.emergencySnapshot = currentAum;
        es.emergencyTotalWithdrawn = 0;
        emit EmergencyToggled(true);
    }

    function checkEmergencyThreshold(
        EmergencyStorage storage es,
        bool isPaused,
        uint256 currentAum,
        uint256 aumTimestamp
    ) external {
    bool pausedLongEnough = isPaused &&
        block.timestamp >= es.pauseTimestamp + EMERGENCY_THRESHOLD;

    bool aumStaleLongEnough =
        block.timestamp >= aumTimestamp + EMERGENCY_THRESHOLD;

    if (!pausedLongEnough && !aumStaleLongEnough) {
        revert ThresholdNotMet();
    }

    if (es.emergencyMode) return;

    es.emergencyMode = true;
    es.emergencySnapshot = currentAum;
    es.emergencyTotalWithdrawn = 0;
    emit EmergencyToggled(true);
}

    function exitEmergency(EmergencyStorage storage es) external {
        if (!es.emergencyMode) return;
        es.emergencyMode = false;
        es.emergencySnapshot = 0;
        es.emergencyTotalWithdrawn = 0;
        emit EmergencyToggled(false);
    }

    function emergencyWithdraw(
        EmergencyStorage storage es,
        uint256 shares,
        uint256 totalSupply,
        uint256 currentAum,
        function(address, uint256) internal burn,
        function(address, uint256) internal payout
    ) internal {
        if (!es.emergencyMode) revert NotInEmergency();
        if (shares == 0 || totalSupply == 0) revert NoSupply();

        uint256 entitlement = (shares * es.emergencySnapshot) / totalSupply;
        uint256 available = currentAum;
        uint256 remainingClaims = es.emergencySnapshot - es.emergencyTotalWithdrawn;

        uint256 payoutAmount = available >= remainingClaims
            ? entitlement
            : (entitlement * available) / remainingClaims;

        burn(msg.sender, shares);
        es.emergencyTotalWithdrawn += entitlement;

        payout(msg.sender, payoutAmount);

        emit EmergencyRedeemed(msg.sender, shares, payoutAmount);
    }

    function executePayout(
        IERC20 baseToken,
        address user,
        uint256 amount,
        address safeWallet,
        function() view returns (bool) isModuleEnabled
    ) internal {
        uint256 vaultBal = baseToken.balanceOf(address(this));

        if (vaultBal >= amount) {
            baseToken.safeTransfer(user, amount);
            return;
        }

        if (vaultBal > 0) {
            baseToken.safeTransfer(user, vaultBal);
        }

        uint256 remaining = amount - vaultBal;
        if (remaining == 0) return;

        if (!isModuleEnabled()) {
            emit PayoutFailed(user, remaining, "module not enabled");
            revert ModuleNotEnabled();
        }

        bytes memory data = abi.encodeWithSelector(IERC20.transfer.selector, user, remaining);
        (bool success, ) = safeWallet.call(
            abi.encodeWithSignature(
                "execTransactionFromModule(address,uint256,bytes,uint8)",
                address(baseToken), 0, data, 0
            )
        );

        if (!success) {
            emit PayoutFailed(user, remaining, "Safe exec failed");
            revert PayoutExecutionFailed();
        }
    }

    function isEmergencyActive(EmergencyStorage storage es) external view returns (bool) {
        return es.emergencyMode;
    }

    function emergencyInfo(EmergencyStorage storage es)
        external
        view
        returns (
            bool active,
            uint256 snapshot,
            uint256 withdrawn,
            uint256 pauseTime
        )
    {
        active = es.emergencyMode;
        snapshot = es.emergencySnapshot;
        withdrawn = es.emergencyTotalWithdrawn;
        pauseTime = es.pauseTimestamp;
    }
}
