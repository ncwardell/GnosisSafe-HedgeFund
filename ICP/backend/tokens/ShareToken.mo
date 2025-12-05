/// ICRC-1 compliant share token for hedge fund
/// Each fund has its own instance of this canister
/// Implements the ICRC-1 token standard for fungible tokens on ICP
import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Option "mo:base/Option";

shared(init_msg) actor class ShareToken(
  _name : Text,
  _symbol : Text,
  _decimals : Nat8,
  _fundCanister : Principal,
  _minter : Principal
) = this {

  // ICRC-1 Types
  public type Account = {
    owner : Principal;
    subaccount : ?Blob;
  };

  public type TransferArgs = {
    from_subaccount : ?Blob;
    to : Account;
    amount : Nat;
    fee : ?Nat;
    memo : ?Blob;
    created_at_time : ?Nat64;
  };

  public type TransferError = {
    #BadFee : { expected_fee : Nat };
    #BadBurn : { min_burn_amount : Nat };
    #InsufficientFunds : { balance : Nat };
    #TooOld;
    #CreatedInFuture : { ledger_time : Nat64 };
    #Duplicate : { duplicate_of : Nat };
    #TemporarilyUnavailable;
    #GenericError : { error_code : Nat; message : Text };
  };

  // Token metadata
  private stable let name : Text = _name;
  private stable let symbol : Text = _symbol;
  private stable let decimals : Nat8 = _decimals;
  private stable let fee : Nat = 0; // No transfer fee for shares
  private stable let minter : Principal = _minter;
  private stable let fundCanister : Principal = _fundCanister;

  // Balances
  private let balances = HashMap.HashMap<Principal, Nat>(10, Principal.equal, Principal.hash);
  private stable var totalSupply_ : Nat = 0;

  // Transaction log
  private stable var transactionCount : Nat = 0;

  // For upgrade persistence
  private stable var balanceEntries : [(Principal, Nat)] = [];

  system func preupgrade() {
    balanceEntries := Iter.toArray(balances.entries());
  };

  system func postupgrade() {
    for ((principal, balance) in balanceEntries.vals()) {
      balances.put(principal, balance);
    };
    balanceEntries := [];
  };

  // Helper to get balance
  private func _balance(owner : Principal) : Nat {
    switch (balances.get(owner)) {
      case (?balance) { balance };
      case (null) { 0 };
    }
  };

  // ICRC-1 Standard Methods

  /// Returns the name of the token
  public query func icrc1_name() : async Text {
    name
  };

  /// Returns the symbol of the token
  public query func icrc1_symbol() : async Text {
    symbol
  };

  /// Returns the number of decimals
  public query func icrc1_decimals() : async Nat8 {
    decimals
  };

  /// Returns the transfer fee
  public query func icrc1_fee() : async Nat {
    fee
  };

  /// Returns the total supply
  public query func icrc1_total_supply() : async Nat {
    totalSupply_
  };

  /// Returns the minter account
  public query func icrc1_minting_account() : async ?Account {
    ?{ owner = minter; subaccount = null }
  };

  /// Returns the balance of an account
  public query func icrc1_balance_of(account : Account) : async Nat {
    // For now, ignore subaccounts (can be added later)
    _balance(account.owner)
  };

  /// Returns metadata about the token
  public query func icrc1_metadata() : async [(Text, Value)] {
    [
      ("icrc1:name", #Text(name)),
      ("icrc1:symbol", #Text(symbol)),
      ("icrc1:decimals", #Nat(Nat8.toNat(decimals))),
      ("icrc1:fee", #Nat(fee)),
    ]
  };

  public type Value = {
    #Nat : Nat;
    #Int : Int;
    #Text : Text;
    #Blob : Blob;
  };

  /// Returns the standards supported by this token
  public query func icrc1_supported_standards() : async [{
    name : Text;
    url : Text;
  }] {
    [
      {
        name = "ICRC-1";
        url = "https://github.com/dfinity/ICRC-1";
      }
    ]
  };

  /// Transfer tokens
  public shared(msg) func icrc1_transfer(args : TransferArgs) : async Result.Result<Nat, TransferError> {
    let from = msg.caller;
    let to = args.to.owner;
    let amount = args.amount;

    // Check balance
    let fromBalance = _balance(from);
    if (fromBalance < amount) {
      return #err(#InsufficientFunds { balance = fromBalance });
    };

    // Check fee
    let expectedFee = fee;
    switch (args.fee) {
      case (?providedFee) {
        if (providedFee != expectedFee) {
          return #err(#BadFee { expected_fee = expectedFee });
        };
      };
      case (null) {};
    };

    // Perform transfer
    let newFromBalance = fromBalance - amount;
    let toBalance = _balance(to);
    let newToBalance = toBalance + amount;

    balances.put(from, newFromBalance);
    balances.put(to, newToBalance);

    transactionCount += 1;

    #ok(transactionCount - 1)
  };

  // Fund-specific methods (not part of ICRC-1)

  /// Mint new tokens (only callable by fund canister)
  public shared(msg) func mint(to : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    if (msg.caller != fundCanister and msg.caller != minter) {
      return #err("Unauthorized: Only fund canister can mint");
    };

    let toBalance = _balance(to);
    let newBalance = toBalance + amount;

    balances.put(to, newBalance);
    totalSupply_ += amount;

    #ok(newBalance)
  };

  /// Burn tokens (only callable by fund canister)
  public shared(msg) func burn(from : Principal, amount : Nat) : async Result.Result<Nat, Text> {
    if (msg.caller != fundCanister and msg.caller != minter) {
      return #err("Unauthorized: Only fund canister can burn");
    };

    let fromBalance = _balance(from);
    if (fromBalance < amount) {
      return #err("Insufficient balance");
    };

    let newBalance = fromBalance - amount;

    balances.put(from, newBalance);
    totalSupply_ -= amount;

    #ok(newBalance)
  };

  /// Get all holders (for governance/analytics)
  public query func getHolders() : async [(Principal, Nat)] {
    Iter.toArray(balances.entries())
  };

  /// Get holder count
  public query func getHolderCount() : async Nat {
    balances.size()
  };
}
