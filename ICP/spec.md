# ICP Hedge Fund Platform

A modular hedge fund platform built on the Internet Computer that enables creation and management of multiple investment funds with comprehensive vault management, fee structures, and investor protections. Features a public marketplace for fund discovery and investment with specialized dashboards for different user types.

## Core Features

### Fund Creation and Management
- Create multiple independent hedge funds, each with its own vault
- Configure fund parameters including fee structures, investment minimums, operational settings, and ICP canister/contract ID reference for base token
- Set processing modes for deposits and withdrawals (automatic or manual)
- Store creator metadata including website, contact email, description, and optional Telegram handle for each fund
- Platform fee charged to fund creators upon fund creation (configurable percentage)
- Time-locked configuration system for updating fund parameters with proposal and delayed execution
- Role-based access control with Admin, Processor, AUM Updater, and Guardian roles

### Vault Operations
- Deposit and redemption functionality with queue-based processing tied to ICP share token minting and burning
- Configurable automatic or manual processing modes for deposits and withdrawals
- Batching system for efficient transaction processing
- Slippage protection and cancellation options for pending operations
- Share-based accounting system with NAV (Net Asset Value) calculations
- Automatic minting and burning of ICP-native fungible share tokens based on NAV and deposit amounts
- Share ownership limits enforced based on actual deposited amounts and token balances to prevent over-withdrawal
- Automated AUM updates from real-time vault token balances
- Multi-asset vault tracking with ICP canister/contract ID references for accurate cross-asset identification

### Share Token System
- ICP-native fungible tokens representing investor ownership in each fund
- Mint tokens on deposit proportional to deposit amount divided by current NAV
- Burn tokens on redemption with withdrawal limits based on share token ownership and deposit history
- Standard transfer and approval functionality
- Proportional ownership based on share holdings with deposit-based limits

### Fee Management
- Four fee types: management fees, performance fees, entrance fees, and exit fees
- High water mark system for performance fee calculations (fees only on new profits)
- Configurable fee rates and collection frequency
- Automatic NAV adjustments for accrued fees

### Emergency Controls
- Guardian role can pause all fund operations
- Emergency withdrawal system with pro-rata asset distribution
- AUM snapshot capture during emergency events

### Transparency and Reporting
- Real-time display of fund metrics: AUM, NAV per share, total shares outstanding
- Display of base token via ICP canister/contract ID and processing mode (auto/manual)
- Queue status showing pending deposits and redemptions
- Fee accrual tracking and high water mark status
- Complete fund configuration visibility including timelock proposals
- Historical AUM tracking for performance visualization
- Asset holdings view listing all assets in fund vaults with ICP-based identifiers

### Hedge Fund Marketplace
- Public marketplace displaying all active funds in a grid layout
- Fund discovery with filtering and sorting capabilities
- Performance metrics display including AUM, NAV, and growth charts
- Creator information display (name, website, contact info, Telegram handle)
- Display of fund's base token via canister ID and processing mode
- Quick investment functionality for marketplace users
- Interactive performance charts showing fund growth over time

### Admin Dashboard
- Internet Identity authentication for fund managers and admins
- Multi-fund overview with key performance metrics and AUM tracking
- Individual fund management interfaces showing canister IDs and processing modes
- Fund creation form with fields for ICP canister/contract ID, auto/manual processing, and Telegram handle
- Operations management for deposits, withdrawals, and AUM updates
- Transaction processing and queue management
- Timelock proposal creation and management interface
- Fund settings configuration with canister ID updates
- Full-screen dashboard mode for immersive fund management experience

### Investor Dashboard
- Internet Identity authentication for regular investors
- Portfolio overview summarizing all invested funds and total portfolio value
- Individual fund positions showing share ownership and current value
- Transaction history including deposits, redemptions, and policy updates
- Asset holdings view for each invested fund showing vault contents
- Interactive metrics panel with AUM history, NAV, and performance return charts
- Pending transaction tracking and status updates
- Current return calculations and portfolio performance metrics

### Embeddable Fund Widget
- Standalone widget showing fund overview and live metrics
- Real-time transaction list display
- Suitable for embedding on external websites
- Responsive design for various container sizes
- Public API integration for fund data access

### Admin Panel and Timelock System
- Admin interface for proposing fund configuration changes including canister ID updates
- Timelock mechanism with configurable delay periods for parameter updates
- Proposal tracking with ability to cancel pending changes before execution
- Investor notification system for pending configuration changes
- Automatic execution of approved proposals after timelock period

## Data Storage

### Backend Storage
- Fund configurations including ICP canister/contract ID references and processing modes
- Creator metadata (website, contact email, description, Telegram handle) for each fund
- Automated AUM records from real-time vault token balance queries with multi-asset tracking
- Investor share balances and transaction history with deposit-based withdrawal limits
- NAV history and automated AUM tracking with asset-specific data
- Fee accrual records and high water mark data
- Transaction queues for deposits and redemptions tied to share token operations
- Role assignments and permissions
- Emergency state and historical snapshots
- Platform fee configuration and collection records
- Timelock proposals with delay periods and execution status
- Share token mint/burn records tied to deposit and redemption operations
- Asset holdings data with ICP canister/contract ID mappings
- Portfolio aggregation data for investor dashboard views

### Operations
- Process deposit and redemption requests with automatic ICP share token minting/burning
- Calculate and update NAV based on automated AUM queries from vault balances across multiple assets
- Enforce share ownership limits based on deposited amounts and token holdings to prevent over-withdrawal
- Execute fee collections and share token operations
- Manage timelock proposals for configuration changes with delay and cancellation
- Handle emergency procedures and access control
- Return fund data with complete creator metadata and canister ID references for marketplace display
- Track and store automated AUM data for chart generation across multiple assets
- Process platform fee collection during fund creation
- Automatically query vault token balances for real-time AUM updates using canister IDs
- Validate withdrawal limits against share token ownership and deposit history
- Aggregate portfolio data for investor dashboard views
- Generate transaction logs including configuration and policy updates
- Provide embeddable widget data via public API endpoints
