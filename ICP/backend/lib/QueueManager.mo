/// Queue management system for deposit and redemption processing
/// Ported from EVM QueueManager.sol with ICP adaptations
import Decimal "Decimal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Buffer "mo:base/Buffer";

module {
  public type Decimal = Decimal.Decimal;

  // Constants
  public let MAX_QUEUE_LENGTH : Nat = 1000;
  public let MAX_PENDING_PER_USER : Nat = 5;

  // Queue item types
  public type TransactionType = {
    #deposit;
    #redemption;
  };

  public type QueueItem = {
    user : Principal;
    amount : Decimal;  // For deposits: base token amount; for redemptions: shares
    nav : Decimal;  // NAV at submission time (for slippage check)
    processed : Bool;
    minOutput : Decimal;  // Minimum shares (deposit) or amount (redemption) expected
    timestamp : Time.Time;
    txType : TransactionType;
  };

  // Queue storage
  public type QueueStorage = {
    var depositQueue : [var ?QueueItem];
    var depositQueueHead : Nat;
    var depositQueueTail : Nat;
    var redemptionQueue : [var ?QueueItem];
    var redemptionQueueHead : Nat;
    var redemptionQueueTail : Nat;
    pendingDeposits : HashMap.HashMap<Principal, Decimal>;
    pendingRedemptions : HashMap.HashMap<Principal, Decimal>;
    userDepositIndices : HashMap.HashMap<Principal, Buffer.Buffer<Nat>>;
    userRedemptionIndices : HashMap.HashMap<Principal, Buffer.Buffer<Nat>>;
  };

  // Initialize queue storage
  public func initStorage() : QueueStorage {
    {
      var depositQueue = Array.init<?QueueItem>(MAX_QUEUE_LENGTH, null);
      var depositQueueHead = 0;
      var depositQueueTail = 0;
      var redemptionQueue = Array.init<?QueueItem>(MAX_QUEUE_LENGTH, null);
      var redemptionQueueHead = 0;
      var redemptionQueueTail = 0;
      pendingDeposits = HashMap.HashMap<Principal, Decimal>(10, Principal.equal, Principal.hash);
      pendingRedemptions = HashMap.HashMap<Principal, Decimal>(10, Principal.equal, Principal.hash);
      userDepositIndices = HashMap.HashMap<Principal, Buffer.Buffer<Nat>>(10, Principal.equal, Principal.hash);
      userRedemptionIndices = HashMap.HashMap<Principal, Buffer.Buffer<Nat>>(10, Principal.equal, Principal.hash);
    }
  };

  // Queue deposit
  public func queueDeposit(
    storage : QueueStorage,
    user : Principal,
    amount : Decimal,
    nav : Decimal,
    minShares : Decimal
  ) : Nat {
    // Check queue not full
    let queueLength = storage.depositQueueTail - storage.depositQueueHead;
    if (queueLength >= MAX_QUEUE_LENGTH) {
      Debug.trap("Queue full");
    };

    // Check user limit
    enforceUserLimit(storage, user, #deposit);

    // Create queue item
    let item : QueueItem = {
      user = user;
      amount = amount;
      nav = nav;
      processed = false;
      minOutput = minShares;
      timestamp = Time.now();
      txType = #deposit;
    };

    // Add to queue
    let idx = storage.depositQueueTail;
    storage.depositQueue[idx] := ?item;
    storage.depositQueueTail += 1;

    // Track user's pending deposits
    let currentPending = switch (storage.pendingDeposits.get(user)) {
      case (?pending) { pending };
      case (null) { Decimal.zero() };
    };
    storage.pendingDeposits.put(user, Decimal.add(currentPending, amount));

    // Track user's deposit indices
    let userIndices = switch (storage.userDepositIndices.get(user)) {
      case (?indices) { indices };
      case (null) {
        let newBuffer = Buffer.Buffer<Nat>(5);
        storage.userDepositIndices.put(user, newBuffer);
        newBuffer
      };
    };
    userIndices.add(idx);

    idx
  };

  // Queue redemption
  public func queueRedemption(
    storage : QueueStorage,
    user : Principal,
    shares : Decimal,
    nav : Decimal,
    minPayout : Decimal
  ) : Nat {
    // Check queue not full
    let queueLength = storage.redemptionQueueTail - storage.redemptionQueueHead;
    if (queueLength >= MAX_QUEUE_LENGTH) {
      Debug.trap("Queue full");
    };

    // Check user limit
    enforceUserLimit(storage, user, #redemption);

    // Create queue item
    let item : QueueItem = {
      user = user;
      amount = shares;
      nav = nav;
      processed = false;
      minOutput = minPayout;
      timestamp = Time.now();
      txType = #redemption;
    };

    // Add to queue
    let idx = storage.redemptionQueueTail;
    storage.redemptionQueue[idx] := ?item;
    storage.redemptionQueueTail += 1;

    // Track user's pending redemptions
    let currentPending = switch (storage.pendingRedemptions.get(user)) {
      case (?pending) { pending };
      case (null) { Decimal.zero() };
    };
    storage.pendingRedemptions.put(user, Decimal.add(currentPending, shares));

    // Track user's redemption indices
    let userIndices = switch (storage.userRedemptionIndices.get(user)) {
      case (?indices) { indices };
      case (null) {
        let newBuffer = Buffer.Buffer<Nat>(5);
        storage.userRedemptionIndices.put(user, newBuffer);
        newBuffer
      };
    };
    userIndices.add(idx);

    idx
  };

  // Process single deposit
  public func processSingleDeposit(
    storage : QueueStorage,
    idx : Nat,
    currentNav : Decimal,
    accrueEntranceFee : (Decimal) -> (Decimal, Decimal)
  ) : ?{
    user : Principal;
    shares : Decimal;
    netAmount : Decimal;
  } {
    // Check valid index
    if (idx >= storage.depositQueueTail) {
      return null;
    };

    switch (storage.depositQueue[idx]) {
      case (null) { null };
      case (?item) {
        if (item.processed) {
          return null;
        };

        // Calculate shares
        let (netAmount, feeAmount) = accrueEntranceFee(item.amount);
        let shares = if (Decimal.gt(currentNav, Decimal.zero())) {
          Decimal.div(netAmount, currentNav)
        } else {
          netAmount
        };

        // Check slippage
        if (Decimal.lt(shares, item.minOutput)) {
          return null; // Slippage too high
        };

        // Mark as processed
        let processedItem = {
          item with
          processed = true;
        };
        storage.depositQueue[idx] := ?processedItem;

        // Update pending deposits
        let currentPending = switch (storage.pendingDeposits.get(item.user)) {
          case (?pending) { pending };
          case (null) { Decimal.zero() };
        };
        storage.pendingDeposits.put(
          item.user,
          Decimal.safeSub(currentPending, item.amount)
        );

        ?{
          user = item.user;
          shares = shares;
          netAmount = netAmount;
        }
      };
    }
  };

  // Process deposit batch
  public func processDepositBatch(
    storage : QueueStorage,
    maxToProcess : Nat,
    currentNav : Decimal,
    accrueEntranceFee : (Decimal) -> (Decimal, Decimal)
  ) : [{ user : Principal; shares : Decimal; netAmount : Decimal }] {
    let results = Buffer.Buffer<{ user : Principal; shares : Decimal; netAmount : Decimal }>(maxToProcess);

    var processed = 0;
    var idx = storage.depositQueueHead;

    while (processed < maxToProcess and idx < storage.depositQueueTail) {
      switch (processSingleDeposit(storage, idx, currentNav, accrueEntranceFee)) {
        case (?result) {
          results.add(result);
          processed += 1;
        };
        case (null) {};
      };
      idx += 1;
    };

    // Clean up queue
    cleanDepositQueue(storage);

    Buffer.toArray(results)
  };

  // Process single redemption
  public func processSingleRedemption(
    storage : QueueStorage,
    idx : Nat,
    payout : (Principal, Decimal, Decimal) -> ?Decimal
  ) : ?{
    user : Principal;
    shares : Decimal;
    payout : Decimal;
  } {
    // Check valid index
    if (idx >= storage.redemptionQueueTail) {
      return null;
    };

    switch (storage.redemptionQueue[idx]) {
      case (null) { null };
      case (?item) {
        if (item.processed) {
          return null;
        };

        // Execute payout
        switch (payout(item.user, item.amount, item.nav)) {
          case (?payoutAmount) {
            // Check slippage
            if (Decimal.lt(payoutAmount, item.minOutput)) {
              return null; // Slippage too high
            };

            // Mark as processed
            let processedItem = {
              item with
              processed = true;
            };
            storage.redemptionQueue[idx] := ?processedItem;

            // Update pending redemptions
            let currentPending = switch (storage.pendingRedemptions.get(item.user)) {
              case (?pending) { pending };
              case (null) { Decimal.zero() };
            };
            storage.pendingRedemptions.put(
              item.user,
              Decimal.safeSub(currentPending, item.amount)
            );

            ?{
              user = item.user;
              shares = item.amount;
              payout = payoutAmount;
            }
          };
          case (null) { null };
        };
      };
    }
  };

  // Process redemption batch
  public func processRedemptionBatch(
    storage : QueueStorage,
    maxToProcess : Nat,
    payout : (Principal, Decimal, Decimal) -> ?Decimal
  ) : [{ user : Principal; shares : Decimal; payout : Decimal }] {
    let results = Buffer.Buffer<{ user : Principal; shares : Decimal; payout : Decimal }>(maxToProcess);

    var processed = 0;
    var idx = storage.redemptionQueueHead;

    while (processed < maxToProcess and idx < storage.redemptionQueueTail) {
      switch (processSingleRedemption(storage, idx, payout)) {
        case (?result) {
          results.add(result);
          processed += 1;
        };
        case (null) {};
      };
      idx += 1;
    };

    // Clean up queue
    cleanRedemptionQueue(storage);

    Buffer.toArray(results)
  };

  // Cancel deposits for user
  public func cancelDeposits(
    storage : QueueStorage,
    user : Principal,
    maxCancellations : Nat,
    refund : (Principal, Decimal) -> ()
  ) : Nat {
    var cancelled = 0;

    switch (storage.userDepositIndices.get(user)) {
      case (null) { return 0 };
      case (?indices) {
        for (idx in indices.vals()) {
          if (cancelled >= maxCancellations) {
            return cancelled;
          };

          switch (storage.depositQueue[idx]) {
            case (?item) {
              if (not item.processed and item.user == user) {
                // Mark as processed (cancelled)
                let cancelledItem = {
                  item with
                  processed = true;
                };
                storage.depositQueue[idx] := ?cancelledItem;

                // Refund user
                refund(user, item.amount);

                // Update pending deposits
                let currentPending = switch (storage.pendingDeposits.get(user)) {
                  case (?pending) { pending };
                  case (null) { Decimal.zero() };
                };
                storage.pendingDeposits.put(
                  user,
                  Decimal.safeSub(currentPending, item.amount)
                );

                cancelled += 1;
              };
            };
            case (null) {};
          };
        };
      };
    };

    cleanDepositQueue(storage);
    cancelled
  };

  // Cancel redemptions for user
  public func cancelRedemptions(
    storage : QueueStorage,
    user : Principal,
    maxCancellations : Nat,
    refund : (Principal, Decimal) -> ()
  ) : Nat {
    var cancelled = 0;

    switch (storage.userRedemptionIndices.get(user)) {
      case (null) { return 0 };
      case (?indices) {
        for (idx in indices.vals()) {
          if (cancelled >= maxCancellations) {
            return cancelled;
          };

          switch (storage.redemptionQueue[idx]) {
            case (?item) {
              if (not item.processed and item.user == user) {
                // Mark as processed (cancelled)
                let cancelledItem = {
                  item with
                  processed = true;
                };
                storage.redemptionQueue[idx] := ?cancelledItem;

                // Refund shares
                refund(user, item.amount);

                // Update pending redemptions
                let currentPending = switch (storage.pendingRedemptions.get(user)) {
                  case (?pending) { pending };
                  case (null) { Decimal.zero() };
                };
                storage.pendingRedemptions.put(
                  user,
                  Decimal.safeSub(currentPending, item.amount)
                );

                cancelled += 1;
              };
            };
            case (null) {};
          };
        };
      };
    };

    cleanRedemptionQueue(storage);
    cancelled
  };

  // Get queue lengths
  public func queueLengths(storage : QueueStorage) : { deposits : Nat; redemptions : Nat } {
    {
      deposits = storage.depositQueueTail - storage.depositQueueHead;
      redemptions = storage.redemptionQueueTail - storage.redemptionQueueHead;
    }
  };

  // Get user's pending amounts
  public func getUserPending(storage : QueueStorage, user : Principal) : { deposits : Decimal; redemptions : Decimal } {
    {
      deposits = switch (storage.pendingDeposits.get(user)) {
        case (?amount) { amount };
        case (null) { Decimal.zero() };
      };
      redemptions = switch (storage.pendingRedemptions.get(user)) {
        case (?amount) { amount };
        case (null) { Decimal.zero() };
      };
    }
  };

  // Private helper functions

  private func enforceUserLimit(storage : QueueStorage, user : Principal, txType : TransactionType) {
    var count = 0;

    switch (txType) {
      case (#deposit) {
        var idx = storage.depositQueueHead;
        while (idx < storage.depositQueueTail) {
          switch (storage.depositQueue[idx]) {
            case (?item) {
              if (item.user == user and not item.processed) {
                count += 1;
                if (count >= MAX_PENDING_PER_USER) {
                  Debug.trap("Too many pending deposits for user");
                };
              };
            };
            case (null) {};
          };
          idx += 1;
        };
      };
      case (#redemption) {
        var idx = storage.redemptionQueueHead;
        while (idx < storage.redemptionQueueTail) {
          switch (storage.redemptionQueue[idx]) {
            case (?item) {
              if (item.user == user and not item.processed) {
                count += 1;
                if (count >= MAX_PENDING_PER_USER) {
                  Debug.trap("Too many pending redemptions for user");
                };
              };
            };
            case (null) {};
          };
          idx += 1;
        };
      };
    };
  };

  private func cleanDepositQueue(storage : QueueStorage) {
    // Move head forward past processed items
    while (storage.depositQueueHead < storage.depositQueueTail) {
      switch (storage.depositQueue[storage.depositQueueHead]) {
        case (?item) {
          if (item.processed) {
            storage.depositQueue[storage.depositQueueHead] := null;
            storage.depositQueueHead += 1;
          } else {
            return;
          };
        };
        case (null) {
          storage.depositQueueHead += 1;
        };
      };
    };
  };

  private func cleanRedemptionQueue(storage : QueueStorage) {
    // Move head forward past processed items
    while (storage.redemptionQueueHead < storage.redemptionQueueTail) {
      switch (storage.redemptionQueue[storage.redemptionQueueHead]) {
        case (?item) {
          if (item.processed) {
            storage.redemptionQueue[storage.redemptionQueueHead] := null;
            storage.redemptionQueueHead += 1;
          } else {
            return;
          };
        };
        case (null) {
          storage.redemptionQueueHead += 1;
        };
      };
    };
  };
}
