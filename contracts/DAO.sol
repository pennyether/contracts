pragma solidity ^0.4.19;

/*

  SUMMARY
  ------------------------------------------------------------------

  The DAO will have special permissions on contracts in the
  PennyEther system. It allows PENNY Token holders to cast votes
  on Propositions which, when passed, will cause the DAO to execute
  a call to a contract.


  VOTE TOKENS
  ------------------------------------------------------------------

  The DAO accepts PENNY Tokens and mints VOTE tokens in exchange.
  The DAO will transfer all dividends accrued from held PENNY tokens
  directly to the VOTE token contract. This means that VOTE tokens
  will pay dividends just the same as PENNY tokens would.
  
  However, VOTE Tokens have three special properties:

    1) They are frozen, and thus cannot be transferred.
    2) They can be burned in exchange for PENNY tokens.
    3) They can be used to cast votes for or against a Proposition


  PROPOSITIONS
  ------------------------------------------------------------------

  A Proposition can be created by anyone. A Proposition, if passed,
  will cause the DAO to execute a transaction to another contract
  with arbitrary data. (No `value` is ever sent, as the DAO does not
  ever collect Ether.) The DAO is only particular useful if granted
  special permissions to that contract, otherwise it is pointless.

  A Proposition contains the following data:
    1) An ID
    2) A target contract
    3) Data (used for target.call(<data>))
    4) Method Name (for transparency, verfied against data)
    5) Metadata: description, dateCreated, dateExecuted, etc.

  A Proposition is "passed" if the following are true:
    1) At least MIN_VOTE_PERIOD has elapsed since its creation date.
    2) The difference between _for_ votes and _against_ votes is 
        greater than PASS_PCT of the total supply of PENNY.

  A Proposition is "failed" if not passed within MAX_VOTE_PERIOD.

  A Proposition's lifecycle looks like the following:

        created (pending) -> passed and executed
                         \-> failed

  It should be noted that the values of PASS_PCT, MIN_VOTE_PERIOD,
  and MAX_VOTE_PERIOD are able to be changed by Propositions.
  They are initialized to 20%, 1 week, and 3 weeks, respectively.


  VOTING
  ------------------------------------------------------------------

  A VOTE holder may cast their votes _for_ or _against_ any number
  of propositions at a time. However, doing so will increase the gas
  required to burn their VOTE Tokens, since upon burning, votes cast
  by the token holder toward pending Propositions may need to be
  reduced.

  A VOTE holder can periodically call "purgeOldVotes" to remove any
  votes cast towards non-pending Propositions. This is called
  automatically upon burning any amount of VOTE tokens, and may
  require an unlimited amount of gas -- so VOTE holders should be
  careful not to vote on too many Propositions at once.

  To prevent the spamming of malicious Propositions, which could
  require VOTE holders to vote against (and cause purging to become
  expensive), it costs 1 VOTE to create a proposition. This is
  refunded if the Proposition passes.

*/
contract DAO {
    DividendToken public voteToken;
    DividendToken public pennyToken;

    struct Proposition {
        // first 256-bit chunk
        uint32 id;
        uint32 dateCreated;
        uint32 dateExecuted;
        address target;
        // callData and descriptions
        bytes callData;
        string method;
        string description;
        // vote tallies
        uint votesFor;
        uint votesAgainst;
        mapping (address => int) votes;
        // creator, and tokensHeld
        address creator;
        uint tokensHeld;
        // comments
        uint32 curCommentId;
        mapping (uint32 => string) comments;
    }
    mapping (uint32=>Proposition) propositions;
    uint32 public curPropId;

    // Tokens held per account, from creating Propositions
    mapping (address=>uint) public tokensHeld;
    // An array of proposition IDs that the account has voted on.
    mapping (address=>uint) public propsVotedOn;
    mapping (address=>uint) public propsCreated;


    // Variables. Changable via Propositions.
    uint CREATE_PROP_COST = 1e18;

    // Variables changed events
    event CreatePropCostChanged(uint time, uint oldValue, uint newValue);
    // Deposit / Withdraw
    event Deposited(uint time, address indexed account, uint amount, uint balance);
    event Withdrew(uint time, address indexed account, uint amount, uint balance);
    // Proposition Workflow
    // event CreatePropSuccess(uint time, uint indexed propId, address indexed account, address indexed target);
    // event CreatePropFailure(uint time, address indexed account, string msg);
    // event VoteOnPropSuccess(uint time, uint indexed propId, address indexed account, bool for, uint amount);
    // event VoteOnPropFailure(uint time, address indexed account, string msg);
    // event ExecutePropSuccess(uint time, address indexed propId, address indexed target, bool executeSuccess);
    // event ExecutePropFailure(uint time, address indexed propId, string msg);
    // event FailPropSuccess(uint time, address indexed propId, address indexed target);
    // event FailPropFailure(uint time, address indexed propId, string msg);

    // Initialize the tokens, and freeze VOTE token.
    function DAO(address _pennyToken)
      public
    {
      pennyToken = DividendToken(_pennyToken);
      voteToken = new DividendToken("PennyEtherDAO", "VOTE");
      voteToken.freeze(true);
    }


    /*********************************************************************/
    /***** DEPOSITS, WITHDRAWS, AND DIVIDENDS ****************************/
    /*********************************************************************/
    // When a user deposits their tokens (via transferAndCall) they are issued
    //  vote tokens. Any dividends this contract accrues from PENNY are sent to
    //  the VOTE contract, which ensures what users who have deposited PENNY
    //  receive (roughly) the same amount of dividends.
    // We think the brevity of this section is pretty cool.

    // Any funds received are distributed to VOTE token holders.
    function () public payable {
        require(voteToken.call.value(msg.value)());
    }

    // Collects dividends on behalf of all VOTE token holders.
    // This will trigger (), which sends the dividends to VOTE Token.
    function distribute()
        public
    {
        pennyToken.collectOwedDividends();
    }

    // Called by PennyToken after a transferAndCall().
    // This mints the equivalent amount of voteTokens.
    function tokenFallback(address _account, uint _amount, bytes _data)
        public
    {
        require(msg.sender == address(pennyToken));
        voteToken.mint(_account, _amount);
        Deposited(now, _account, _amount, voteToken.balanceOf(_account));
    }

    // Converts up to _tokensAvailable() VOTE into PENNY.
    function withdraw(uint _amount)
        public
    {
        address _account = msg.sender;
        uint _available = _tokensAvailable(_account);
        if (_amount > _available) _amount = _available;

        voteToken.burn(_account, _amount);
        pennyToken.transfer(_account, _amount);
        Withdrew(now, _account, _amount, voteToken.balanceOf(_account));
    }

    // Creating and voting on propositions is a WIP.
    // This will completed with community support at a later time.

    // /*********************************************************************/
    // /***** "ADMIN" METHODS ***********************************************/
    // /*********************************************************************/
    // // These methods are only callabe by this contract.

    // function setCreatePropCost(uint _amount)
    //     external
    // {
    //     require(msg.sender == address(this));
    //     // Prevent the DAO from being rendered useless.
    //     require(_amount < 1000e18);
    //     CreatePropCostChanged(now, CREATE_PROP_COST, _amount);
    //     CREATE_PROP_COST = _amount; 
    // }


    // /*********************************************************************/
    // /***** PROPOSITIONS **************************************************/
    // /*********************************************************************/
    // function createProposition(address _target, bytes _callData, string _method, string _description)
    //     public
    //     returns (bool _success)
    // {
    //     address _creator = msg.sender;
    //     uint _available = _tokensAvailable(_creator);
    //     uint _cost = CREATE_PROP_COST;
    //     if (_cost > _available) {
    //         CreatePropositionFailure(now, _creator, "Not enough available VOTE tokens.");
    //         return;
    //     }
    //     uint _propsCreated = propsCreated[_creator];
    //     uint _propsCreatedIndex = _arr32Len(_propsCreated) + 1;
    //     if (_propsCreatedIndex > 8) {
    //         CreatePropositionFailure(now, _creator, "Max amount of Propositions created.");
    //         return;   
    //     }

    //     // increment id, tokensHeld, and propsCreated
    //     uint32 _propId = curPropId + 1;
    //     curPropId = _propId;
    //     tokensHeld[_creator] += _cost;
    //     propsCreated[_creator] = _arr32Write(_propsCreated, _propId, _propsCreatedIndex);

    //     // create proposition
    //     _createProp(_propId, _creator, _cost, _target, _callData, _method, _description);
    //     CreatePropositionSuccess(now, _creator, _propId);
    // }

    // function _createProp(
    //     uint32 _id,
    //     address _creator,
    //     uint _cost,
    //     address _target,
    //     bytes _callData,
    //     string _method,
    //     string _description
    // )
    //     private
    // {
    //     uint32 _now = uint32(now);
    //     Proposition storage p = propositions[_id];
    //     p.id = _id;
    //     p.dateCreated = _now;
    //     p.target = _target;
    //     p.callData = _callData;
    //     p.method = _method;
    //     p.description = _description;
    //     p.creator = _creator;
    //     p.tokensHeld = _cost;
    // }

    // // add/remove/edit an account's vote on a proposition
    // function voteOnProposition(uint32 _id, int _amount)
    //     public
    //     returns (bool _success)
    // {
    //     // Check to see if they have any balance
    //     address _voter = msg.sender;
    //     uint _available = _tokensAvailable(_voter);
    //     if (_amount == 0) {
    //         VoteOnPropFailure(now, _voter, "You have no available VOTE tokens");
    //         return;
    //     }

    //     // Check to see if they've voted on it already
    //     uint _propsVotedOn = propsVotedOn[_account]
    //     bool _hasVoted;
    //     uint _propVotedOnIndex;
    //     (_hasVoted, _propVotedOnIndex) = _arr32Contains(_propsVotedOn, _id);
    // }

    // // This should be called internally on all pending props
    // //  after a user burns their tokens to reduce their votes.
    // function _setVote(address _account, uint32 _id, int _amount)
    //     private
    //     returns (bool _success, string _error)
    // {
    //     // if they've already voted the same amount, do nothing.
    //     // if they're removing their vote
    //     //   - remove from propsVotedOn
    //     //   - reduce p.votesFor or p.votesAgainst
    //     //   - write p.votes[_accounts] = 0
    //     // if they're adding their vote
    //     //   - add to propsVotedOn (or return false)
    //     //   - increase p.votesFor or p.votesAgainst
    //     //   - write p.votes[_accounts] = _votes
    //     // if they're changing their vote
    //     //   - properly update p.votesFor or p.votesAgainst
    //     //   - write p.votes[_accounts] = _votes
    //     //   - do not change propsVotedOn
    // }

    // // For each prop voted on:
    // //   If it's pending, ensure amount this user voted is < balance
    // //   If it's not pending, remove from propsVotedOn
    // function _updateVotes(address _account) {

    // }


    // /*********************************************************************/
    // /***** ARR32 UTLIITY *************************************************/
    // /*********************************************************************/
    // // These functions allow you to store 8 NON-ZERO uint32s in a single uint.
    // // This is tremendously gas-efficient, but is slightly annoying to use.

    // // Writes to a location in the array. Throws if not empty.
    // // ~500 gas
    // function _arr32Write(uint _arr, uint32 _val, uint _index)
    //     private
    //     pure
    //     returns (uint _newArr)
    // {
    //     assert(_index <= 7);
    //     assert(_arr32At(_arr, _index) == 0);
    //     return _arr |= uint(_val) << _index*32;
    // }

    // // Removes item from array.
    // // ~650 gas
    // function _arr32Remove(uint _arr, uint _index)
    //     private
    //     pure
    //     returns (uint _newArr)
    // {
    //     // Get everything to the right of this slot.
    //     uint _right = _arr & 2**(_index * 32)-1;
    //     // Get everything to the left of this slot.
    //     uint _left = _index == 7 ? 0 : _arr & ~(2**(_index*32+32)-1);
    //     // Shift left over one slot, combine with the right.
    //     return (_left >> 32) | _right;
    // }

    // // Max 1400 gas
    // function _arr32Len(uint _arr)
    //     private
    //     pure
    //     returns (uint _num)
    // {
    //     // Check to see if a bit is set above slot of 32 bits.
    //     uint _index = 0;
    //     while (_index < 8) {
    //         if (_arr < 2**(_index*32)) return _index;
    //         _index++;
    //     }
    //     return _index;
    // }

    // // ~400 gas
    // function _arr32At(uint _arr, uint _index)
    //     private
    //     pure
    //     returns (uint32)
    // {
    //     // Create a 32-bit mask, shift to the index, get value, shift right.
    //     assert(_index < 8);
    //     return uint32((_arr & (uint(0xFFFFFFFF) << _index*32)) >> _index*32);
    // }
    
    // // Max 2200 gas. Not sure why so expensive.
    // function _arr32Contains(uint _arr, uint32 _val)
    //     private
    //     pure
    //     returns (bool _contains, uint _index)
    // {
    //     // Check each value, return if found.
    //     uint32 _valAtIndex;
    //     _i = 0;
    //     while (_i < 8) {
    //         _valAtIndex = _arr32At(_arr, _i);
    //         if (_valAtIndex == 0) return;
    //         if (_valAtIndex == _val) return (true, _i);
    //         _i++;
    //     }
    // }

    // // Max 3300 gas
    // function _arr32ToArray(uint _arr)
    //     private
    //     pure
    //     returns (uint32[] _array)
    // {
    //     uint _len = _arr32Len(_arr);
    //     _array = new uint32[](_len);
    //     uint _index = 0;
    //     while (_index < _len) {
    //         _array[_index] = _arr32At(_arr, _index);
    //         _index++;
    //     }
    // }



    // /*********************************************************************/
    // /***** PRIVATE VIEWS *************************************************/
    // /*********************************************************************/

    // // Number of tokens available to be burned.
    function _tokensAvailable(address _account)
        private
        returns (uint _amount)
    {
        uint _deposited = voteToken.balanceOf(_account);
        uint _held = tokensHeld[_account];
        assert(_deposited >= _held);
        return _deposited - _held;
    }
}

import "./DividendToken.sol";