# ICP Hedge Fund Deployment Guide

## Prerequisites

### 1. Install dfx (ICP SDK)

```bash
# Install dfx
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Verify installation
dfx --version
```

### 2. Install Node.js (for frontend)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 18
nvm install 18
nvm use 18

# Verify
node --version
npm --version
```

### 3. Install Vessel (Motoko Package Manager)

```bash
# Download vessel
wget https://github.com/dfinity/vessel/releases/download/v0.6.4/vessel-linux64
chmod +x vessel-linux64
sudo mv vessel-linux64 /usr/local/bin/vessel

# Verify
vessel --version
```

## Project Structure

```
ICP/
├── backend/
│   ├── main.mo                    # Main platform canister
│   ├── migration.mo               # Upgrade migration logic
│   ├── authorization/
│   │   └── access-control.mo      # Access control system
│   ├── lib/
│   │   ├── Decimal.mo            # Fixed-point decimal math
│   │   ├── QueueManager.mo       # Deposit/redemption queues
│   │   └── FeeManager.mo         # Fee calculation with HWM
│   └── tokens/
│       └── ShareToken.mo         # ICRC-1 share token
├── frontend/                      # React frontend
├── dfx.json                       # Canister configuration
└── vessel.dhall                   # Package dependencies
```

## Local Development

### 1. Start Local Replica

```bash
cd ICP

# Start local ICP network
dfx start --clean --background

# Check status
dfx ping
```

### 2. Deploy Canisters

```bash
# Deploy all canisters
dfx deploy

# Or deploy individually
dfx deploy platform
dfx deploy shareToken
dfx deploy frontend
```

### 3. Get Canister IDs

```bash
# Get platform canister ID
dfx canister id platform

# Get share token canister ID
dfx canister id shareToken

# Get frontend canister ID
dfx canister id frontend
```

### 4. Initialize Platform

```bash
# Initialize access control (first caller becomes admin)
dfx canister call platform initializeAccessControl

# Verify you're admin
dfx canister call platform isCallerAdmin
```

### 5. Create Test Fund

```bash
dfx canister call platform createFund '(record {
  name = "Test Fund";
  managementFee = 0.02;
  performanceFee = 0.20;
  entranceFee = 0.01;
  exitFee = 0.01;
  minInvestment = 1000;
  isPaused = false;
  highWaterMark = 1.0;
  creatorMetadata = record {
    website = "https://example.com";
    contactEmail = "test@example.com";
    description = "Test hedge fund";
    telegramHandle = null;
  };
  baseToken = "ryjl3-tyaaa-aaaaa-aaaba-cai";
  autoDeposit = false;
  autoWithdrawal = false;
})'
```

## Testing

### 1. View Logs

```bash
# View platform logs
dfx canister logs platform

# View share token logs
dfx canister logs shareToken
```

### 2. Check Canister Status

```bash
# Check cycles balance
dfx canister status platform

# Check memory usage
dfx canister status platform | grep "Memory allocation"
```

### 3. Run Test Scenarios

```bash
# Test deposit flow
dfx canister call platform submitTransaction '(
  1,
  100000,
  variant { deposit }
)'

# Check transaction
dfx canister call platform getTransaction '(1)'

# Process transaction (as processor)
dfx canister call platform processTransaction '(1)'
```

## Testnet Deployment

### 1. Get Testnet Cycles

```bash
# Check your wallet
dfx wallet --network ic balance

# If you don't have a wallet, create one
dfx ledger --network ic create-canister <YOUR_PRINCIPAL> --amount 0.5

# Set wallet
dfx identity --network ic set-wallet <WALLET_CANISTER_ID>
```

### 2. Deploy to Testnet

```bash
# Deploy all canisters to testnet
dfx deploy --network ic

# Check deployment
dfx canister --network ic id platform
dfx canister --network ic id shareToken
```

### 3. Top Up Cycles

```bash
# Top up platform canister
dfx canister --network ic deposit-cycles 1000000000000 platform

# Check balance
dfx canister --network ic status platform
```

## Mainnet Deployment

### ⚠️ CRITICAL: Pre-Deployment Checklist

- [ ] Code has been audited by at least 2 security firms
- [ ] All tests pass (unit + integration)
- [ ] Testnet deployment successful for at least 30 days
- [ ] No critical bugs in testnet
- [ ] Upgrade procedures tested
- [ ] Emergency procedures documented
- [ ] Admin keys secured (hardware wallet)
- [ ] Monitoring and alerting set up
- [ ] Legal review completed
- [ ] Terms of service finalized

### 1. Acquire Cycles

```bash
# You'll need ~10T cycles for mainnet
# Purchase ICP and convert to cycles

# Check your ICP balance
dfx ledger --network ic balance

# Convert ICP to cycles
dfx ledger --network ic top-up <CANISTER_ID> --amount 10
```

### 2. Deploy to Mainnet

```bash
# Deploy to mainnet
dfx deploy --network ic --mode reinstall

# Verify deployment
dfx canister --network ic id platform
```

### 3. Set Up Monitoring

```bash
# Install monitoring tools
npm install -g @dfinity/agent

# Set up Prometheus/Grafana for canister metrics
# (See IC documentation for details)
```

### 4. Create Admin Roles

```bash
# Assign admin role
dfx canister --network ic call platform assignFundRole '(
  principal "<ADMIN_PRINCIPAL>",
  variant { admin }
)'

# Assign processor role
dfx canister --network ic call platform assignFundRole '(
  principal "<PROCESSOR_PRINCIPAL>",
  variant { processor }
)'

# Assign AUM updater role
dfx canister --network ic call platform assignFundRole '(
  principal "<AUM_UPDATER_PRINCIPAL>",
  variant { aumUpdater }
)'

# Assign guardian role
dfx canister --network ic call platform assignFundRole '(
  principal "<GUARDIAN_PRINCIPAL>",
  variant { guardian }
)'
```

### 5. Post-Deployment Verification

```bash
# Test deposit flow
dfx canister --network ic call platform submitTransaction '(...)'

# Test redemption flow
dfx canister --network ic call platform submitTransaction '(...)'

# Verify fee calculations
dfx canister --network ic call platform calculateFees '(1)'

# Test emergency procedures
dfx canister --network ic call platform pauseFund '(1)'
dfx canister --network ic call platform resumeFund '(1)'
```

## Upgrade Procedures

### 1. Test Upgrade Locally

```bash
# Make code changes
# ...

# Upgrade locally
dfx deploy platform --mode upgrade

# Verify state persisted
dfx canister call platform getAllFunds
```

### 2. Upgrade on Testnet

```bash
# Upgrade testnet
dfx deploy --network ic platform --mode upgrade

# Monitor for issues
dfx canister --network ic logs platform
```

### 3. Upgrade on Mainnet

```bash
# CRITICAL: Backup state first!
dfx canister --network ic call platform exportState

# Upgrade mainnet
dfx deploy --network ic platform --mode upgrade

# Verify state
dfx canister --network ic call platform getAllFunds
```

## Monitoring

### 1. Cycles Monitoring

```bash
# Check cycles regularly
dfx canister --network ic status platform

# Set up auto-top-up from NNS
# (See IC documentation)
```

### 2. Error Monitoring

```bash
# Check logs for errors
dfx canister --network ic logs platform | grep "Error"

# Set up alerting for critical errors
```

### 3. Performance Monitoring

```bash
# Check memory usage
dfx canister --network ic status platform | grep "Memory"

# Check compute usage
dfx canister --network ic status platform | grep "Compute"
```

## Troubleshooting

### Issue: Canister Out of Cycles

```bash
# Top up immediately
dfx ledger --network ic top-up <CANISTER_ID> --amount 5

# Set up auto-top-up to prevent recurrence
```

### Issue: Upgrade Failed

```bash
# Rollback to previous version
dfx deploy --network ic platform --mode reinstall

# Restore state from backup
dfx canister --network ic call platform importState '(...)'
```

### Issue: Transaction Stuck

```bash
# Check transaction status
dfx canister --network ic call platform getTransaction '(<TX_ID>)'

# Cancel if needed
dfx canister --network ic call platform cancelTransaction '(<TX_ID>)'
```

### Issue: Queue Full

```bash
# Process pending transactions
dfx canister --network ic call platform processDepositQueue '(50)'
dfx canister --network ic call platform processRedemptionQueue '(50)'
```

## Security Best Practices

1. **Never share your private keys**
2. **Use hardware wallets for admin keys**
3. **Enable 2FA on all accounts**
4. **Regular security audits**
5. **Monitor for suspicious activity**
6. **Keep cycles balance above 1T**
7. **Test all upgrades on testnet first**
8. **Have emergency contacts ready**
9. **Document all procedures**
10. **Regular backups of state**

## Support

- [Internet Computer Documentation](https://internetcomputer.org/docs)
- [Motoko Language Guide](https://internetcomputer.org/docs/current/motoko/main/motoko)
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [Developer Forum](https://forum.dfinity.org/)

## Emergency Contacts

- **Platform Admin**: [contact info]
- **Security Team**: [contact info]
- **Legal Team**: [contact info]
- **DFINITY Support**: support@dfinity.org
