/**
 * Form for depositing and redeeming from the fund
 * Updated to work with queue system and Decimal types
 */

import React, { useState } from 'react';
import { toDecimal, parseDecimal, formatDisplay } from '../utils/decimal';

interface DepositRedeemFormProps {
  currentNav: string;
  myTokenBalance: string;
  myShares: string;
  onDeposit: (amount: number, minShares: number) => Promise<void>;
  onRedeem: (shares: number, minPayout: number) => Promise<void>;
  loading?: boolean;
}

export const DepositRedeemForm: React.FC<DepositRedeemFormProps> = ({
  currentNav,
  myTokenBalance,
  myShares,
  onDeposit,
  onRedeem,
  loading = false,
}) => {
  const [mode, setMode] = useState<'deposit' | 'redeem'>('deposit');
  const [amount, setAmount] = useState('');
  const [slippageTolerance, setSlippageTolerance] = useState('1'); // 1%

  const navDecimal = parseDecimal(currentNav);
  const tokenBalance = parseFloat(myTokenBalance);
  const shareBalance = parseFloat(myShares);

  // Calculate estimated output
  const estimatedOutput = () => {
    if (!amount || parseFloat(amount) === 0) return '0.000000';

    try {
      const amountDecimal = parseDecimal(amount);

      if (mode === 'deposit') {
        // Estimate shares = amount / nav
        const shares = (amountDecimal * toDecimal(1)) / navDecimal;
        return formatDisplay(shares);
      } else {
        // Estimate payout = shares * nav
        const payout = (amountDecimal * navDecimal) / toDecimal(1);
        return formatDisplay(payout);
      }
    } catch (err) {
      return '0.000000';
    }
  };

  // Calculate minimum output with slippage
  const minOutput = () => {
    const estimated = estimatedOutput();
    const estimatedNum = parseFloat(estimated);
    const slippage = parseFloat(slippageTolerance) / 100;
    const min = estimatedNum * (1 - slippage);
    return Math.floor(min);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) === 0) {
      alert('Please enter an amount');
      return;
    }

    const amountInt = Math.floor(parseFloat(amount));
    const minOutputValue = minOutput();

    try {
      if (mode === 'deposit') {
        await onDeposit(amountInt, minOutputValue);
      } else {
        await onRedeem(amountInt, minOutputValue);
      }
      setAmount('');
    } catch (err) {
      console.error('Transaction failed:', err);
      alert(`Transaction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const setMaxAmount = () => {
    if (mode === 'deposit') {
      setAmount(Math.floor(tokenBalance).toString());
    } else {
      setAmount(Math.floor(shareBalance).toString());
    }
  };

  return (
    <div className="deposit-redeem-form">
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'deposit' ? 'active' : ''}`}
          onClick={() => setMode('deposit')}
          disabled={loading}
        >
          Deposit
        </button>
        <button
          className={`mode-btn ${mode === 'redeem' ? 'active' : ''}`}
          onClick={() => setMode('redeem')}
          disabled={loading}
        >
          Redeem
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>
            {mode === 'deposit' ? 'Amount to Deposit' : 'Shares to Redeem'}
          </label>
          <div className="input-with-max">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="1"
              disabled={loading}
            />
            <button
              type="button"
              className="max-btn"
              onClick={setMaxAmount}
              disabled={loading}
            >
              MAX
            </button>
          </div>
          <div className="balance-info">
            Available: {mode === 'deposit' ? myTokenBalance : myShares}
          </div>
        </div>

        <div className="form-group">
          <label>Slippage Tolerance (%)</label>
          <input
            type="number"
            value={slippageTolerance}
            onChange={(e) => setSlippageTolerance(e.target.value)}
            placeholder="1"
            min="0.1"
            max="50"
            step="0.1"
            disabled={loading}
          />
        </div>

        <div className="estimate-box">
          <div className="estimate-row">
            <span>Current NAV:</span>
            <span className="value">{currentNav}</span>
          </div>
          <div className="estimate-row">
            <span>Estimated {mode === 'deposit' ? 'Shares' : 'Payout'}:</span>
            <span className="value">{estimatedOutput()}</span>
          </div>
          <div className="estimate-row minor">
            <span>Minimum {mode === 'deposit' ? 'Shares' : 'Payout'}:</span>
            <span className="value">{minOutput().toLocaleString()}</span>
          </div>
        </div>

        <button
          type="submit"
          className="submit-btn"
          disabled={loading || !amount || parseFloat(amount) === 0}
        >
          {loading
            ? 'Processing...'
            : mode === 'deposit'
            ? 'Queue Deposit'
            : 'Queue Redemption'}
        </button>

        <div className="info-note">
          <p>
            ℹ️ Your {mode} will be queued for processing.
            {mode === 'deposit'
              ? ' Shares will be minted after processing.'
              : ' Payout will be sent after processing.'}
          </p>
        </div>
      </form>

      <style jsx>{`
        .deposit-redeem-form {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          max-width: 500px;
          margin: 2rem auto;
        }

        .mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .mode-btn {
          padding: 0.75rem;
          border: 2px solid #e5e7eb;
          background: white;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn:hover {
          border-color: #3b82f6;
        }

        .mode-btn.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .mode-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        label {
          display: block;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #374151;
        }

        input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 1rem;
        }

        input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        input:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
        }

        .input-with-max {
          position: relative;
        }

        .input-with-max input {
          padding-right: 4rem;
        }

        .max-btn {
          position: absolute;
          right: 0.5rem;
          top: 50%;
          transform: translateY(-50%);
          padding: 0.375rem 0.75rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .max-btn:hover {
          background: #e5e7eb;
        }

        .max-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .balance-info {
          margin-top: 0.5rem;
          font-size: 0.875rem;
          color: #6b7280;
          font-family: 'Monaco', monospace;
        }

        .estimate-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .estimate-row {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
        }

        .estimate-row.minor {
          font-size: 0.875rem;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          margin-top: 0.5rem;
          padding-top: 0.75rem;
        }

        .estimate-row .value {
          font-weight: 500;
          font-family: 'Monaco', monospace;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .info-note {
          margin-top: 1rem;
          padding: 0.75rem;
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
          border-radius: 4px;
        }

        .info-note p {
          margin: 0;
          font-size: 0.875rem;
          color: #1e40af;
        }
      `}</style>
    </div>
  );
};
