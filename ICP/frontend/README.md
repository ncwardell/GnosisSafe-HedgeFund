## ICP Hedge Fund Frontend

React frontend for the ICP hedge fund platform, updated to work with the new Decimal-based backend.

## What's New

### Phase 1 Updates ✅

1. **Decimal Library** (`src/utils/decimal.ts`)
   - Fixed-point arithmetic with 18-decimal precision
   - No Float precision loss
   - Conversion utilities between Decimal and display formats

2. **Type Definitions** (`src/types/backend.ts`)
   - Updated to use Decimal (bigint) instead of Float (number)
   - Matches new Motoko backend types
   - Display-friendly type variants

3. **Converters** (`src/utils/converters.ts`)
   - Convert backend types to display formats
   - Time formatting utilities
   - Status color helpers

4. **New Components**:
   - `FeeDisplay` - Shows fee breakdown and HWM status
   - `QueueStatusDisplay` - Shows deposit/redemption queues
   - `DepositRedeemForm` - Updated for queue system with slippage protection

5. **Playground Hook** (`src/hooks/usePlaygroundCanister.ts`)
   - React hook for playground canister
   - Handles Decimal conversions
   - Typed API calls

6. **Example Dashboard** (`src/pages/PlaygroundDashboard.tsx`)
   - Complete example using all new components
   - Demonstrates queue workflow
   - Fee and HWM display

## Installation

```bash
cd frontend
npm install
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build
```

## Usage Examples

### Using the Decimal Library

```typescript
import { toDecimal, formatDisplay, parseDecimal } from './utils/decimal';

// Create Decimal from number
const amount = toDecimal(1000); // 1000 * 10^18

// Parse from string
const userInput = parseDecimal('1000.50'); // Handles decimals

// Format for display
const formatted = formatDisplay(amount); // "1000.000000"

// Arithmetic
import { addDecimal, mulDecimal } from './utils/decimal';
const total = addDecimal(amount, toDecimal(500)); // 1500 * 10^18
const fee = mulBps(amount, 250); // 1000 * 2.5% = 25
```

### Using the Playground Hook

```typescript
import { usePlaygroundCanister } from './hooks/usePlaygroundCanister';

function MyComponent() {
  const canister = usePlaygroundCanister(CANISTER_ID);

  const handleDeposit = async () => {
    try {
      await canister.deposit(1000, 900); // amount, minShares
      alert('Deposit queued!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      {canister.loading && <p>Loading...</p>}
      {canister.error && <p>Error: {canister.error}</p>}
      <button onClick={handleDeposit}>Deposit</button>
    </div>
  );
}
```

### Using Components

```typescript
import { FeeDisplay } from './components/FeeDisplay';
import { QueueStatusDisplay } from './components/QueueStatusDisplay';
import { DepositRedeemForm } from './components/DepositRedeemForm';

function Dashboard() {
  const canister = usePlaygroundCanister(CANISTER_ID);
  const [fees, setFees] = useState(null);
  const [hwm, setHwm] = useState(null);
  const [queue, setQueue] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [f, h, q] = await Promise.all([
        canister.getFeeBreakdown(),
        canister.getHWMStatus(),
        canister.getQueueStatus(),
      ]);
      setFees(f);
      setHwm(h);
      setQueue(q);
    }
    loadData();
  }, []);

  return (
    <div>
      <FeeDisplay fees={fees} hwmStatus={hwm} />
      <QueueStatusDisplay queueStatus={queue} />
      <DepositRedeemForm
        currentNav="1.500000"
        myTokenBalance="10000.000000"
        myShares="500.000000"
        onDeposit={canister.deposit}
        onRedeem={canister.redeem}
      />
    </div>
  );
}
```

## Type Safety

All components use TypeScript with strict typing:

```typescript
// Backend types (Decimal = bigint)
import { Decimal, FundConfig, FundState } from './types/backend';

// Display types (formatted strings)
import { FundConfigDisplay, FeeBreakdownDisplay } from './types/backend';

// Converters
import { fundConfigToDisplay, feeBreakdownToDisplay } from './utils/converters';

const config: FundConfig = await canister.getFundConfig();
const display: FundConfigDisplay = fundConfigToDisplay(config);
```

## Environment Variables

Create `.env` file:

```bash
# Canister ID (local or mainnet)
REACT_APP_CANISTER_ID=rrkah-fqaaa-aaaaa-aaaaq-cai

# Network (ic or local)
DFX_NETWORK=local
```

## Directory Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── FeeDisplay.tsx
│   │   ├── QueueStatusDisplay.tsx
│   │   └── DepositRedeemForm.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── usePlaygroundCanister.ts
│   ├── pages/               # Page components
│   │   └── PlaygroundDashboard.tsx
│   ├── types/               # TypeScript types
│   │   └── backend.ts
│   └── utils/               # Utility functions
│       ├── decimal.ts
│       └── converters.ts
├── package.json
└── README.md
```

## Key Differences from Old Frontend

### Before (Float-based)

```typescript
// ❌ OLD: Using Float (precision loss!)
const fee = aum * 0.02; // Can lose precision
const shares = amount / nav; // Rounding errors

// ❌ OLD: No queue system
async function deposit(amount: number) {
  await canister.deposit(amount);
  // Immediate processing
}
```

### After (Decimal-based)

```typescript
// ✅ NEW: Using Decimal (exact!)
import { toDecimal, mulBps } from './utils/decimal';

const fee = mulBps(aum, 200); // Exact 2%
const shares = divDecimal(amount, nav); // No precision loss

// ✅ NEW: Queue system with slippage
async function deposit(amount: number, minShares: number) {
  await canister.deposit(amount, minShares);
  // Queued for processing
}
```

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Building for Production

```bash
# Build optimized bundle
npm run build

# Output in dist/
ls dist/
```

## Integration with Backend

The frontend expects the playground canister API:

```motoko
// Backend must implement these methods:
initializeFund : (FundConfig) -> (Text)
deposit : (Nat, Nat) -> (Nat)
redeem : (Nat, Nat) -> (Nat)
processDeposits : (Nat) -> (Nat)
processRedemptions : (Nat) -> (Nat)
getFeeBreakdown : () -> (FeeBreakdown) query
getHWMStatus : () -> (HWMStatus) query
getQueueStatus : () -> (QueueStatus) query
// ... etc
```

See `backend/main-playground.mo` for full API.

## Common Issues

### Issue: "Cannot read property of undefined"
**Solution**: Make sure canister is initialized before calling methods

### Issue: Decimal conversion errors
**Solution**: Always use parseDecimal() for user input, not parseFloat()

### Issue: Queue not updating
**Solution**: Call processDeposits() or processRedemptions() to process queue

### Issue: Slippage protection triggering
**Solution**: Increase slippage tolerance or wait for NAV to stabilize

## Next Steps

1. **Connect to Internet Identity**
   - Replace placeholder auth with real II
   - Add wallet connection

2. **Add Multi-Fund Support**
   - Browse multiple funds
   - Switch between funds
   - Portfolio view

3. **Real-Time Updates**
   - WebSocket or polling
   - Live NAV updates
   - Queue status notifications

4. **Charts and Analytics**
   - Historical performance
   - Fee breakdown charts
   - Portfolio allocation

5. **Mobile Responsive**
   - Optimize for mobile
   - Touch-friendly UI
   - Progressive Web App

## Resources

- [ICP Documentation](https://internetcomputer.org/docs)
- [ICRC-1 Standard](https://github.com/dfinity/ICRC-1)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Support

For issues or questions:
1. Check backend logs: `dfx canister logs platform`
2. Check browser console for errors
3. Verify canister ID is correct
4. Ensure you're on the right network (local vs IC)
