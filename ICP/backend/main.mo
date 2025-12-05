import AccessControl "authorization/access-control";
import Principal "mo:base/Principal";
import OrderedMap "mo:base/OrderedMap";
import Debug "mo:base/Debug";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Float "mo:base/Float";
import Array "mo:base/Array";
import Migration "migration";
import Storage "blob-storage/Storage";
import MixinStorage "blob-storage/Mixin";

(with migration = Migration.run)
actor HedgeFundPlatform {
  // Initialize the user system state
  let accessControlState = AccessControl.initState();

  // Initialize auth (first caller becomes admin, others become users)
  public shared ({ caller }) func initializeAccessControl() : async () {
    AccessControl.initialize(accessControlState, caller);
  };

  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  public shared ({ caller }) func assignCallerUserRole(user : Principal, role : AccessControl.UserRole) : async () {
    // Admin-only check happens inside
    AccessControl.assignRole(accessControlState, caller, user, role);
  };

  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };

  public type UserProfile = {
    name : Text;
  };

  transient let principalMap = OrderedMap.Make<Principal>(Principal.compare);
  var userProfiles = principalMap.empty<UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can access profiles");
    };
    principalMap.get(userProfiles, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Debug.trap("Unauthorized: Can only view your own profile");
    };
    principalMap.get(userProfiles, user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles := principalMap.put(userProfiles, caller, profile);
  };

  // Extended role system for hedge fund platform
  public type FundRole = {
    #admin;
    #processor;
    #aumUpdater;
    #guardian;
  };

  var fundRoles = principalMap.empty<FundRole>();

  // Track fund creators for ownership verification
  transient let fundMap = OrderedMap.Make<FundId>(Nat.compare);
  var fundCreators = fundMap.empty<Principal>();

  // Track investor positions per fund
  type InvestorKey = (FundId, Principal);
  transient let investorMap = OrderedMap.Make<InvestorKey>(
    func(a : InvestorKey, b : InvestorKey) : { #less; #equal; #greater } {
      let (aFund, aPrincipal) = a;
      let (bFund, bPrincipal) = b;
      switch (Nat.compare(aFund, bFund)) {
        case (#equal) { Principal.compare(aPrincipal, bPrincipal) };
        case (other) { other };
      };
    }
  );
  var investorShares = investorMap.empty<Float>();

  // Role management functions
  public shared ({ caller }) func assignFundRole(user : Principal, role : FundRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can assign fund roles");
    };
    fundRoles := principalMap.put(fundRoles, user, role);
  };

  public query ({ caller }) func getFundRole(user : Principal) : async ?FundRole {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can view fund roles");
    };
    principalMap.get(fundRoles, user);
  };

  private func hasFundRole(caller : Principal, role : FundRole) : Bool {
    switch (principalMap.get(fundRoles, caller)) {
      case (?userRole) { userRole == role };
      case (null) { false };
    };
  };

  private func isAdminOrHasRole(caller : Principal, role : FundRole) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or hasFundRole(caller, role);
  };

  private func isFundCreator(caller : Principal, fundId : FundId) : Bool {
    switch (fundMap.get(fundCreators, fundId)) {
      case (?creator) { creator == caller };
      case (null) { false };
    };
  };

  private func canManageFund(caller : Principal, fundId : FundId) : Bool {
    AccessControl.isAdmin(accessControlState, caller) or isFundCreator(caller, fundId);
  };

  private func isInvestor(caller : Principal, fundId : FundId) : Bool {
    switch (investorMap.get(investorShares, (fundId, caller))) {
      case (?shares) { shares > 0.0 };
      case (null) { false };
    };
  };

  private func getInvestorShares(fundId : FundId, investor : Principal) : Float {
    switch (investorMap.get(investorShares, (fundId, investor))) {
      case (?shares) { shares };
      case (null) { 0.0 };
    };
  };

  private func canViewFundData(caller : Principal, fundId : FundId) : Bool {
    canManageFund(caller, fundId) or isInvestor(caller, fundId) or isAdminOrHasRole(caller, #processor);
  };

  // Fund Types
  public type FundId = Nat;
  public type FeeType = { #management; #performance; #entrance; #exit };
  public type FundConfig = {
    name : Text;
    managementFee : Float;
    performanceFee : Float;
    entranceFee : Float;
    exitFee : Float;
    minInvestment : Nat;
    isPaused : Bool;
    highWaterMark : Float;
    creatorMetadata : CreatorMetadata;
    baseToken : Text;
    autoDeposit : Bool;
    autoWithdrawal : Bool;
  };

  public type FundState = {
    aum : Float;
    nav : Float;
    totalShares : Float;
    accruedFees : Float;
    lastUpdated : Time.Time;
    historicalAUM : [AUMRecord];
  };

  public type TransactionType = { #deposit; #redemption };
  public type TransactionStatus = { #pending; #processed; #cancelled };

  public type Transaction = {
    id : Nat;
    fundId : FundId;
    user : Principal;
    amount : Float;
    shares : Float;
    txType : TransactionType;
    status : TransactionStatus;
    timestamp : Time.Time;
  };

  public type CreatorMetadata = {
    website : Text;
    contactEmail : Text;
    description : Text;
    telegramHandle : ?Text;
  };

  public type AUMRecord = {
    timestamp : Time.Time;
    aum : Float;
  };

  public type TimelockProposal = {
    id : Nat;
    fundId : FundId;
    proposedConfig : FundConfig;
    proposer : Principal;
    timestamp : Time.Time;
    executeAfter : Time.Time;
    status : { #pending; #executed; #cancelled };
  };

  // Storage
  transient let natMap = OrderedMap.Make<Nat>(Nat.compare);

  var funds = fundMap.empty<FundConfig>();
  var fundStates = fundMap.empty<FundState>();
  var transactions = natMap.empty<Transaction>();
  var timelockProposals = natMap.empty<TimelockProposal>();
  var nextFundId : FundId = 1;
  var nextTxId : Nat = 1;
  var nextProposalId : Nat = 1;
  var platformFeeRate : Float = 0.005;

  // Fund Management
  public shared ({ caller }) func createFund(config : FundConfig) : async FundId {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can create funds");
    };

    let fundId = nextFundId;
    nextFundId += 1;

    funds := fundMap.put(funds, fundId, config);
    fundStates := fundMap.put(
      fundStates,
      fundId,
      {
        aum = 0.0;
        nav = 1.0;
        totalShares = 0.0;
        accruedFees = 0.0;
        lastUpdated = Time.now();
        historicalAUM = [];
      },
    );

    fundCreators := fundMap.put(fundCreators, fundId, caller);

    fundId;
  };

  // Public read access for marketplace discovery
  public query func getFundConfig(fundId : FundId) : async ?FundConfig {
    fundMap.get(funds, fundId);
  };

  // Public read access for marketplace discovery
  public query func getFundState(fundId : FundId) : async ?FundState {
    fundMap.get(fundStates, fundId);
  };

  // Timelock System
  public shared ({ caller }) func proposeTimelockChange(fundId : FundId, newConfig : FundConfig, delaySeconds : Nat) : async Nat {
    if (not (canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only fund creators or admins can propose changes");
    };

    let proposalId = nextProposalId;
    nextProposalId += 1;

    let proposal : TimelockProposal = {
      id = proposalId;
      fundId;
      proposedConfig = newConfig;
      proposer = caller;
      timestamp = Time.now();
      executeAfter = Time.now() + (delaySeconds * 1_000_000_000);
      status = #pending;
    };

    timelockProposals := natMap.put(timelockProposals, proposalId, proposal);
    proposalId;
  };

  public shared ({ caller }) func executeTimelockChange(proposalId : Nat) : async () {
    switch (natMap.get(timelockProposals, proposalId)) {
      case (null) { Debug.trap("Proposal not found") };
      case (?proposal) {
        if (Time.now() < proposal.executeAfter) {
          Debug.trap("Timelock period has not expired");
        };

        if (proposal.status != #pending) {
          Debug.trap("Proposal is not pending");
        };

        if (not (canManageFund(caller, proposal.fundId))) {
          Debug.trap("Unauthorized: Only fund creators or admins can execute changes");
        };

        funds := fundMap.put(funds, proposal.fundId, proposal.proposedConfig);

        let updatedProposal = {
          proposal with
          status = #executed;
        };
        timelockProposals := natMap.put(timelockProposals, proposalId, updatedProposal);
      };
    };
  };

  public shared ({ caller }) func cancelTimelockChange(proposalId : Nat) : async () {
    switch (natMap.get(timelockProposals, proposalId)) {
      case (null) { Debug.trap("Proposal not found") };
      case (?proposal) {
        if (caller != proposal.proposer and not canManageFund(caller, proposal.fundId)) {
          Debug.trap("Unauthorized: Only proposer or fund creator can cancel");
        };

        if (proposal.status != #pending) {
          Debug.trap("Proposal is not pending");
        };

        let updatedProposal = {
          proposal with
          status = #cancelled;
        };
        timelockProposals := natMap.put(timelockProposals, proposalId, updatedProposal);
      };
    };
  };

  // Public read access for transparency - but only for investors or managers
  public query ({ caller }) func getTimelockProposal(proposalId : Nat) : async ?TimelockProposal {
    switch (natMap.get(timelockProposals, proposalId)) {
      case (null) { null };
      case (?proposal) {
        // Allow viewing if caller is fund manager, investor, or admin
        if (not (canViewFundData(caller, proposal.fundId))) {
          Debug.trap("Unauthorized: Only fund managers, investors, or admins can view proposals");
        };
        ?proposal;
      };
    };
  };

  public query ({ caller }) func getFundTimelockProposals(fundId : FundId) : async [TimelockProposal] {
    if (not (canViewFundData(caller, fundId))) {
      Debug.trap("Unauthorized: Only fund managers, investors, or admins can view proposals");
    };

    Iter.toArray(
      Iter.filter(
        natMap.vals(timelockProposals),
        func(p : TimelockProposal) : Bool {
          p.fundId == fundId;
        },
      )
    );
  };

  // Transaction Processing
  public shared ({ caller }) func submitTransaction(fundId : FundId, amount : Float, txType : TransactionType) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only users can submit transactions");
    };

    switch (fundMap.get(funds, fundId)) {
      case (null) { Debug.trap("Fund not found") };
      case (?config) {
        if (config.isPaused) {
          Debug.trap("Fund is currently paused");
        };

        if (amount < Float.fromInt(config.minInvestment)) {
          Debug.trap("Amount below minimum investment");
        };

        // For redemptions, verify user has sufficient shares AT SUBMISSION TIME
        switch (txType) {
          case (#redemption) {
            let userShares = getInvestorShares(fundId, caller);
            if (userShares <= 0.0) {
              Debug.trap("Unauthorized: No shares owned in this fund");
            };
            
            switch (fundMap.get(fundStates, fundId)) {
              case (?state) {
                let maxWithdrawal = userShares * state.nav;
                if (amount > maxWithdrawal) {
                  Debug.trap("Unauthorized: Withdrawal amount exceeds share ownership");
                };
              };
              case (null) { Debug.trap("Fund state not found") };
            };
          };
          case (#deposit) {
            // Deposits allowed for any authenticated user
          };
        };

        let txId = nextTxId;
        nextTxId += 1;

        let transaction : Transaction = {
          id = txId;
          fundId;
          user = caller;
          amount;
          shares = 0.0;
          txType;
          status = #pending;
          timestamp = Time.now();
        };

        transactions := natMap.put(transactions, txId, transaction);
        txId;
      };
    };
  };

  public shared ({ caller }) func processTransaction(txId : Nat) : async () {
    if (not (isAdminOrHasRole(caller, #processor))) {
      Debug.trap("Unauthorized: Only processors can process transactions");
    };

    switch (natMap.get(transactions, txId)) {
      case (null) { Debug.trap("Transaction not found") };
      case (?tx) {
        if (tx.status != #pending) {
          Debug.trap("Transaction is not pending");
        };

        switch (fundMap.get(fundStates, tx.fundId)) {
          case (null) { Debug.trap("Fund state not found") };
          case (?state) {
            let shares = tx.amount / state.nav;
            
            // CRITICAL: Re-verify redemption authorization at processing time
            switch (tx.txType) {
              case (#redemption) {
                let currentShares = getInvestorShares(tx.fundId, tx.user);
                if (currentShares < shares) {
                  Debug.trap("Unauthorized: Insufficient shares for redemption at processing time");
                };
              };
              case (#deposit) {
                // No additional check needed for deposits
              };
            };
            
            // Update investor shares
            let currentShares = getInvestorShares(tx.fundId, tx.user);
            let newShares = switch (tx.txType) {
              case (#deposit) { currentShares + shares };
              case (#redemption) { currentShares - shares };
            };
            
            investorShares := investorMap.put(investorShares, (tx.fundId, tx.user), newShares);

            let updatedTx = {
              tx with
              shares = shares;
              status = #processed;
            };
            transactions := natMap.put(transactions, txId, updatedTx);
          };
        };
      };
    };
  };

  public shared ({ caller }) func cancelTransaction(txId : Nat) : async () {
    switch (natMap.get(transactions, txId)) {
      case (null) { Debug.trap("Transaction not found") };
      case (?tx) {
        if (caller != tx.user and not AccessControl.isAdmin(accessControlState, caller)) {
          Debug.trap("Unauthorized: Only transaction owner or admin can cancel");
        };

        if (tx.status != #pending) {
          Debug.trap("Transaction is not pending");
        };

        let updatedTx = {
          tx with
          status = #cancelled;
        };
        transactions := natMap.put(transactions, txId, updatedTx);
      };
    };
  };

  public query ({ caller }) func getTransaction(txId : Nat) : async ?Transaction {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view transactions");
    };

    switch (natMap.get(transactions, txId)) {
      case (null) { null };
      case (?tx) {
        // Allow viewing if caller is transaction owner, fund manager, investor in fund, or admin
        if (caller != tx.user and not canViewFundData(caller, tx.fundId)) {
          Debug.trap("Unauthorized: Can only view your own transactions or transactions in funds you manage/invest in");
        };
        ?tx;
      };
    };
  };

  public query ({ caller }) func getFundTransactions(fundId : FundId) : async [Transaction] {
    // Allow fund managers, investors, processors, and admins to view fund transactions
    if (not (canViewFundData(caller, fundId))) {
      Debug.trap("Unauthorized: Only fund managers, investors, processors, and admins can view fund transactions");
    };

    Iter.toArray(
      Iter.filter(
        natMap.vals(transactions),
        func(tx : Transaction) : Bool {
          tx.fundId == fundId;
        },
      )
    );
  };

  public query ({ caller }) func getMyTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view transactions");
    };

    Iter.toArray(
      Iter.filter(
        natMap.vals(transactions),
        func(tx : Transaction) : Bool {
          tx.user == caller;
        },
      )
    );
  };

  public query ({ caller }) func getMyFundPosition(fundId : FundId) : async Float {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view positions");
    };
    
    // Return shares even if zero - user is authenticated
    getInvestorShares(fundId, caller);
  };

  public query ({ caller }) func getMyInvestedFunds() : async [FundId] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view invested funds");
    };

    var investedFunds : [FundId] = [];
    for ((key, shares) in investorMap.entries(investorShares)) {
      let (fundId, investor) = key;
      if (investor == caller and shares > 0.0) {
        investedFunds := Array.append(investedFunds, [fundId]);
      };
    };
    investedFunds;
  };

  public query ({ caller }) func getMyPortfolioSummary() : async [(FundId, Float, Float)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view portfolio");
    };

    var portfolio : [(FundId, Float, Float)] = [];
    for ((key, shares) in investorMap.entries(investorShares)) {
      let (fundId, investor) = key;
      if (investor == caller and shares > 0.0) {
        let value = switch (fundMap.get(fundStates, fundId)) {
          case (?state) { shares * state.nav };
          case (null) { 0.0 };
        };
        portfolio := Array.append(portfolio, [(fundId, shares, value)]);
      };
    };
    portfolio;
  };

  // AUM Management
  public shared ({ caller }) func updateAUM(fundId : FundId, newAUM : Float) : async () {
    if (not (isAdminOrHasRole(caller, #aumUpdater) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only AUM updaters and fund creators can update AUM");
    };

    switch (fundMap.get(fundStates, fundId)) {
      case (null) { Debug.trap("Fund state not found") };
      case (?state) {
        let updatedState = {
          state with
          aum = newAUM;
          lastUpdated = Time.now();
          historicalAUM = Array.append(state.historicalAUM, [{ timestamp = Time.now(); aum = newAUM }]);
        };
        fundStates := fundMap.put(fundStates, fundId, updatedState);
      };
    };
  };

  public shared ({ caller }) func aggregateAUM(fundId : FundId) : async () {
    if (not (isAdminOrHasRole(caller, #aumUpdater) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only AUM updaters and fund creators can aggregate AUM");
    };

    var totalAUM : Float = 0.0;
    for (tx in natMap.vals(transactions)) {
      if (tx.fundId == fundId and tx.status == #processed) {
        switch (tx.txType) {
          case (#deposit) { totalAUM += tx.amount };
          case (#redemption) { totalAUM -= tx.amount };
        };
      };
    };

    switch (fundMap.get(fundStates, fundId)) {
      case (null) { Debug.trap("Fund state not found") };
      case (?state) {
        let updatedState = {
          state with
          aum = totalAUM;
          lastUpdated = Time.now();
          historicalAUM = Array.append(state.historicalAUM, [{ timestamp = Time.now(); aum = totalAUM }]);
        };
        fundStates := fundMap.put(fundStates, fundId, updatedState);
      };
    };
  };

  // Fee Management
  public query ({ caller }) func calculateFees(fundId : FundId) : async Float {
    // Restrict to fund managers, admins, and investors
    if (not (canViewFundData(caller, fundId))) {
      Debug.trap("Unauthorized: Only fund managers, investors, or admins can calculate fees");
    };

    switch (fundMap.get(funds, fundId)) {
      case (null) { Debug.trap("Fund not found") };
      case (?config) {
        switch (fundMap.get(fundStates, fundId)) {
          case (null) { Debug.trap("Fund state not found") };
          case (?state) {
            let managementFees = state.aum * config.managementFee;
            let performanceFees = if (state.nav > config.highWaterMark) {
              (state.nav - config.highWaterMark) * config.performanceFee;
            } else { 0.0 };
            managementFees + performanceFees;
          };
        };
      };
    };
  };

  public shared ({ caller }) func collectFees(fundId : FundId) : async () {
    if (not (isAdminOrHasRole(caller, #processor) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only admins, processors, and fund creators can collect fees");
    };

    switch (fundMap.get(fundStates, fundId)) {
      case (null) { Debug.trap("Fund state not found") };
      case (?state) {
        let updatedState = {
          state with
          accruedFees = 0.0;
          lastUpdated = Time.now();
        };
        fundStates := fundMap.put(fundStates, fundId, updatedState);
      };
    };
  };

  // Emergency Controls
  public shared ({ caller }) func pauseFund(fundId : FundId) : async () {
    if (not (isAdminOrHasRole(caller, #guardian) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only guardians and fund creators can pause funds");
    };

    switch (fundMap.get(funds, fundId)) {
      case (null) { Debug.trap("Fund not found") };
      case (?config) {
        let updatedConfig = {
          config with
          isPaused = true;
        };
        funds := fundMap.put(funds, fundId, updatedConfig);
      };
    };
  };

  public shared ({ caller }) func resumeFund(fundId : FundId) : async () {
    if (not (isAdminOrHasRole(caller, #guardian) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only guardians and fund creators can resume funds");
    };

    switch (fundMap.get(funds, fundId)) {
      case (null) { Debug.trap("Fund not found") };
      case (?config) {
        let updatedConfig = {
          config with
          isPaused = false;
        };
        funds := fundMap.put(funds, fundId, updatedConfig);
      };
    };
  };

  public shared ({ caller }) func emergencyWithdraw(fundId : FundId) : async () {
    if (not (isAdminOrHasRole(caller, #guardian) or canManageFund(caller, fundId))) {
      Debug.trap("Unauthorized: Only guardians and fund creators can trigger emergency withdrawals");
    };

    switch (fundMap.get(funds, fundId)) {
      case (null) { Debug.trap("Fund not found") };
      case (?config) {
        let updatedConfig = {
          config with
          isPaused = true;
        };
        funds := fundMap.put(funds, fundId, updatedConfig);
      };
    };
  };

  // Transparency and Reporting - Public access for marketplace
  public query func getAllFunds() : async [(FundId, FundConfig)] {
    // Public access for marketplace discovery - no authentication required
    Iter.toArray(fundMap.entries(funds));
  };

  public query func getAllFundStates() : async [(FundId, FundState)] {
    // Public access for marketplace discovery - no authentication required
    Iter.toArray(fundMap.entries(fundStates));
  };

  public query ({ caller }) func getPendingTransactions() : async [Transaction] {
    if (not (isAdminOrHasRole(caller, #processor))) {
      Debug.trap("Unauthorized: Only admins and processors can view all pending transactions");
    };

    Iter.toArray(
      Iter.filter(
        natMap.vals(transactions),
        func(tx : Transaction) : Bool {
          tx.status == #pending;
        },
      )
    );
  };

  public query ({ caller }) func getMyPendingTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Debug.trap("Unauthorized: Only authenticated users can view transactions");
    };

    Iter.toArray(
      Iter.filter(
        natMap.vals(transactions),
        func(tx : Transaction) : Bool {
          tx.user == caller and tx.status == #pending;
        },
      )
    );
  };

  // Marketplace View - Public access for fund discovery
  public query func getMarketplaceFunds() : async [(FundId, FundConfig, FundState)] {
    // Public access - no authentication required for marketplace browsing
    var result : [(FundId, FundConfig, FundState)] = [];
    for ((fundId, config) in fundMap.entries(funds)) {
      let state = switch (fundMap.get(fundStates, fundId)) {
        case (?s) { s };
        case (null) {
          {
            aum = 0.0;
            nav = 1.0;
            totalShares = 0.0;
            accruedFees = 0.0;
            lastUpdated = Time.now();
            historicalAUM = [];
          };
        };
      };
      result := Array.append(result, [(fundId, config, state)]);
    };
    result;
  };

  // Platform Fee Management
  public shared ({ caller }) func setPlatformFeeRate(newRate : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Debug.trap("Unauthorized: Only admins can set platform fee rate");
    };
    platformFeeRate := newRate;
  };

  public query func getPlatformFeeRate() : async Float {
    // Public read access - no authentication required
    platformFeeRate;
  };

  // File Storage Integration
  let storage = Storage.new();
  include MixinStorage(storage);

  // Track file references
  type Data = {
    id : Text;
    blob : Storage.ExternalBlob;
    name : Text;
  };
};
