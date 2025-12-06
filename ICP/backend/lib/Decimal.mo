/// Fixed-point decimal library with 18 decimal places
/// All values are stored as Nat representing value * 10^18
/// This provides precision similar to Solidity's uint256 with 18 decimals
import Nat "mo:base/Nat";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Debug "mo:base/Debug";

module {

  /// Decimal type - internally stores value * 10^18
  public type Decimal = Nat;

  /// Precision: 10^18 (18 decimal places)
  public let PRECISION : Nat = 1_000_000_000_000_000_000;

  /// Maximum safe value to prevent overflow
  /// Max Nat is ~2^128, so max safe value is ~10^20 before overflow in multiplication
  public let MAX_SAFE : Nat = 100_000_000_000_000_000_000; // 10^20

  /// Zero value
  public func zero() : Decimal {
    0
  };

  /// One value (1.0)
  public func one() : Decimal {
    PRECISION
  };

  /// Create Decimal from Nat (whole number)
  /// Example: fromNat(5) = 5.000000000000000000
  public func fromNat(n : Nat) : Decimal {
    n * PRECISION
  };

  /// Create Decimal from Int (whole number)
  /// Note: Negative values will trap - use only for positive values
  public func fromInt(i : Int) : Decimal {
    if (i < 0) {
      Debug.trap("Decimal: Cannot convert negative Int to Decimal");
    };
    Int.abs(i) * PRECISION
  };

  /// Create Decimal from parts (whole and fractional)
  /// Example: fromParts(5, 500000000000000000) = 5.5
  public func fromParts(whole : Nat, fractional : Nat) : Decimal {
    if (fractional >= PRECISION) {
      Debug.trap("Decimal: Fractional part must be < PRECISION");
    };
    whole * PRECISION + fractional
  };

  /// Convert Decimal to Nat (truncates fractional part)
  /// Example: toNat(5.7 * PRECISION) = 5
  public func toNat(d : Decimal) : Nat {
    d / PRECISION
  };

  /// Convert Decimal to Float (for display purposes only)
  /// WARNING: Loses precision! Only use for UI display
  public func toFloat(d : Decimal) : Float {
    Float.fromInt(d) / Float.fromInt(PRECISION)
  };

  /// Create Decimal from Float (for migration/conversion)
  /// WARNING: Loses precision! Avoid if possible
  public func fromFloat(f : Float) : Decimal {
    if (f < 0.0) {
      Debug.trap("Decimal: Cannot convert negative Float to Decimal");
    };
    let scaled = f * Float.fromInt(PRECISION);
    Int.abs(Float.toInt(scaled))
  };

  /// Addition: a + b
  public func add(a : Decimal, b : Decimal) : Decimal {
    a + b
  };

  /// Subtraction: a - b
  /// Traps if b > a (no negative numbers)
  public func sub(a : Decimal, b : Decimal) : Decimal {
    if (b > a) {
      Debug.trap("Decimal: Subtraction would result in negative value");
    };
    a - b
  };

  /// Safe subtraction: returns 0 if b > a
  public func safeSub(a : Decimal, b : Decimal) : Decimal {
    if (b > a) { 0 } else { a - b }
  };

  /// Multiplication: a * b
  /// Result is scaled back to maintain precision
  public func mul(a : Decimal, b : Decimal) : Decimal {
    (a * b) / PRECISION
  };

  /// Division: a / b
  /// Traps if b == 0
  public func div(a : Decimal, b : Decimal) : Decimal {
    if (b == 0) {
      Debug.trap("Decimal: Division by zero");
    };
    (a * PRECISION) / b
  };

  /// Safe division: returns 0 if b == 0
  public func safeDiv(a : Decimal, b : Decimal) : Decimal {
    if (b == 0) { 0 } else { (a * PRECISION) / b }
  };

  /// Multiply by basis points (e.g., mulBps(100, 250) = 100 * 2.5%)
  /// bps: basis points (100 bps = 1%)
  public func mulBps(amount : Decimal, bps : Nat) : Decimal {
    (amount * bps) / 10_000
  };

  /// Calculate percentage: (part / whole) * 100
  /// Returns result in basis points (100 bps = 1%)
  public func percentage(part : Decimal, whole : Decimal) : Nat {
    if (whole == 0) { return 0 };
    toNat((part * fromNat(10_000)) / whole)
  };

  /// Compare: a < b
  public func lt(a : Decimal, b : Decimal) : Bool {
    a < b
  };

  /// Compare: a <= b
  public func lte(a : Decimal, b : Decimal) : Bool {
    a <= b
  };

  /// Compare: a > b
  public func gt(a : Decimal, b : Decimal) : Bool {
    a > b
  };

  /// Compare: a >= b
  public func gte(a : Decimal, b : Decimal) : Bool {
    a >= b
  };

  /// Compare: a == b
  public func eq(a : Decimal, b : Decimal) : Bool {
    a == b
  };

  /// Minimum of two decimals
  public func min(a : Decimal, b : Decimal) : Decimal {
    if (a < b) { a } else { b }
  };

  /// Maximum of two decimals
  public func max(a : Decimal, b : Decimal) : Decimal {
    if (a > b) { a } else { b }
  };

  /// Format as string with specified decimal places
  /// Example: format(5500000000000000000, 2) = "5.50"
  public func format(d : Decimal, decimalPlaces : Nat) : Text {
    let whole = d / PRECISION;
    let fractional = d % PRECISION;

    if (decimalPlaces == 0) {
      return Nat.toText(whole);
    };

    let divisor = PRECISION / (10 ** decimalPlaces);
    let truncated = fractional / divisor;
    let fractionalText = Nat.toText(truncated);

    // Pad with leading zeros if needed
    let padding = decimalPlaces - fractionalText.size();
    var padded = fractionalText;
    var i = 0;
    while (i < padding) {
      padded := "0" # padded;
      i += 1;
    };

    Nat.toText(whole) # "." # padded
  };

  /// Format as string with 18 decimal places (full precision)
  public func formatFull(d : Decimal) : Text {
    format(d, 18)
  };

  /// Format as string with 6 decimal places (common for display)
  public func formatShort(d : Decimal) : Text {
    format(d, 6)
  };

  /// Format as string with 2 decimal places (fiat currencies)
  public func formatCurrency(d : Decimal) : Text {
    format(d, 2)
  };

  /// Power function: base^exponent
  /// Note: exponent must be small to avoid overflow
  public func pow(base : Decimal, exponent : Nat) : Decimal {
    if (exponent == 0) { return one() };
    if (exponent == 1) { return base };

    var result = one();
    var i = 0;
    while (i < exponent) {
      result := mul(result, base);
      i += 1;
    };
    result
  };

  /// Calculate annual rate from basis points
  /// Example: annualRateToBps(200) = 0.02 (2% per year)
  public func annualRateFromBps(bps : Nat) : Decimal {
    fromNat(bps) * PRECISION / 10_000
  };

  /// Calculate time-based fee
  /// amount: principal amount
  /// rateBps: annual rate in basis points
  /// timeDeltaNs: time elapsed in nanoseconds
  public func timeBasedFee(amount : Decimal, rateBps : Nat, timeDeltaNs : Nat) : Decimal {
    let NANOS_PER_YEAR = 31_557_600_000_000_000; // 365.25 days
    let rate = fromNat(rateBps);
    let timeRatio = fromNat(timeDeltaNs) * PRECISION / fromNat(NANOS_PER_YEAR);
    mul(mul(amount, rate), timeRatio) / 10_000
  };

  /// Validate decimal is within safe range
  public func isSafe(d : Decimal) : Bool {
    d <= MAX_SAFE
  };

  /// Assert decimal is safe (traps if not)
  public func assertSafe(d : Decimal) {
    if (not isSafe(d)) {
      Debug.trap("Decimal: Value exceeds safe range");
    };
  };
}
