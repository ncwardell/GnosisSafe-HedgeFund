# Hedge Fund Management Portal

A comprehensive DeFi hedge fund management portal with role-based access control, built with Next.js, TypeScript, and Web3 technologies.

## Features

### For Investors
- **Deposit & Redeem**: Easy-to-use interface for depositing funds and redeeming shares
- **Position Tracking**: Real-time view of your investment position and pending transactions
- **Queue Status**: Track the status of your pending deposits and redemptions
- **NAV Monitoring**: View current Net Asset Value per share

### For Administrators
- **Vault Controls**: Pause/unpause vault operations
- **Fee Management**: View accrued fees and execute payouts
- **Configuration**: Manage vault parameters through time-locked proposals
- **Emergency Controls**: Trigger emergency mode when needed

### For AUM Updaters
- **AUM Updates**: Update Assets Under Management values
- **Fee Accrual**: Automatic management and performance fee calculations
- **HWM Tracking**: Monitor high water mark status and recovery periods
- **Performance Metrics**: Track fund performance over time

### For Processors
- **Queue Processing**: Batch process deposit and redemption queues
- **KYC Integration**: Review and process transactions with KYC compliance
- **Slippage Protection**: Automatic handling of failed transactions
- **Batch Operations**: Process up to 50 transactions per batch

### For Guardians
- **Emergency Controls**: Trigger and exit emergency mode
- **Pause Controls**: Emergency pause capabilities
- **Vault Protection**: Monitor vault health and security status
- **Crisis Management**: Tools for handling critical situations

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Web3**:
  - wagmi 2.x (React Hooks for Ethereum)
  - viem (TypeScript Ethereum library)
  - RainbowKit (Wallet connection UI)
- **State Management**: TanStack Query (React Query)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Web3 wallet (MetaMask, WalletConnect, etc.)
- Access to an Ethereum RPC endpoint

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Configure environment variables**:

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

Required environment variables:
- `NEXT_PUBLIC_VAULT_ADDRESS`: Address of the SafeHedgeFundVault contract
- `NEXT_PUBLIC_BASE_TOKEN`: Address of the base token (USDC, DAI, etc.)
- `NEXT_PUBLIC_CHAIN_ID`: Chain ID (1 for mainnet, 11155111 for Sepolia)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect Project ID (get from https://cloud.walletconnect.com)

3. **Run the development server**:
```bash
npm run dev
```

4. **Open your browser**:
Navigate to [http://localhost:3000](http://localhost:3000)

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
portal/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                 # Home page
│   ├── layout.tsx               # Root layout with providers
│   ├── providers.tsx            # Web3 providers setup
│   ├── globals.css              # Global styles
│   ├── user/                    # Investor dashboard
│   │   ├── page.tsx
│   │   └── components/          # User-specific components
│   ├── admin/                   # Admin dashboard
│   │   ├── page.tsx
│   │   └── components/          # Admin-specific components
│   ├── aum-updater/            # AUM updater dashboard
│   │   └── page.tsx
│   ├── processor/              # Processor dashboard
│   │   └── page.tsx
│   └── guardian/               # Guardian dashboard
│       └── page.tsx
├── components/                  # Shared components
│   ├── Navigation.tsx          # Main navigation bar
│   └── StatsCard.tsx           # Reusable stats card
├── hooks/                       # Custom React hooks
│   └── useVault.ts             # Vault contract hooks
├── lib/                         # Utilities and configuration
│   ├── contracts.ts            # Contract ABIs and addresses
│   ├── utils.ts                # Utility functions
│   └── wagmi.ts                # Wagmi configuration
└── types/                       # TypeScript type definitions
```

## Smart Contract Integration

The portal integrates with the SafeHedgeFundVault smart contract system:

### Key Functions

**User Operations**:
- `deposit(amount, minShares)` - Queue a deposit
- `redeem(shares, minAmountOut)` - Queue a redemption
- `cancelMyDeposits(maxCancellations)` - Cancel pending deposits
- `cancelMyRedemptions(maxCancellations)` - Cancel pending redemptions

**Admin Operations**:
- `pause()` / `unpause()` - Pause/unpause vault
- `payoutAccruedFees()` - Payout accrued fees
- `proposeConfigChange(key, value)` - Propose configuration change
- `executeConfigProposal(key, value)` - Execute proposal

**AUM Updater Operations**:
- `updateAum(newAum)` - Update assets under management

**Processor Operations**:
- `processDepositQueue(maxToProcess)` - Process deposit queue
- `processRedemptionQueue(maxToProcess)` - Process redemption queue

**Guardian Operations**:
- `triggerEmergency()` - Activate emergency mode
- `exitEmergency()` - Exit emergency mode

### Role System

The vault uses OpenZeppelin's AccessControl for role management:

- `DEFAULT_ADMIN_ROLE` - Master admin
- `ADMIN_ROLE` - Configuration and operations
- `AUM_UPDATER_ROLE` - AUM updates
- `PROCESSOR_ROLE` - Queue processing
- `GUARDIAN_ROLE` - Emergency operations

## Wallet Connection

The portal supports multiple wallet providers through RainbowKit:

- MetaMask
- WalletConnect
- Coinbase Wallet
- Rainbow Wallet
- And more...

## Security Considerations

1. **Role-Based Access**: Each dashboard checks user roles before displaying sensitive operations
2. **Transaction Confirmation**: All write operations require wallet confirmation
3. **Slippage Protection**: Users can set slippage tolerance for deposits and redemptions
4. **Error Handling**: Comprehensive error handling and user feedback
5. **Emergency Controls**: Guardian role can pause operations in critical situations

## Development

### Adding New Features

1. **Create new hooks** in `hooks/` for contract interactions
2. **Add components** in `components/` or page-specific component folders
3. **Update types** in `types/` if needed
4. **Test thoroughly** with different wallet providers

### Code Style

- Use TypeScript for type safety
- Follow React hooks best practices
- Use Tailwind CSS for styling
- Keep components small and focused
- Add loading and error states

## Troubleshooting

### Wallet Connection Issues
- Ensure you have a compatible wallet installed
- Check that you're on the correct network
- Try disconnecting and reconnecting your wallet

### Transaction Failures
- Check that you have sufficient gas
- Verify you have the required role for the operation
- Ensure the vault is not paused (unless using emergency functions)
- Check slippage tolerance settings

### Display Issues
- Clear browser cache
- Try a different browser
- Ensure JavaScript is enabled
- Check browser console for errors

## Support

For issues and questions:
- Review the smart contract documentation in the main repository
- Check the audit report for security considerations
- Open an issue in the GitHub repository

## License

This project is part of the SafeHedgeFund system. See the main repository for license information.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Web3 integration by [wagmi](https://wagmi.sh/) and [viem](https://viem.sh/)
- Wallet UI by [RainbowKit](https://www.rainbowkit.com/)
- Icons by [Lucide](https://lucide.dev/)
