/// Simplified single-canister version for ICP.ninja playground
/// This version embeds all functionality in one canister for testing
import Decimal "lib/Decimal";
import QueueManager "lib/QueueManager";
import FeeManager "lib/FeeManager";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Iter "mo:base/Iter";
import Array "mo:base/Array";

persistent actor HedgeFundPlayground {

  type Decimal = Decimal.Decimal;

  // Simple fund configuration
  public type FundConfig = {
    name : Text;
    managementFeeBps : Nat;
    performanceFeeBps : Nat;
    entranceFeeBps : Nat;
    exitFeeBps : Nat;
    minInvestment : Decimal;
  };

  // Simple share tracking (embedded instead of separate canister)
  private transient let shares = HashMap.HashMap<Principal, Decimal>(10, Principal.equal, Principal.hash);
  private transient var totalShares : Decimal = Decimal.zero();

  // Fund state
  private transient var fundConfig : ?FundConfig = null;
  private transient let feeStorage = FeeManager.initStorage();
  private transient let queueStorage = QueueManager.initStorage();

  // Simulated base token balances (in real version, this would be ICRC-1 ledger)
  private transient let baseTokenBalances = HashMap.HashMap<Principal, Decimal>(10, Principal.equal, Principal.hash);

  // Admin
  private stable var admin : ?Principal = null;

  // Initialize fund
  public shared(msg) func initializeFund(config : FundConfig) : async Text {
    if (admin == null) {
      admin := ?msg.caller;
    };

    if (?msg.caller != admin) {
      Debug.trap("Only admin can initialize");
    };

    fundConfig := ?config;

    // Set fee rates
    feeStorage.managementFeeBps := config.managementFeeBps;
    feeStorage.performanceFeeBps := config.performanceFeeBps;
    feeStorage.entranceFeeBps := config.entranceFeeBps;
    feeStorage.exitFeeBps := config.exitFeeBps;

    "Fund initialized: " # config.name
  };

  // Get fund config
  public query func getFundConfig() : async ?FundConfig {
    fundConfig
  };

  // Give user some test tokens (for playground testing)
  public shared(msg) func mintTestTokens(amount : Nat) : async Decimal {
    let decimal_amount = Decimal.fromNat(amount);
    let current = switch (baseTokenBalances.get(msg.caller)) {
      case (?bal) { bal };
      case (null) { Decimal.zero() };
    };
    let newBalance = Decimal.add(current, decimal_amount);
    baseTokenBalances.put(msg.caller, newBalance);
    newBalance
  };

  // Check base token balance
  public query func getMyTokenBalance(caller : Principal) : async Text {
    let balance = switch (baseTokenBalances.get(caller)) {
      case (?bal) { bal };
      case (null) { Decimal.zero() };
    };
    Decimal.formatShort(balance) # " tokens"
  };

  // Check share balance
  public query func getMyShares(caller : Principal) : async Text {
    let balance = switch (shares.get(caller)) {
      case (?bal) { bal };
      case (null) { Decimal.zero() };
    };
    Decimal.formatShort(balance) # " shares"
  };

  // Get current NAV
  public query func getCurrentNav() : async Text {
    Decimal.formatShort(feeStorage.navPerShare)
  };

  // Submit deposit
  public shared(msg) func deposit(amount : Nat, minShares : Nat) : async Nat {
    switch (fundConfig) {
      case (null) { Debug.trap("Fund not initialized") };
      case (?config) {
        let decimal_amount = Decimal.fromNat(amount);
        let decimal_minShares = Decimal.fromNat(minShares);

        // Check minimum
        if (Decimal.lt(decimal_amount, config.minInvestment)) {
          Debug.trap("Below minimum investment");
        };

        // Check user has enough base tokens
        let userBalance = switch (baseTokenBalances.get(msg.caller)) {
          case (?bal) { bal };
          case (null) { Decimal.zero() };
        };

        if (Decimal.lt(userBalance, decimal_amount)) {
          Debug.trap("Insufficient token balance");
        };

        // Queue the deposit
        let idx = QueueManager.queueDeposit(
          queueStorage,
          msg.caller,
          decimal_amount,
          feeStorage.navPerShare,
          decimal_minShares
        );

        idx
      };
    };
  };

  // Process deposits (admin only)
  public shared(msg) func processDeposits(maxToProcess : Nat) : async Nat {
    if (?msg.caller != admin) {
      Debug.trap("Only admin can process");
    };

    let results = QueueManager.processDepositBatch(
      queueStorage,
      maxToProcess,
      feeStorage.navPerShare,
      func(amount : Decimal) : (Decimal, Decimal) {
        let fees = FeeManager.accrueEntranceFee(feeStorage, amount);
        (fees.netAmount, fees.feeAmount)
      }
    );

    // Mint shares and transfer tokens
    for (result in results.vals()) {
      // Deduct base tokens from user
      let userBalance = switch (baseTokenBalances.get(result.user)) {
        case (?bal) { bal };
        case (null) { Decimal.zero() };
      };
      baseTokenBalances.put(result.user, Decimal.sub(userBalance, result.netAmount));

      // Mint shares to user
      let userShares = switch (shares.get(result.user)) {
        case (?s) { s };
        case (null) { Decimal.zero() };
      };
      shares.put(result.user, Decimal.add(userShares, result.shares));
      totalShares := Decimal.add(totalShares, result.shares);
    };

    results.size()
  };

  // Submit redemption
  public shared(msg) func redeem(shareAmount : Nat, minPayout : Nat) : async Nat {
    let decimal_shares = Decimal.fromNat(shareAmount);
    let decimal_minPayout = Decimal.fromNat(minPayout);

    // Check user has enough shares
    let userShares = switch (shares.get(msg.caller)) {
      case (?s) { s };
      case (null) { Decimal.zero() };
    };

    if (Decimal.lt(userShares, decimal_shares)) {
      Debug.trap("Insufficient shares");
    };

    // Queue redemption
    let idx = QueueManager.queueRedemption(
      queueStorage,
      msg.caller,
      decimal_shares,
      feeStorage.navPerShare,
      decimal_minPayout
    );

    idx
  };

  // Process redemptions (admin only)
  public shared(msg) func processRedemptions(maxToProcess : Nat) : async Nat {
    if (?msg.caller != admin) {
      Debug.trap("Only admin can process");
    };

    let results = QueueManager.processRedemptionBatch(
      queueStorage,
      maxToProcess,
      func(user : Principal, shareAmount : Decimal, nav : Decimal) : ?Decimal {
        // Calculate payout
        let gross = Decimal.mul(shareAmount, nav);
        let fees = FeeManager.accrueExitFee(feeStorage, gross);
        ?fees.netAmount
      }
    );

    // Burn shares and transfer tokens
    for (result in results.vals()) {
      // Burn shares
      let userShares = switch (shares.get(result.user)) {
        case (?s) { s };
        case (null) { Decimal.zero() };
      };
      shares.put(result.user, Decimal.sub(userShares, result.shares));
      totalShares := Decimal.sub(totalShares, result.shares);

      // Transfer tokens to user
      let userBalance = switch (baseTokenBalances.get(result.user)) {
        case (?bal) { bal };
        case (null) { Decimal.zero() };
      };
      baseTokenBalances.put(result.user, Decimal.add(userBalance, result.payout));
    };

    results.size()
  };

  // Update AUM (admin only)
  public shared(msg) func updateAUM(newAum : Nat) : async Text {
    if (?msg.caller != admin) {
      Debug.trap("Only admin can update AUM");
    };

    let decimal_aum = Decimal.fromNat(newAum);
    let result = FeeManager.accrueFeesOnAumUpdate(
      feeStorage,
      decimal_aum,
      totalShares
    );

    "AUM updated. New NAV: " # Decimal.formatShort(result.newNav)
  };

  // Get queue status
  public query func getQueueStatus() : async { deposits : Nat; redemptions : Nat } {
    QueueManager.queueLengths(queueStorage)
  };

  // Get my pending
  public query func getMyPending(caller : Principal) : async { deposits : Text; redemptions : Text } {
    let pending = QueueManager.getUserPending(queueStorage, caller);
    {
      deposits = Decimal.formatShort(pending.deposits);
      redemptions = Decimal.formatShort(pending.redemptions);
    }
  };

  // Get fee breakdown
  public query func getFeeBreakdown() : async {
    mgmt : Text;
    perf : Text;
    entrance : Text;
    exit : Text;
    total : Text;
  } {
    let fees = FeeManager.accruedFeesBreakdown(feeStorage);
    {
      mgmt = Decimal.formatShort(fees.mgmt);
      perf = Decimal.formatShort(fees.perf);
      entrance = Decimal.formatShort(fees.entrance);
      exit = Decimal.formatShort(fees.exit);
      total = Decimal.formatShort(fees.total);
    }
  };

  // Get HWM status
  public query func getHWMStatus() : async {
    hwm : Text;
    lowestNav : Text;
    daysToReset : Nat;
  } {
    let status = FeeManager.getHWMStatus(feeStorage);
    {
      hwm = Decimal.formatShort(status.hwm);
      lowestNav = Decimal.formatShort(status.lowestNav);
      daysToReset = status.daysToReset;
    }
  };

  // Get total shares
  public query func getTotalShares() : async Text {
    Decimal.formatShort(totalShares)
  };

  // Cancel my deposits
  public shared(msg) func cancelMyDeposits(maxCancellations : Nat) : async Nat {
    QueueManager.cancelDeposits(
      queueStorage,
      msg.caller,
      maxCancellations,
      func(user : Principal, amount : Decimal) {
        // Refund tokens
        let balance = switch (baseTokenBalances.get(user)) {
          case (?bal) { bal };
          case (null) { Decimal.zero() };
        };
        baseTokenBalances.put(user, Decimal.add(balance, amount));
      }
    )
  };

  // Cancel my redemptions
  public shared(msg) func cancelMyRedemptions(maxCancellations : Nat) : async Nat {
    QueueManager.cancelRedemptions(
      queueStorage,
      msg.caller,
      maxCancellations,
      func(user : Principal, shareAmount : Decimal) {
        // Refund shares
        let userShares = switch (shares.get(user)) {
          case (?s) { s };
          case (null) { Decimal.zero() };
        };
        shares.put(user, Decimal.add(userShares, shareAmount));
        totalShares := Decimal.add(totalShares, shareAmount);
      }
    )
  };

  // Test Decimal library
  public query func testDecimal() : async {
    addition : Text;
    multiplication : Text;
    division : Text;
    basisPoints : Text;
  } {
    let five = Decimal.fromNat(5);
    let two = Decimal.fromNat(2);
    let oneHalf = Decimal.div(Decimal.one(), Decimal.fromNat(2));

    {
      addition = Decimal.formatShort(Decimal.add(five, two)); // 7.0
      multiplication = Decimal.formatShort(Decimal.mul(five, two)); // 10.0
      division = Decimal.formatShort(Decimal.div(five, two)); // 2.5
      basisPoints = Decimal.formatShort(Decimal.mulBps(Decimal.fromNat(1000), 250)); // 25.0 (2.5%)
    }
  };
}
