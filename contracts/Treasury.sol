pragma solidity ^0.4.19;

// Requester needs to use the current Admin from Registry.
import "./roles/UsingAdmin.sol";
import "./common/Ledger.sol";

/*
	This is an abstract contract, inherited by Treasury, that manages
	creating, cancelling, and executing admin requests that control
	capital. It provides transparency, governence, and security.

	In the future, the Admin account can be set to be a DAO.
	
	A Request:
		- can only be created by Admin
		- can be cancelled by Admin, if not yet executed
		- can be executed after WAITING_TIME (1 week)
		- cannot be executed after TIMEOUT_TIME (2 weeks)
		- contains a type, target, and value
		- when executed, calls corresponding `execute${type}()` method
*/
contract Requestable is
	UsingAdmin 
{
	uint32 public constant WAITING_TIME = 60*60*24*7;	// 1 week
	uint32 public constant TIMEOUT_TIME = 60*60*24*14;	// 2 weeks
	uint32 public constant MAX_PENDING_REQUESTS = 10;

	// Requests.
	enum RequestType {SendCapital, RecallCapital, RaiseCapital}
	struct Request {
		// Params to handle state and history.
		uint32 id;
		uint8 typeId;
		uint32 dateCreated;
		uint32 dateCancelled;
		uint32 dateExecuted;
		string createdMsg;
		string cancelledMsg;
		string executedMsg;
		bool executedSuccessfully;
		// Params for execution.
		address target;
		uint value;
	}
	mapping (uint32 => Request) public requests;
	uint32 public curRequestId;
	uint32[] public completedRequestIds;
	uint32[] public cancelledRequestIds;
	uint32[] public pendingRequestIds;

	// Events.
	event RequestCreated(uint time, uint indexed id, uint indexed typeId, address indexed target, uint value, string msg);
	event RequestCancelled(uint time, uint indexed id, uint indexed typeId, address indexed target, string msg);
	event RequestExecuted(uint time, uint indexed id, uint indexed typeId, address indexed target, bool success, string msg);


	function Requestable(address _registry)
		UsingAdmin(_registry)
		public
	{ }

	// Creates a request, assigning it the next ID.
	// Throws if there are already 8 pending requests.
	function createRequest(uint _typeId, address _target, uint _value, string _msg)
		public
		fromAdmin
	{
		uint32 _id = ++curRequestId;
		requests[_id].id = _id;
		requests[_id].typeId = uint8(RequestType(_typeId));
		requests[_id].dateCreated = uint32(now);
		requests[_id].createdMsg = _msg;
		requests[_id].target = _target;
		requests[_id].value = _value;
		_addPendingRequestId(_id);
		RequestCreated(now, _id, _typeId, _target, _value, _msg);
	}

	// Cancels a request.
	// Throws if already cancelled or executed.
	function cancelRequest(uint32 _id, string _msg)
		public
		fromAdmin
	{
		// Require Request exists, is not cancelled, is not executed.
		Request storage r = requests[_id];
		require(r.id != 0 && r.dateCancelled == 0 && r.dateExecuted == 0);
		r.dateCancelled = uint32(now);
		r.cancelledMsg = _msg;
		_removePendingRequestId(_id);
		cancelledRequestIds.push(_id);
		RequestCancelled(now, r.id, r.typeId, r.target, _msg);
	}

	// Executes (or times out) a request if it is not already cancelled or executed.
	// Note: This may revert if the executeFn() reverts. It'll timedout eventually.
	function executeRequest(uint32 _id)
		public
		fromAdmin
	{
		// Require Request exists, is not cancelled, is not executed.
		// Also require is past WAITING_TIME since creation.
		Request storage r = requests[_id];
		require(r.id != 0 && r.dateCancelled == 0 && r.dateExecuted == 0);
		require(uint32(now) > r.dateCreated + WAITING_TIME);
		
		// If request timed out, cancel it.
		if (uint32(now) > r.dateCreated + TIMEOUT_TIME) {
			cancelRequest(_id, "Request timed out.");
			return;
		}
				
		// Execute concrete method after setting as executed.
		r.dateExecuted = uint32(now);
		string memory _msg; bool _success;
		RequestType _type = RequestType(r.typeId);
		if (_type == RequestType.SendCapital) {
			(_success, _msg) = executeSendCapital(r.target, r.value);
		} else if (_type == RequestType.RecallCapital) {
			(_success, _msg) = executeRecallCapital(r.target, r.value);
		} else if (_type == RequestType.RaiseCapital) {
			(_success, _msg) = executeRaiseCapital(r.value);
		}

		// Save results, and emit.
		r.executedSuccessfully = _success;
		r.executedMsg = _msg;
		_removePendingRequestId(_id);
		completedRequestIds.push(_id);
		RequestExecuted(now, r.id, r.typeId, r.target, _success, _msg);
	}

	// Pushes id onto the array, throws if too many.
	function _addPendingRequestId(uint32 _id)
		private
	{
		require(pendingRequestIds.length != MAX_PENDING_REQUESTS);
		pendingRequestIds.push(_id);
	}

	// Removes id from array, reduces array length by one.
	// Throws if not found.
	function _removePendingRequestId(uint32 _id)
		private
	{
		// Find this id in the array, or throw.
		uint _len = pendingRequestIds.length;
		uint _foundIndex = MAX_PENDING_REQUESTS;
		for (uint _i=0; _i<_len; _i++) {
			if (pendingRequestIds[_i] == _id) {
				_foundIndex = _i;
				break;
			}
		}
		require(_foundIndex != MAX_PENDING_REQUESTS);

		// Swap last element to this index, then delete last element.
		pendingRequestIds[_foundIndex] = pendingRequestIds[_len-1];
		pendingRequestIds.length--;
	}

	// These methods must be implemented by Treasury /////////////////
	function executeSendCapital(address _target, uint _value)
		internal returns (bool _success, string _msg);

	function executeRecallCapital(address _target, uint _value)
		internal returns (bool _success, string _msg);

	function executeRaiseCapital(uint _value)
		internal returns (bool _success, string _msg);
	//////////////////////////////////////////////////////////////////

	// View that returns a Request as a valid tuple.
	// Sorry for the formatting, but it's a waste of lines otherwise.
	function getRequest(uint32 _requestId) public view returns (
		uint32 _id, uint8 _typeId, address _target, uint _value,
		bool _executedSuccessfully,
		uint32 _dateCreated, uint32 _dateCancelled, uint32 _dateExecuted,
		string _createdMsg, string _cancelledMsg, string _executedMsg		
	) {
		Request memory r = requests[_requestId];
		return (
			r.id, r.typeId, r.target, r.value,
			r.executedSuccessfully,
			r.dateCreated, r.dateCancelled, r.dateExecuted,
			r.createdMsg, r.cancelledMsg, r.executedMsg
		);
	}

	function isRequestExecutable(uint32 _requestId)
		public
		view
		returns (bool _isExecutable)
	{
		Request memory r = requests[_requestId];
		_isExecutable = (r.id>0 && r.dateCancelled==0 && r.dateExecuted==0);
		_isExecutable = _isExecutable && (uint32(now) > r.dateCreated + WAITING_TIME);
		return _isExecutable;
	}

	// Return the lengths of arrays.
	function numPendingRequests() public view returns (uint _num){
		return pendingRequestIds.length;
	}
	function numCompletedRequests() public view returns (uint _num){
		return completedRequestIds.length;
	}
	function numCancelledRequests() public view returns (uint _num){
		return cancelledRequestIds.length;
	}
}

/*

UI: https://www.pennyether.com/status/treasury

The Treasury manages 3 balances:

	* reserve: Ether strictly used to pay for a user burning tokens.
		- Is incremented by Comptroller after tokens are purchased.
		- Reserve only ever leaves to pay Token Holders for burning.

	* capital: Ether that can be sent to bankrollable contracts.
		- Is controlled via `Requester` governance, by the Admin (which is mutable)
			- Capital received by Comptroller is considered "capitalRaised".
			- A target amount can be set: "capitalRaisedTarget".
			- Comptroller will sell Tokens to reach capitalRaisedTarget.
		- Can be sent to Bankrollable contracts.
		- Can be recalled from Bankrollable contracts.
		- Allocation in-total and per-contract is available.

	* profits: Ether received via fallback fn. Can be sent to Token at any time.
		- Are received via fallback function, typically by bankrolled contracts.
		- Can be sent to Token at any time, by anyone, via .distributeToToken()

All Ether entering and leaving Treasury is allocated to one of the three balances.
Thus, the balance of Treasury will always equal: reserve + capital + profits.

Roles:
	Owner:       can set Comptroller and Token addresses, once.
	Comptroller: can add and remove reserve.
	Admin:       can trigger requests.
	Token:       receives profits via .distributeToToken().
	Anybody:     can call .distributeToToken() for a .1% reward.

*/
// Allows Treasury to add/remove capital to/from Bankrollable instances.
interface _ITrBankrollable {
	function removeBankroll(uint _amount, string _callbackFn) public;
	function addBankroll() payable public;
}

contract Treasury is
	Requestable
{
	// Address that can initToken and initComptroller
	address public owner;
	// Address that dividends are sent to. Settable once (by owner).
	address public token;
	// Address that can adjust reserve. Settable once (by owner).
	address public comptroller;

	// Balances
	uint public reserve;  // Ether held in reserve, owned by Token Holders.
	uint public capital;  // Ether held as capital. Spendable/Recoverable via Requests
	uint public profits;  // Ether received via fallback fn, distributable to Token.
	
	// Capital Management
	uint public capitalRaised;		  // The amount of capital raised from Comptroller.
	uint public capitalRaisedTarget;  // The target amount of capitalRaised.
	Ledger public capitalLedger;	  // Tracks capital sent per address

	// Stats
	uint public profitsSent;		  // Total profits ever sent.
	uint public profitsTotal;		  // Total profits ever received.

	// for functions only callable by Comptroller
	modifier fromComptroller() { require(msg.sender==comptroller); _; }
	modifier fromOwner(){ require(msg.sender==owner); _; }

	// EVENTS
	event Created(uint time);
	// Admin triggered events
	event TokenSet(uint time, address sender, address token);
	event ComptrollerSet(uint time, address sender, address comptroller);
	// capital-related events
	event CapitalAdded(uint time, address indexed sender, uint amount);
	event CapitalRemoved(uint time, address indexed recipient, uint amount);
	event CapitalRaised(uint time, uint amount);
	// reserve-related events
	event ReserveAdded(uint time, address indexed sender, uint amount);
	event ReserveRemoved(uint time, uint amount);
	// profit-related events
	event ProfitsReceived(uint time, address indexed sender, uint amount);
	// request-related events
	event ExecutedSendCapital(uint time, address indexed bankrollable, uint amount);
	event ExecutedRecallCapital(uint time, address indexed bankrollable, uint amount);
	event ExecutedRaiseCapital(uint time, uint amount);
	// distribution events
	event DistributeSuccess(uint time, address token, uint amount);
	event DistributeFailure(uint time, string msg);

	// `Requester` provides .fromAdmin() and requires implementation of:
	//   - executeSendCapital
	//   - executeRecallCapital
	//   - executeRaiseCapital
	function Treasury(address _registry, address _owner)
		Requestable(_registry)
		public
	{
		owner = _owner;
		capitalLedger = new Ledger(this);
		Created(now);
	}


	/*************************************************************/
	/*************** OWNER FUNCTIONS *****************************/
	/*************************************************************/

	// Callable once to set the Token address
	function initToken(address _token)
		public
		fromOwner
	{
		require(token == address(0));
		token = _token;
		TokenSet(now, msg.sender, _token);
	}

	// Callable once to set the Comptroller address
	function initComptroller(address _comptroller)
		public
		fromOwner
	{
		require(comptroller == address(0));
		comptroller = _comptroller;
		ComptrollerSet(now, msg.sender, _comptroller);	
	}
	

	/*************************************************************/
	/******* RESERVE FUNCTIONS ***********************************/
	/*************************************************************/
	
	// Called by Comptroller after ICO to set reserve to half of numTokens.
	function addReserve()
		public
		payable
		fromComptroller
	{
		reserve += msg.value;
		ReserveAdded(now, msg.sender, msg.value);
	}

	// Comptroller calls this when somebody burns their tokens.
	// This sends the reserve to the user.
	function removeReserve(uint _amount, address _recipient)
		public
		fromComptroller
	{
		assert(reserve >= _amount && this.balance >= _amount);
		reserve -= _amount;
		require(_recipient.call.value(_amount)());
		ReserveRemoved(now, _amount);
	}


	/*************************************************************/
	/******* PROFITS AND DISTRIBUTING ****************************/
	/*************************************************************/

	// Can receive Ether from anyone. Typically Bankrollable contracts' profits.
	function () public payable {
		profits += msg.value;
		profitsTotal += msg.value;
		ProfitsReceived(now, msg.sender, msg.value);
	}

	// Sends profits to Token
	function distributeToToken()
		public
		returns (uint _profits)
	{
		// Ensure token is set.
		if (token == address(0)) {
			DistributeFailure(now, "No address to distribute to.");
			return;
		}

		// Load _profits to memory (saves gas), and ensure there are profits.
		_profits = profits;
		if (_profits <= 0) {
			DistributeFailure(now, "No profits to distribute.");
			return;
		}

		// Set profits to 0, and send to Token
		profits = 0;
		profitsSent += _profits;
		require(token.call.value(_profits)());
		DistributeSuccess(now, token, _profits);
	}


	/*************************************************************/
	/*************** ADDING CAPITAL ******************************/
	/*************************************************************/	

	// Anyone can add capital at any time.
	// If it comes from Comptroller, it counts as capitalRaised.
	function addCapital()
		public
		payable
	{
		capital += msg.value;
		if (msg.sender == comptroller) {
			capitalRaised += msg.value;
			CapitalRaised(now, msg.value);
		}
		CapitalAdded(now, msg.sender, msg.value);
	}


	/*************************************************************/
	/*************** REQUESTER IMPLEMENTATION ********************/
	/*************************************************************/

	// Removes from capital, sends it to Bankrollable target.
	function executeSendCapital(address _bankrollable, uint _value)
		internal
		returns (bool _success, string _result)
	{
		// Fail if we do not have the capital available.
		if (_value > capital)
			return (false, "Not enough capital.");
		// Fail if target is not Bankrollable
		if (!_hasCorrectTreasury(_bankrollable))
			return (false, "Bankrollable does not have correct Treasury.");

		// Decrease capital, increase bankrolled
		capital -= _value;
		capitalLedger.add(_bankrollable, _value);

		// Send it (this throws on failure). Then emit events.
		_ITrBankrollable(_bankrollable).addBankroll.value(_value)();
		CapitalRemoved(now, _bankrollable, _value);
		ExecutedSendCapital(now, _bankrollable, _value);
		return (true, "Sent bankroll to target.");
	}

	// Calls ".removeBankroll()" on Bankrollable target.
	function executeRecallCapital(address _bankrollable, uint _value)
		internal
		returns (bool _success, string _result)
	{
		// This should call .addCapital(), incrementing capital.
		uint _prevCapital = capital;
		_ITrBankrollable(_bankrollable).removeBankroll(_value, "addCapital()");
		uint _recalled = capital - _prevCapital;
		capitalLedger.subtract(_bankrollable, _recalled);
		
		// Emit and return
		ExecutedRecallCapital(now, _bankrollable, _recalled);
		return (true, "Received bankoll back from target.");
	}

	// Increases capitalRaisedTarget
	function executeRaiseCapital(uint _value)
		internal
		returns (bool _success, string _result)
	{
		// Increase target amount.
		capitalRaisedTarget += _value;
		ExecutedRaiseCapital(now, _value);
		return (true, "Capital target raised.");
	}


	/*************************************************************/
	/*************** PUBLIC VIEWS ********************************/
	/*************************************************************/

	function profitsTotal()
		public
		view
		returns (uint _amount)
	{
		return profitsSent + profits;
	}

  	// Returns the amount of capital needed to reach capitalRaisedTarget.
  	function capitalNeeded()
  		public
  		view
  		returns (uint _amount)
  	{
  		return capitalRaisedTarget > capitalRaised
  			? capitalRaisedTarget - capitalRaised
  			: 0;
  	}

  	// Returns the total amount of capital allocated
  	function capitalAllocated()
  		public
  		view
  		returns (uint _amount)
  	{
  		return capitalLedger.total();
  	}

  	// Returns amount of capital allocated to an address
  	function capitalAllocatedTo(address _addr)
  		public
  		view
  		returns (uint _amount)
  	{
  		return capitalLedger.balanceOf(_addr);
  	}

  	// Returns the full capital allocation table
  	function capitalAllocation()
  		public
  		view
  		returns (address[] _addresses, uint[] _amounts)
  	{
  		// Not available until Solidity 0.4.22
  		// return capitalLedger.balances();
  	}

  	// Returns if _addr.getTreasury() returns this address.
  	// This is not fool-proof, but should prevent accidentally
  	//  sending capital to non-bankrollable addresses.
  	function _hasCorrectTreasury(address _addr)
        private
        returns (bool)
    {
        bytes32 _sig = bytes4(keccak256("getTreasury()"));
        bool _success;
        address _response;
        assembly {
            let x := mload(0x40)    // get free memory
            mstore(x, _sig)         // store signature into it
            // store if call was successful
            _success := call(
                10000,  // 10k gas
                _addr,  // to _addr
                0,      // 0 value
                x,      // input is x
                4,      // input length is 4
                x,      // store output to x
                32      // store first return value
            )
            // store first return value to _response
            _response := mload(x)
        }
        return _success ? _response == address(this) : false;
    }
}