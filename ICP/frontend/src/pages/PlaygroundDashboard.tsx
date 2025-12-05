/**
 * Example dashboard page for the playground canister
 * Demonstrates how to use all the new components and hooks
 */

import React, { useState, useEffect } from 'react';
import { usePlaygroundCanister } from '../hooks/usePlaygroundCanister';
import { FeeDisplay } from '../components/FeeDisplay';
import { QueueStatusDisplay } from '../components/QueueStatusDisplay';
import { DepositRedeemForm } from '../components/DepositRedeemForm';
import { PlaygroundFundConfig } from '../types/backend';

const CANISTER_ID = process.env.REACT_APP_CANISTER_ID || 'rrkah-fqaaa-aaaaa-aaaaq-cai';

export const PlaygroundDashboard: React.FC = () => {
  const canister = usePlaygroundCanister(CANISTER_ID);

  const [fundConfig, setFundConfig] = useState<PlaygroundFundConfig | null>(null);
  const [currentNav, setCurrentNav] = useState('1.000000');
  const [myTokenBalance, setMyTokenBalance] = useState('0.000000');
  const [myShares, setMyShares] = useState('0.000000');
  const [queueStatus, setQueueStatus] = useState({ deposits: BigInt(0), redemptions: BigInt(0) });
  const [myPending, setMyPending] = useState({ deposits: '0', redemptions: '0' });
  const [feeBreakdown, setFeeBreakdown] = useState({
    mgmt: '0',
    perf: '0',
    entrance: '0',
    exit: '0',
    total: '0',
  });
  const [hwmStatus, setHWMStatus] = useState({
    hwm: '1.000000',
    lowestNav: '0',
    daysToReset: 0,
    inDrawdown: false,
  });

  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Refresh data
  const refreshData = async () => {
    try {
      const [config, nav, balance, shares, queue, pending, fees, hwm] = await Promise.all([
        canister.getFundConfig(),
        canister.getCurrentNav(),
        canister.getMyTokenBalance(),
        canister.getMyShares(),
        canister.getQueueStatus(),
        canister.getMyPending(),
        canister.getFeeBreakdown(),
        canister.getHWMStatus(),
      ]);

      if (config) setFundConfig(config);
      setCurrentNav(nav);
      setMyTokenBalance(balance);
      setMyShares(shares);
      setQueueStatus(queue);
      setMyPending(pending);
      setFeeBreakdown(fees);
      setHWMStatus(hwm);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [refreshKey]);

  // Actions
  const handleMintTestTokens = async () => {
    const amount = prompt('How many test tokens to mint?', '10000');
    if (amount) {
      try {
        await canister.mintTestTokens(parseInt(amount));
        setRefreshKey(prev => prev + 1);
        alert(`Minted ${amount} test tokens!`);
      } catch (err) {
        alert(`Failed to mint tokens: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleDeposit = async (amount: number, minShares: number) => {
    await canister.deposit(amount, minShares);
    setRefreshKey(prev => prev + 1);
    alert('Deposit queued successfully!');
  };

  const handleRedeem = async (shares: number, minPayout: number) => {
    await canister.redeem(shares, minPayout);
    setRefreshKey(prev => prev + 1);
    alert('Redemption queued successfully!');
  };

  const handleProcessDeposits = async () => {
    const count = prompt('How many deposits to process?', '10');
    if (count) {
      try {
        const processed = await canister.processDeposits(parseInt(count));
        setRefreshKey(prev => prev + 1);
        alert(`Processed ${processed} deposits!`);
      } catch (err) {
        alert(`Failed to process: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleProcessRedemptions = async () => {
    const count = prompt('How many redemptions to process?', '10');
    if (count) {
      try {
        const processed = await canister.processRedemptions(parseInt(count));
        setRefreshKey(prev => prev + 1);
        alert(`Processed ${processed} redemptions!`);
      } catch (err) {
        alert(`Failed to process: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleCancelDeposits = async () => {
    try {
      const cancelled = await canister.cancelMyDeposits(5);
      setRefreshKey(prev => prev + 1);
      alert(`Cancelled ${cancelled} deposits!`);
    } catch (err) {
      alert(`Failed to cancel: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCancelRedemptions = async () => {
    try {
      const cancelled = await canister.cancelMyRedemptions(5);
      setRefreshKey(prev => prev + 1);
      alert(`Cancelled ${cancelled} redemptions!`);
    } catch (err) {
      alert(`Failed to cancel: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUpdateAUM = async () => {
    const newAum = prompt('Enter new AUM:', '1000000');
    if (newAum) {
      try {
        const result = await canister.updateAUM(parseInt(newAum));
        setRefreshKey(prev => prev + 1);
        alert(result);
      } catch (err) {
        alert(`Failed to update AUM: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  if (!fundConfig) {
    return (
      <div className="loading">
        <p>Loading fund data...</p>
        {canister.error && <p className="error">{canister.error}</p>}
      </div>
    );
  }

  return (
    <div className="playground-dashboard">
      <header>
        <h1>{fundConfig.name}</h1>
        <div className="header-actions">
          <button onClick={handleMintTestTokens}>
            Mint Test Tokens
          </button>
          <button onClick={() => setRefreshKey(prev => prev + 1)}>
            Refresh Data
          </button>
          {isAdmin && (
            <button onClick={handleUpdateAUM}>
              Update AUM (Admin)
            </button>
          )}
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">My Balance</span>
          <span className="stat-value">{myTokenBalance}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">My Shares</span>
          <span className="stat-value">{myShares}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Current NAV</span>
          <span className="stat-value">{currentNav}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Queue Size</span>
          <span className="stat-value">
            {queueStatus.deposits.toString()}D / {queueStatus.redemptions.toString()}R
          </span>
        </div>
      </div>

      <DepositRedeemForm
        currentNav={currentNav}
        myTokenBalance={myTokenBalance}
        myShares={myShares}
        onDeposit={handleDeposit}
        onRedeem={handleRedeem}
        loading={canister.loading}
      />

      <QueueStatusDisplay
        queueStatus={queueStatus}
        myPending={myPending}
        onProcessDeposits={handleProcessDeposits}
        onProcessRedemptions={handleProcessRedemptions}
        onCancelDeposits={handleCancelDeposits}
        onCancelRedemptions={handleCancelRedemptions}
        isAdmin={isAdmin}
      />

      <FeeDisplay
        fees={feeBreakdown}
        hwmStatus={hwmStatus}
        isAdmin={isAdmin}
      />

      <style jsx>{`
        .playground-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        button {
          padding: 0.5rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        button:hover {
          background: #2563eb;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Monaco', monospace;
        }

        .loading,
        .error {
          text-align: center;
          padding: 4rem 2rem;
        }

        .error {
          color: #dc2626;
        }
      `}</style>
    </div>
  );
};
