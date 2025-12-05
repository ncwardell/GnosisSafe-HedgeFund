# ICP.ninja Playground Guide

This guide explains how to deploy and test the ICP hedge fund on ICP.ninja (playground environment).

## Why Simplified Version?

ICP.ninja has limits on canister count. The simplified version:
- **Single canister** instead of 3 (platform + shareToken + frontend)
- **Embedded share tracking** instead of separate ICRC-1 canister
- **Simulated token balances** instead of real ICRC-1 ledger integration
- **All core features** still functional (Decimal, Queue, Fees, HWM)

## Deployment Steps

### 1. Go to ICP.ninja

Visit: https://icp.ninja

### 2. Upload Files

You need to upload these files to the playground:

**Required Files**:
```
backend/
├── main-playground.mo          ← Main canister (renamed to main.mo)
└── lib/
    ├── Decimal.mo             ← Fixed-point math
    ├── QueueManager.mo        ← Queue system
    └── FeeManager.mo          ← Fee engine
```

**Configuration**:
```
dfx.playground.json            ← Rename to dfx.json
```

### 3. File Setup in Playground

1. Create project structure in ICP.ninja editor
2. Copy `backend/main-playground.mo` → `backend/main.mo`
3. Copy `backend/lib/Decimal.mo` → `backend/lib/Decimal.mo`
4. Copy `backend/lib/QueueManager.mo` → `backend/lib/QueueManager.mo`
5. Copy `backend/lib/FeeManager.mo` → `backend/lib/FeeManager.mo`
6. Copy `dfx.playground.json` → `dfx.json`

### 4. Deploy

In ICP.ninja terminal:
```bash
dfx deploy
```

## Usage Examples

### Initialize Fund

```bash
dfx canister call platform initializeFund '(record {
  name = "Test Hedge Fund";
  managementFeeBps = 200;
  performanceFeeBps = 2000;
  entranceFeeBps = 100;
  exitFeeBps = 100;
  minInvestment = 1000000000000000000000;
})'
```

**Fee Rates Explained**:
- `managementFeeBps = 200` → 2% annual management fee
- `performanceFeeBps = 2000` → 20% performance fee
- `entranceFeeBps = 100` → 1% entrance fee
- `exitFeeBps = 100` → 1% exit fee

**minInvestment**: 1000 in 18-decimal format (1000 * 10^18)

### Get Test Tokens

```bash
# Mint yourself 10,000 test tokens
dfx canister call platform mintTestTokens '(10000)'
```

### Check Your Balance

```bash
# Get your principal
dfx identity get-principal

# Check token balance
dfx canister call platform getMyTokenBalance '(principal "<YOUR_PRINCIPAL>")'

# Check share balance
dfx canister call platform getMyShares '(principal "<YOUR_PRINCIPAL>")'
```

### Deposit

```bash
# Deposit 1,000 tokens, expecting at least 900 shares
dfx canister call platform deposit '(1000, 900)'
```

### Process Deposits (Admin)

```bash
# Process up to 10 deposits
dfx canister call platform processDeposits '(10)'
```

### Check Queue Status

```bash
dfx canister call platform getQueueStatus
```

### Check NAV

```bash
dfx canister call platform getCurrentNav
```

### Redeem Shares

```bash
# Redeem 500 shares, expecting at least 450 tokens
dfx canister call platform redeem '(500, 450)'
```

### Process Redemptions (Admin)

```bash
# Process up to 10 redemptions
dfx canister call platform processRedemptions '(10)'
```

### Update AUM (Admin)

```bash
# Update AUM to 1,000,000
dfx canister call platform updateAUM '(1000000)'
```

This will:
- Accrue management fees (time-based)
- Accrue performance fees (if above HWM)
- Update NAV
- Update high water mark

### View Fees

```bash
dfx canister call platform getFeeBreakdown
```

### View High Water Mark Status

```bash
dfx canister call platform getHWMStatus
```

### Cancel Pending Deposits

```bash
dfx canister call platform cancelMyDeposits '(5)'
```

### Cancel Pending Redemptions

```bash
dfx canister call platform cancelMyRedemptions '(5)'
```

### Test Decimal Library

```bash
dfx canister call platform testDecimal
```

## Complete Test Scenario

Here's a full test flow:

```bash
# 1. Deploy
dfx deploy

# 2. Initialize fund
dfx canister call platform initializeFund '(record {
  name = "Alpha Fund";
  managementFeeBps = 200;
  performanceFeeBps = 2000;
  entranceFeeBps = 100;
  exitFeeBps = 100;
  minInvestment = 1000000000000000000000;
})'

# 3. Get test tokens
dfx canister call platform mintTestTokens '(10000)'

# 4. Check balance
MY_PRINCIPAL=$(dfx identity get-principal)
dfx canister call platform getMyTokenBalance "(principal \"$MY_PRINCIPAL\")"

# 5. Deposit
dfx canister call platform deposit '(5000, 4500)'

# 6. Check queue
dfx canister call platform getQueueStatus

# 7. Process deposit
dfx canister call platform processDeposits '(10)'

# 8. Check shares
dfx canister call platform getMyShares "(principal \"$MY_PRINCIPAL\")"

# 9. Check NAV
dfx canister call platform getCurrentNav

# 10. Update AUM (simulate profit)
dfx canister call platform updateAUM '(6000)'

# 11. Check fees
dfx canister call platform getFeeBreakdown

# 12. Check HWM
dfx canister call platform getHWMStatus

# 13. Redeem some shares
dfx canister call platform redeem '(1000, 900)'

# 14. Process redemption
dfx canister call platform processRedemptions '(10)'

# 15. Check final balances
dfx canister call platform getMyTokenBalance "(principal \"$MY_PRINCIPAL\")"
dfx canister call platform getMyShares "(principal \"$MY_PRINCIPAL\")"
```

## Understanding Output

### Decimal Format

All amounts use 18-decimal precision internally but are displayed with 6 decimals:
- `"1000.000000"` = 1,000 tokens
- `"0.500000"` = 0.5 shares
- `"1.250000"` = 1.25 NAV

### Queue Status

```
(record { deposits = 2; redemptions = 1 })
```
- 2 pending deposits
- 1 pending redemption

### Fee Breakdown

```
(record {
  mgmt = "10.500000";
  perf = "200.000000";
  entrance = "50.000000";
  exit = "10.000000";
  total = "270.500000";
})
```

### HWM Status

```
(record {
  hwm = "1.200000";
  lowestNav = "0.800000";
  daysToReset = 45;
})
```
- High water mark at 1.2
- Currently in drawdown (lowest was 0.8)
- 45 days until HWM reset (if NAV stays recovered)

## Key Features to Test

### 1. Decimal Precision
```bash
dfx canister call platform testDecimal
```
Should show exact calculations (no Float precision loss).

### 2. Queue System
- Deposit multiple times
- Check queue grows
- Process in batches
- Queue shrinks

### 3. Slippage Protection
Try depositing with high `minShares`:
```bash
dfx canister call platform deposit '(1000, 9999999)'
```
Should queue successfully, but processing will skip due to slippage.

### 4. Fee Accrual
- Update AUM multiple times
- Watch management fees grow over time
- See performance fees only when above HWM

### 5. High Water Mark Reset
Simulate a drawdown:
```bash
# Start high
dfx canister call platform updateAUM '(10000)'

# Drop 70% (below 60% threshold)
dfx canister call platform updateAUM '(3000)'

# Check HWM status - should be tracking drawdown
dfx canister call platform getHWMStatus

# Recover slightly (5% above lowest)
dfx canister call platform updateAUM '(3150)'

# Check again - recovery timer should start
dfx canister call platform getHWMStatus
```

### 6. Cancellations
```bash
# Queue deposit
dfx canister call platform deposit '(1000, 900)'

# Cancel it
dfx canister call platform cancelMyDeposits '(1)'

# Check balance refunded
dfx canister call platform getMyTokenBalance "(principal \"$MY_PRINCIPAL\")"
```

## Limitations (Playground Version)

1. **No real ICRC-1 tokens** - Using simulated balances
2. **No separate share token canister** - Embedded tracking
3. **No multi-asset support** - Single base token only
4. **No timers** - Manual processing only
5. **Single fund only** - No multi-fund marketplace

These are all addressed in the full version (main.mo with multiple canisters).

## Troubleshooting

### Error: "Insufficient token balance"
Run: `dfx canister call platform mintTestTokens '(10000)'`

### Error: "Only admin can process"
You need to be the person who called `initializeFund` first.

### Error: "Insufficient shares"
Check balance: `dfx canister call platform getMyShares "(principal \"$MY_PRINCIPAL\")"`

### Error: "Queue full"
Process pending items:
```bash
dfx canister call platform processDeposits '(50)'
dfx canister call platform processRedemptions '(50)'
```

### Deposits processed but no shares
Check if slippage protection kicked in. Lower your `minShares` parameter.

## Next Steps

Once you've tested in playground:
1. Try full multi-canister version locally (see DEPLOYMENT_GUIDE.md)
2. Test with real ICRC-1 tokens on testnet
3. Add custody solution (multi-sig)
4. Implement timer-based automation
5. Deploy to mainnet after audit

## Support

- **ICP.ninja Issues**: https://github.com/dfinity/icp-ninja
- **ICP Documentation**: https://internetcomputer.org/docs
- **This Project**: See ICP_IMPLEMENTATION_ANALYSIS.md for full architecture
