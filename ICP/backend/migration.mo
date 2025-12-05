import OrderedMap "mo:base/OrderedMap";
import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Float "mo:base/Float";
import Time "mo:base/Time";
import Array "mo:base/Array";

module {
  type FundId = Nat;
  type FundConfig = {
    name : Text;
    managementFee : Float;
    performanceFee : Float;
    entranceFee : Float;
    exitFee : Float;
    minInvestment : Nat;
    isPaused : Bool;
    highWaterMark : Float;
    creatorMetadata : {
      website : Text;
      contactEmail : Text;
      description : Text;
      telegramHandle : ?Text;
    };
    baseToken : Text;
    autoDeposit : Bool;
    autoWithdrawal : Bool;
  };

  type FundState = {
    aum : Float;
    nav : Float;
    totalShares : Float;
    accruedFees : Float;
    lastUpdated : Time.Time;
    historicalAUM : [{
      timestamp : Time.Time;
      aum : Float;
    }];
  };

  type Transaction = {
    id : Nat;
    fundId : FundId;
    user : Principal;
    amount : Float;
    shares : Float;
    txType : { #deposit; #redemption };
    status : { #pending; #processed; #cancelled };
    timestamp : Time.Time;
  };

  type TimelockProposal = {
    id : Nat;
    fundId : FundId;
    proposedConfig : FundConfig;
    proposer : Principal;
    timestamp : Time.Time;
    executeAfter : Time.Time;
    status : { #pending; #executed; #cancelled };
  };

  type OldActor = {
    userProfiles : OrderedMap.Map<Principal, { name : Text }>;
    fundRoles : OrderedMap.Map<Principal, { #admin; #processor; #aumUpdater; #guardian }>;
    fundCreators : OrderedMap.Map<FundId, Principal>;
    investorShares : OrderedMap.Map<(FundId, Principal), Float>;
    funds : OrderedMap.Map<FundId, FundConfig>;
    fundStates : OrderedMap.Map<FundId, FundState>;
    transactions : OrderedMap.Map<Nat, Transaction>;
    timelockProposals : OrderedMap.Map<Nat, TimelockProposal>;
    nextFundId : FundId;
    nextTxId : Nat;
    nextProposalId : Nat;
    platformFeeRate : Float;
  };

  type NewActor = {
    userProfiles : OrderedMap.Map<Principal, { name : Text }>;
    fundRoles : OrderedMap.Map<Principal, { #admin; #processor; #aumUpdater; #guardian }>;
    fundCreators : OrderedMap.Map<FundId, Principal>;
    investorShares : OrderedMap.Map<(FundId, Principal), Float>;
    funds : OrderedMap.Map<FundId, FundConfig>;
    fundStates : OrderedMap.Map<FundId, FundState>;
    transactions : OrderedMap.Map<Nat, Transaction>;
    timelockProposals : OrderedMap.Map<Nat, TimelockProposal>;
    nextFundId : FundId;
    nextTxId : Nat;
    nextProposalId : Nat;
    platformFeeRate : Float;
  };

  public func run(old : OldActor) : NewActor {
    old;
  };
};
