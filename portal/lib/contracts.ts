export const VAULT_ADDRESS = process.env.NEXT_PUBLIC_VAULT_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000'

export const VAULT_ABI = [
  // View functions
  'function navPerShare() external view returns (uint256)',
  'function getTotalAum() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function getPosition(address user) external view returns (uint256 shares, uint256 pendingDeposits, uint256 pendingRedemptions)',
  'function accruedFees() external view returns (uint256 managementFees, uint256 performanceFees, uint256 entranceFees, uint256 exitFees)',
  'function getHWMStatus() external view returns (uint256 currentHWM, uint256 currentNav, bool inDrawdown, bool inRecovery, uint256 lowestNavSinceDrawdown, uint256 recoveryStartTime, uint256 timeToReset)',
  'function queueLengths() external view returns (uint256 depositQueueLength, uint256 redemptionQueueLength)',
  'function getPendingDeposits(uint256 start, uint256 limit) external view returns (tuple(address user, uint256 amount, uint256 navAtQueue, uint256 minShares, uint256 timestamp, bool processed)[])',
  'function getPendingRedemptions(uint256 start, uint256 limit) external view returns (tuple(address user, uint256 shares, uint256 navAtQueue, uint256 minAmountOut, uint256 timestamp, bool processed)[])',
  'function paused() external view returns (bool)',
  'function emergencyMode() external view returns (bool)',

  // User functions
  'function deposit(uint256 amount, uint256 minShares) external returns (uint256)',
  'function redeem(uint256 shares, uint256 minAmountOut) external returns (uint256)',
  'function cancelMyDeposits(uint256 maxCancellations) external returns (uint256)',
  'function cancelMyRedemptions(uint256 maxCancellations) external returns (uint256)',
  'function emergencyWithdraw(uint256 shares) external returns (uint256)',

  // Admin functions
  'function updateAum(uint256 newAum) external',
  'function processDepositQueue(uint256 maxToProcess) external returns (uint256)',
  'function processRedemptionQueue(uint256 maxToProcess) external returns (uint256)',
  'function payoutAccruedFees() external',
  'function pause() external',
  'function unpause() external',
  'function triggerEmergency() external',
  'function exitEmergency() external',
  'function proposeConfigChange(string memory key, uint256 value) external',
  'function executeConfigProposal(string memory key, uint256 value) external',

  // Role management
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',

  // Events
  'event Deposit(address indexed user, uint256 amount, uint256 shares)',
  'event Redeem(address indexed user, uint256 shares, uint256 amount)',
  'event AumUpdated(uint256 newAum, uint256 navPerShare)',
  'event FeesAccrued(uint256 managementFees, uint256 performanceFees, uint256 entranceFees, uint256 exitFees)',
  'event FeesPaidOut(address indexed recipient, uint256 amount)',
] as const

export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
  'function name() external view returns (string)',
] as const

// Role hashes (keccak256 of role names)
export const ROLES = {
  DEFAULT_ADMIN: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ADMIN: '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775',
  AUM_UPDATER: '0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0',
  PROCESSOR: '0x859b62f4f5b0e8d8c88f5f0e3de8e1c1d2a2e8b4c7f5d9c8e4a2b6f7d1c3e8a4',
  GUARDIAN: '0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041',
} as const
