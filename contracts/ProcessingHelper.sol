// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./QueueManager.sol";
import "./FeeManager.sol";

library ProcessingHelper {
    using SafeERC20 for IERC20;

    function processDepositMints(
        QueueManager.QueueStorage storage queueStorage,
        uint256 startIdx,
        uint256 count,
        uint256 nav,
        IERC20 baseToken,
        address safeWallet,
        function(uint256) internal view returns (uint256) normalize,
        function(uint256) internal returns (uint256, uint256) accrueEntranceFee,
        function(address, uint256) internal mint,
        function(address, uint256, uint256) internal emitDeposited
    ) internal {
        for (uint256 i = 0; i < count; i++) {
            uint256 idx = startIdx + i;
            QueueManager.QueueItem storage item = queueStorage.depositQueue[idx];

            if (item.processed && item.amount > 0) {
                (uint256 netAmountNative, ) = accrueEntranceFee(item.amount);
                uint256 netAmount = normalize(netAmountNative);
                uint256 shares = nav > 0 ? (netAmount * 1e18) / nav : netAmount;

                if (shares == 0) continue;

                mint(item.user, shares);
                baseToken.safeTransfer(safeWallet, netAmountNative);
                emitDeposited(item.user, item.amount, shares);
            }
        }
    }
}
