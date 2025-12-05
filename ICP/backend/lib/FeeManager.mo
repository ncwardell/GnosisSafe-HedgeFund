/// Fee management system with high water mark tracking
/// Ported from EVM FeeManager.sol with ICP adaptations
import Decimal "Decimal";
import Time "mo:base/Time";
import Int "mo:base/Int";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

module {
  public type Decimal = Decimal.Decimal;

  // Constants
  private let NANOS_PER_YEAR : Nat = 31_557_600_000_000_000; // 365.25 days in nanoseconds
  private let MAX_TIME_DELTA : Nat = 365 * 24 * 60 * 60 * 1_000_000_000; // 1 year in nanoseconds

  // Fee storage
  public type FeeStorage = {
    // Fee rates (in basis points, 100 bps = 1%)
    var managementFeeBps : Nat;
    var performanceFeeBps : Nat;
    var entranceFeeBps : Nat;
    var exitFeeBps : Nat;

    // Accrued fees (in 18-decimal format)
    var accruedManagementFees : Decimal;
    var accruedPerformanceFees : Decimal;
    var accruedEntranceFees : Decimal;
    var accruedExitFees : Decimal;

    // High Water Mark tracking
    var highWaterMark : Decimal;
    var lowestNavInDrawdown : Decimal;
    var recoveryStartTime : ?Time.Time;

    // HWM reset configuration
    var hwmDrawdownPct : Nat; // e.g., 6000 = 60%
    var hwmRecoveryPct : Nat; // e.g., 500 = 5%
    var hwmRecoveryPeriod : Time.Time; // e.g., 90 days

    // State tracking
    var aum : Decimal;
    var aumTimestamp : Time.Time;
    var navPerShare : Decimal;
    var lastFeeAccrual : Time.Time;

    // Liquidity requirement
    var targetLiquidityBps : Nat; // e.g., 500 = 5% of AUM must be liquid
  };

  // Initialize fee storage
  public func initStorage() : FeeStorage {
    {
      var managementFeeBps = 0;
      var performanceFeeBps = 0;
      var entranceFeeBps = 0;
      var exitFeeBps = 0;
      var accruedManagementFees = Decimal.zero();
      var accruedPerformanceFees = Decimal.zero();
      var accruedEntranceFees = Decimal.zero();
      var accruedExitFees = Decimal.zero();
      var highWaterMark = Decimal.one(); // Start at 1.0
      var lowestNavInDrawdown = Decimal.zero();
      var recoveryStartTime = null;
      var hwmDrawdownPct = 6000; // 60%
      var hwmRecoveryPct = 500; // 5%
      var hwmRecoveryPeriod = 90 * 24 * 60 * 60 * 1_000_000_000; // 90 days
      var aum = Decimal.zero();
      var aumTimestamp = Time.now();
      var navPerShare = Decimal.one();
      var lastFeeAccrual = Time.now();
      var targetLiquidityBps = 500; // 5%
    }
  };

  // Accrue fees on AUM update
  public func accrueFeesOnAumUpdate(
    storage : FeeStorage,
    newAum : Decimal,
    totalShares : Decimal
  ) : { adjustedAum : Decimal; newNav : Decimal } {
    if (Decimal.eq(newAum, Decimal.zero())) {
      Debug.trap("AUM cannot be zero");
    };

    // Calculate time delta
    let now = Time.now();
    var timeDelta = Int.abs(now - storage.lastFeeAccrual);
    if (timeDelta > MAX_TIME_DELTA) {
      timeDelta := MAX_TIME_DELTA;
    };

    // Only accrue if time delta is reasonable (not stale)
    let threeDaysNanos = 3 * 24 * 60 * 60 * 1_000_000_000;
    if (timeDelta <= threeDaysNanos) {
      // Accrue management fees
      if (storage.managementFeeBps > 0 and Decimal.gt(totalShares, Decimal.zero())) {
        let annualRate = Decimal.fromNat(storage.managementFeeBps);
        let timeRatio = Decimal.fromNat(timeDelta);
        let yearNanos = Decimal.fromNat(NANOS_PER_YEAR);

        // mgmtFee = (nav * feeBps / 10000) * (timeDelta / year) * totalShares
        let feeRate = Decimal.div(annualRate, Decimal.fromNat(10_000));
        let timeScale = Decimal.div(timeRatio, yearNanos);
        let mgmtFee = Decimal.mul(
          Decimal.mul(Decimal.mul(storage.navPerShare, feeRate), timeScale),
          totalShares
        );

        storage.accruedManagementFees := Decimal.add(storage.accruedManagementFees, mgmtFee);
      };

      // Calculate temporary NAV for performance fee check
      let tempNav = if (Decimal.gt(totalShares, Decimal.zero())) {
        Decimal.div(newAum, totalShares)
      } else {
        Decimal.one()
      };

      // Accrue performance fees if above HWM
      if (Decimal.gt(tempNav, storage.highWaterMark) and storage.performanceFeeBps > 0 and Decimal.gt(totalShares, Decimal.zero())) {
        let profit = Decimal.sub(tempNav, storage.highWaterMark);
        let perfRate = Decimal.div(Decimal.fromNat(storage.performanceFeeBps), Decimal.fromNat(10_000));
        let perfFee = Decimal.mul(Decimal.mul(profit, perfRate), totalShares);

        storage.accruedPerformanceFees := Decimal.add(storage.accruedPerformanceFees, perfFee);
      };
    };

    // Calculate total accrued fees
    let totalFees = Decimal.add(
      Decimal.add(storage.accruedManagementFees, storage.accruedPerformanceFees),
      Decimal.add(storage.accruedEntranceFees, storage.accruedExitFees)
    );

    // Adjust AUM by fees
    let adjustedAum = Decimal.safeSub(newAum, totalFees);

    // Calculate new NAV
    let newNav = if (Decimal.gt(totalShares, Decimal.zero())) {
      Decimal.div(adjustedAum, totalShares)
    } else {
      Decimal.one()
    };

    // Update storage
    storage.aum := adjustedAum;
    storage.aumTimestamp := now;
    storage.navPerShare := newNav;
    storage.lastFeeAccrual := now;

    // Update high water mark
    updateHighWaterMark(storage, newNav);

    { adjustedAum = adjustedAum; newNav = newNav }
  };

  // Accrue entrance fee
  public func accrueEntranceFee(
    storage : FeeStorage,
    depositAmount : Decimal
  ) : { netAmount : Decimal; feeAmount : Decimal } {
    let fee = Decimal.mulBps(depositAmount, storage.entranceFeeBps);
    let netAmount = Decimal.sub(depositAmount, fee);

    if (Decimal.gt(fee, Decimal.zero())) {
      storage.accruedEntranceFees := Decimal.add(storage.accruedEntranceFees, fee);
    };

    { netAmount = netAmount; feeAmount = fee }
  };

  // Accrue exit fee
  public func accrueExitFee(
    storage : FeeStorage,
    grossAmount : Decimal
  ) : { netAmount : Decimal; feeAmount : Decimal } {
    let fee = Decimal.mulBps(grossAmount, storage.exitFeeBps);
    let netAmount = Decimal.sub(grossAmount, fee);

    if (Decimal.gt(fee, Decimal.zero())) {
      storage.accruedExitFees := Decimal.add(storage.accruedExitFees, fee);
    };

    { netAmount = netAmount; feeAmount = fee }
  };

  // Update high water mark with reset logic
  public func updateHighWaterMark(storage : FeeStorage, currentNav : Decimal) {
    // If NAV exceeds HWM, set new HWM and reset drawdown tracking
    if (Decimal.gt(currentNav, storage.highWaterMark)) {
      storage.highWaterMark := currentNav;
      storage.lowestNavInDrawdown := Decimal.zero();
      storage.recoveryStartTime := null;
      return;
    };

    // Calculate drawdown threshold
    let drawdownMultiplier = Decimal.div(
      Decimal.fromNat(10_000 - storage.hwmDrawdownPct),
      Decimal.fromNat(10_000)
    );
    let drawdownThreshold = Decimal.mul(storage.highWaterMark, drawdownMultiplier);

    // If below drawdown threshold, start tracking
    if (Decimal.lt(currentNav, drawdownThreshold)) {
      // Update lowest NAV in drawdown
      if (Decimal.eq(storage.lowestNavInDrawdown, Decimal.zero()) or Decimal.lt(currentNav, storage.lowestNavInDrawdown)) {
        storage.lowestNavInDrawdown := currentNav;
        storage.recoveryStartTime := null;
      };

      // Calculate recovery threshold
      let recoveryMultiplier = Decimal.div(
        Decimal.fromNat(10_000 + storage.hwmRecoveryPct),
        Decimal.fromNat(10_000)
      );
      let recoveryThreshold = Decimal.mul(storage.lowestNavInDrawdown, recoveryMultiplier);

      // Check if recovering
      if (Decimal.gte(currentNav, recoveryThreshold)) {
        switch (storage.recoveryStartTime) {
          case (null) {
            // Start recovery timer
            storage.recoveryStartTime := ?Time.now();
          };
          case (?startTime) {
            // Check if recovery period complete
            let elapsed = Int.abs(Time.now() - startTime);
            if (elapsed >= Int.abs(storage.hwmRecoveryPeriod)) {
              // Reset HWM!
              storage.highWaterMark := currentNav;
              storage.lowestNavInDrawdown := Decimal.zero();
              storage.recoveryStartTime := null;
            };
          };
        };
      } else {
        // Dropped below recovery threshold - reset timer
        storage.recoveryStartTime := null;
      };
    };
  };

  // Get total accrued fees
  public func totalAccruedFees(storage : FeeStorage) : Decimal {
    Decimal.add(
      Decimal.add(storage.accruedManagementFees, storage.accruedPerformanceFees),
      Decimal.add(storage.accruedEntranceFees, storage.accruedExitFees)
    )
  };

  // Get fee breakdown
  public func accruedFeesBreakdown(storage : FeeStorage) : {
    mgmt : Decimal;
    perf : Decimal;
    entrance : Decimal;
    exit : Decimal;
    total : Decimal;
  } {
    {
      mgmt = storage.accruedManagementFees;
      perf = storage.accruedPerformanceFees;
      entrance = storage.accruedEntranceFees;
      exit = storage.accruedExitFees;
      total = totalAccruedFees(storage);
    }
  };

  // Reset fees after payout
  public func resetFees(storage : FeeStorage, amountPaid : Decimal) {
    let totalFees = totalAccruedFees(storage);

    if (Decimal.gte(amountPaid, totalFees)) {
      // Full payment
      storage.accruedManagementFees := Decimal.zero();
      storage.accruedPerformanceFees := Decimal.zero();
      storage.accruedEntranceFees := Decimal.zero();
      storage.accruedExitFees := Decimal.zero();
    } else {
      // Partial payment - reduce proportionally
      let remainingRatio = Decimal.div(
        Decimal.sub(totalFees, amountPaid),
        totalFees
      );

      storage.accruedManagementFees := Decimal.mul(storage.accruedManagementFees, remainingRatio);
      storage.accruedPerformanceFees := Decimal.mul(storage.accruedPerformanceFees, remainingRatio);
      storage.accruedEntranceFees := Decimal.mul(storage.accruedEntranceFees, remainingRatio);
      storage.accruedExitFees := Decimal.mul(storage.accruedExitFees, remainingRatio);
    };
  };

  // Get HWM status
  public func getHWMStatus(storage : FeeStorage) : {
    hwm : Decimal;
    lowestNav : Decimal;
    recoveryStart : ?Time.Time;
    daysToReset : Nat;
  } {
    let daysToReset = switch (storage.recoveryStartTime) {
      case (null) { 0 };
      case (?startTime) {
        let elapsed = Int.abs(Time.now() - startTime);
        let remaining = Int.abs(storage.hwmRecoveryPeriod) - elapsed;
        if (remaining > 0) {
          Nat.div(remaining, 24 * 60 * 60 * 1_000_000_000) // Convert to days
        } else {
          0
        }
      };
    };

    {
      hwm = storage.highWaterMark;
      lowestNav = storage.lowestNavInDrawdown;
      recoveryStart = storage.recoveryStartTime;
      daysToReset = daysToReset;
    }
  };
}
