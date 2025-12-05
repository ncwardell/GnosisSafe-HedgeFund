/**
 * Component for displaying deposit and redemption queue status
 */

import React from 'react';
import { QueueStatus } from '../types/backend';

interface QueueStatusDisplayProps {
  queueStatus: QueueStatus;
  myPending?: {
    deposits: string;
    redemptions: string;
  };
  onProcessDeposits?: () => void;
  onProcessRedemptions?: () => void;
  onCancelDeposits?: () => void;
  onCancelRedemptions?: () => void;
  isAdmin?: boolean;
}

export const QueueStatusDisplay: React.FC<QueueStatusDisplayProps> = ({
  queueStatus,
  myPending,
  onProcessDeposits,
  onProcessRedemptions,
  onCancelDeposits,
  onCancelRedemptions,
  isAdmin = false,
}) => {
  const hasDeposits = Number(queueStatus.deposits) > 0;
  const hasRedemptions = Number(queueStatus.redemptions) > 0;
  const hasPendingDeposits = myPending && parseFloat(myPending.deposits) > 0;
  const hasPendingRedemptions = myPending && parseFloat(myPending.redemptions) > 0;

  return (
    <div className="queue-status">
      <h3>Queue Status</h3>

      <div className="queue-grid">
        <div className="queue-item">
          <div className="queue-header">
            <span className="queue-label">Pending Deposits</span>
            <span className={`queue-count ${hasDeposits ? 'active' : ''}`}>
              {queueStatus.deposits.toString()}
            </span>
          </div>
          {myPending && (
            <div className="my-pending">
              <span>Your pending: {myPending.deposits}</span>
            </div>
          )}
          <div className="queue-actions">
            {isAdmin && hasDeposits && onProcessDeposits && (
              <button
                className="btn-primary"
                onClick={onProcessDeposits}
              >
                Process Deposits
              </button>
            )}
            {hasPendingDeposits && onCancelDeposits && (
              <button
                className="btn-secondary"
                onClick={onCancelDeposits}
              >
                Cancel My Deposits
              </button>
            )}
          </div>
        </div>

        <div className="queue-item">
          <div className="queue-header">
            <span className="queue-label">Pending Redemptions</span>
            <span className={`queue-count ${hasRedemptions ? 'active' : ''}`}>
              {queueStatus.redemptions.toString()}
            </span>
          </div>
          {myPending && (
            <div className="my-pending">
              <span>Your pending: {myPending.redemptions}</span>
            </div>
          )}
          <div className="queue-actions">
            {isAdmin && hasRedemptions && onProcessRedemptions && (
              <button
                className="btn-primary"
                onClick={onProcessRedemptions}
              >
                Process Redemptions
              </button>
            )}
            {hasPendingRedemptions && onCancelRedemptions && (
              <button
                className="btn-secondary"
                onClick={onCancelRedemptions}
              >
                Cancel My Redemptions
              </button>
            )}
          </div>
        </div>
      </div>

      {!hasDeposits && !hasRedemptions && (
        <div className="queue-empty">
          <p>✓ All queues are empty</p>
        </div>
      )}

      <style jsx>{`
        .queue-status {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          margin: 2rem 0;
        }

        h3 {
          margin: 0 0 1rem 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .queue-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .queue-item {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 1rem;
        }

        .queue-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .queue-label {
          font-weight: 500;
          color: #374151;
        }

        .queue-count {
          background: #e5e7eb;
          color: #6b7280;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .queue-count.active {
          background: #dbeafe;
          color: #1e40af;
        }

        .my-pending {
          background: #f3f4f6;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
          font-family: 'Monaco', monospace;
        }

        .queue-actions {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover {
          background: #2563eb;
        }

        .btn-secondary {
          background: white;
          color: #6b7280;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .queue-empty {
          text-align: center;
          padding: 2rem;
          color: #10b981;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .queue-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
