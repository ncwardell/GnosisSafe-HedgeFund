/**
 * Component for displaying fee breakdown and high water mark status
 */

import React from 'react';
import { FeeBreakdownDisplay, HWMStatusDisplay } from '../types/backend';

interface FeeDisplayProps {
  fees: FeeBreakdownDisplay;
  hwmStatus: HWMStatusDisplay;
  onCollectFees?: () => void;
  isAdmin?: boolean;
}

export const FeeDisplay: React.FC<FeeDisplayProps> = ({
  fees,
  hwmStatus,
  onCollectFees,
  isAdmin = false,
}) => {
  return (
    <div className="fee-display">
      <div className="fee-breakdown">
        <h3>Accrued Fees</h3>
        <div className="fee-grid">
          <div className="fee-item">
            <span className="fee-label">Management</span>
            <span className="fee-value">{fees.mgmt}</span>
          </div>
          <div className="fee-item">
            <span className="fee-label">Performance</span>
            <span className="fee-value">{fees.perf}</span>
          </div>
          <div className="fee-item">
            <span className="fee-label">Entrance</span>
            <span className="fee-value">{fees.entrance}</span>
          </div>
          <div className="fee-item">
            <span className="fee-label">Exit</span>
            <span className="fee-value">{fees.exit}</span>
          </div>
          <div className="fee-item total">
            <span className="fee-label">Total</span>
            <span className="fee-value">{fees.total}</span>
          </div>
        </div>
        {isAdmin && onCollectFees && (
          <button className="collect-fees-btn" onClick={onCollectFees}>
            Collect Fees
          </button>
        )}
      </div>

      <div className="hwm-status">
        <h3>High Water Mark</h3>
        <div className="hwm-grid">
          <div className="hwm-item">
            <span className="hwm-label">Current HWM</span>
            <span className="hwm-value">{hwmStatus.hwm}</span>
          </div>
          {hwmStatus.inDrawdown && (
            <>
              <div className="hwm-item">
                <span className="hwm-label">Lowest NAV in Drawdown</span>
                <span className="hwm-value warning">{hwmStatus.lowestNav}</span>
              </div>
              <div className="hwm-item">
                <span className="hwm-label">Days Until Reset</span>
                <span className="hwm-value">
                  {hwmStatus.daysToReset > 0
                    ? `${hwmStatus.daysToReset} days`
                    : 'Conditions not met'}
                </span>
              </div>
            </>
          )}
          {!hwmStatus.inDrawdown && (
            <div className="hwm-item">
              <span className="hwm-status-ok">✓ No drawdown detected</span>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .fee-display {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin: 2rem 0;
        }

        .fee-breakdown,
        .hwm-status {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .fee-grid,
        .hwm-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .fee-item,
        .hwm-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          border-bottom: 1px solid #eee;
        }

        .fee-item.total {
          border-top: 2px solid #333;
          border-bottom: none;
          font-weight: 600;
          margin-top: 0.5rem;
        }

        .fee-label,
        .hwm-label {
          color: #666;
        }

        .fee-value,
        .hwm-value {
          font-weight: 500;
          font-family: 'Monaco', monospace;
        }

        .hwm-value.warning {
          color: #d97706;
        }

        .hwm-status-ok {
          color: #10b981;
          font-weight: 500;
        }

        .collect-fees-btn {
          width: 100%;
          margin-top: 1rem;
          padding: 0.75rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .collect-fees-btn:hover {
          background: #2563eb;
        }

        @media (max-width: 768px) {
          .fee-display {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
