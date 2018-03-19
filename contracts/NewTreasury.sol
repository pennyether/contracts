pragma solidity ^0.4.19;

// Requester needs to use the current Admin from Registry.
import "./roles/UsingAdmin.sol";

/*
	This is an abstract contract, inherited by Treasury, that manages
	creating, cancelling, and executing admin requests. It provides
	transparency, governence, as well as security.

	In the future, the Admin account can be set to be a DAO.
	
	A Request:
		- can only be created by Admin
		- can be cancelled by Admin, if not yet executed
		- can be executed after WAITING_TIME (1 week)
		- cannot be executed after TIMEOUT_TIME (2 weeks)
		- contains a type, target, and value
		- when executed, calls corresponding `execute${type}()` method
*/
contract Requester is
	UsingAdmin 
{
	uint32 public constant WAITING_TIME = 60*60*24*7;	// 1 week
	uint32 public constant TIMEOUT_TIME = 60*60*24*14;	// 2 weeks
	uint8 public constant MAX_PENDING_REQUESTS = 20;

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
	uint8 public numPendingRequests;

	// Events.
	event RequestCreated(uint time, uint indexed id, uint indexed typeId, address indexed target, uint value, string msg);
	event RequestCancelled(uint time, uint indexed id, uint indexed typeId, address indexed target, string msg);
	event RequestExecuted(uint time, uint indexed id, uint indexed typeId, address indexed target, bool success, string msg);


	function Requester(address _registry)
		UsingAdmin(_registry)
		public
	{ }

	// Creates a request, assigning it the next ID.
	function createRequest(uint _typeId, address _target, uint _value, string _msg)
		public
		fromAdmin
	{
		require(numPendingRequests < MAX_PENDING_REQUESTS);
		numPendingRequests++;

		uint32 _id = ++curRequestId;
		requests[_id].id = _id;
		requests[_id].typeId = uint8(RequestType(_typeId));
		requests[_id].dateCreated = uint32(now);
		requests[_id].createdMsg = _msg;
		requests[_id].target = _target;
		requests[_id].value = _value;
		RequestCreated(now, _id, _typeId, _target, _value, _msg);
	}

	// Cancels a request if it is not already cancelled or executed.
	function cancelRequest(uint32 _id, string _msg)
		public
		fromAdmin
	{
		// Require Request exists, is not cancelled, is not executed.
		Request storage r = requests[_id];
		require(r.id != 0 && r.dateCancelled == 0 && r.dateExecuted == 0);
		r.dateCancelled = uint32(now);
		r.cancelledMsg = _msg;
		numPendingRequests--;
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
		numPendingRequests--;
		RequestExecuted(now, r.id, r.typeId, r.target, _success, _msg);
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
}

/*
The Treasury:
	- Manages profits:
		- Any funds received via fallback are profits.
		- Can distribute profits to Token at any time.
		- Pays a small reward to the caller of .distributeToToken()
	- Manages reserve:
		- Reserve only ever leaves to pay Token Holders for burning.
		- Is incremented at ICO, or when capital is raised.
	- Manages capital:
		- Capital is controlled via `Requester` governance.
		- Capital can be sent to Bankrollable contracts.
		- Capital can be recalled from Bankrollable contracts.
	- UI: https://www.pennyether.com/status/treasury

Roles:
	Owner:       can set Comptroller and Token addresses, once.
	Comptroller: can add and remove reserve.
	Admin:       can trigger requests.
	Token:       receives profits via .distributeToToken().
	Anybody:     can call .distributeToToken() for a .1% reward.
*/

// Allows Treasury to call Token.mintTokens()
interface _ITrComptroller {
	function mintTokens(address _to, uint _amount) public;
}
// Allows Treasury to add/remove capital to/from Bankrollable instances.
interface _ITrBankrollable {
	function isBankrollable() public pure returns (bool _true);
	function removeBankroll(uint _amount) public;
	function addBankroll() payable public;
}

contract NewTreasury is 
	Requester
{
	// Settable once (by owner), address that dividends are sent to.
	address public token;
	// Settable once (by owner), address that can adjust reserve.
	address public comptroller;
	// Amount of Ether held in reserve, owned by Token Holders
	uint public reserve;
	
	// Capital.
	uint public capital;			// The amount of capital remaining.
	uint public capitalRaised;		// The amount of capital raised via .buyTokens()
	uint public capitalTarget;		// If capitalTarget > capitalRaised, tokens can be purchased.
	uint public capitalUtilized;	// Increased when sent, decreased when recalled.

	// Profits and distributions.
	uint public currentProfits;		// Current profits able to be sent
	uint public totalRewarded;		// Total amount sent as reward.
	uint public totalDistributed;	// Total profits distributed.
	
	// .1% of profits distributed go to the caller of .distributeToToken()
	uint public constant DISTRIBUTE_REWARD_DENOM = 1000;

	// for functions only callable by Comptroller
	modifier fromComptroller() { require(msg.sender==comptroller); _; }

	// EVENTS
	// Admin triggered events
	event TokenSet(uint time, address sender, address token);
	event ComptrollerSet(uint time, address sender, address comptroller);
	// capital-related events
	event CapitalAdded(uint time, address indexed sender, uint amount);
	event CapitalRemoved(uint time, address indexed recipient, uint amount);
	event CapitalRaised(uint time, address indexed sender, uint amount);
	event CapitalRefunded(uint time, address indexed recipient, uint amount);
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
	event DistributeRewardPaid(uint time, address indexed recipient, uint amount);

	// `Requester` provides .fromAdmin() and requires implementation of:
	//   - executeSendCapital
	//   - executeRecallCapital
	//   - executeRaiseCapital
	function NewTreasury(address _registry)
		Requester(_registry)
		public
	{}


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
	// This sends the bankroll to the user.
	function removeFromReserve(uint _amount, address _recipient)
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
	// Can receive deposits from anyone (eg: PennyAuctions, other games)
	function () public payable {
		currentProfits += msg.value;
		ProfitsReceived(now, msg.sender, msg.value);
	}

	// Sends any surplus balance to the token, and a reward to the caller.
	function distributeToToken()
		public
		returns (uint _amountToDistribute)
	{
		// Load currentProfits to memory to save gas.
		uint _currentProfits = currentProfits;

		// Ensure there is a token to send profits to
		//  and that we have profits to distribute.
		if (token == address(0)) {
			DistributeFailure(now, "No address to distribute to.");
			return;
		}
		if (_currentProfits <= 0) {
			DistributeFailure(now, "No profits to distribute.");
			return;
		}

		// Calculate _reward and _amountToDistribute
		uint _reward = _currentProfits / DISTRIBUTE_REWARD_DENOM;
		_amountToDistribute = _currentProfits - _reward;

		// Set currentProfits to 0, send reward and amount.
		currentProfits = 0;
		require(msg.sender.call.value(_reward)());
		require(token.call.value(_amountToDistribute)());
		
		// Update stats, emit events
		totalRewarded += _reward;
		totalDistributed += _amountToDistribute;
		DistributeSuccess(now, token, _amountToDistribute);
		DistributeRewardPaid(now, msg.sender, _reward);
	}


	/*************************************************************/
	/*************** RAISING CAPITAL *****************************/
	/*************************************************************/	

	// If capitalTarget < capitalRaised, will sell tokens to caller.
	//
	// This mints tokens and dilutes everyone, including owners.
	// This aligns the owners with investors: there's no reason to 
	// raise funds unless they are needed.
	//
	// For each 1 Ether received:
	//  - will issue 1 Token to the sender.
	//  - will allocate .5 ETH as reserve.
	//  - will allocate .5 ETH as capital.
	function raiseCapital()
		public
		payable
		returns (uint _amount)
	{
		// If there's no token, we can't mint tokens.
		require(token != address(0));

		// Cap _amount to the amount we are raising.
		uint _amtRaisable = getAmountRaisable();
		_amount = msg.value < _amtRaisable ? msg.value : _amtRaisable;
		
		// Calculate how much goes to reserve and capital. (50/50)
		uint _reserve = _amount / 2;
		uint _capital = _amount - _reserve;

		// Increase reserve and capital, emit events.
		reserve += _reserve;
		capital += _capital;
		capitalRaised += _capital;
		ReserveAdded(now, msg.sender, _reserve);
		CapitalAdded(now, msg.sender, _capital);
		CapitalRaised(now, msg.sender, _capital);

		// Mint tokens for user, refund excess.
		_ITrComptroller(comptroller).mintTokens(msg.sender, _amount);
		if (msg.value > _amount) {
			uint _refund = msg.value - _amount;
			require(msg.sender.call.value(_refund)());
			CapitalRefunded(now, msg.sender, _refund);
		}
	}

	// This is called by Bankrollable contracts when we call .removeBankroll()
	// Simply adds capital.
	function removeBankrollCallback()
		public
		payable
	{
		addCapital();
	}

	// Anyone can (generously) add capital at any time.
	function addCapital()
		public
		payable
	{
		capital += msg.value;
		CapitalAdded(now, msg.sender, msg.value);
	}


	/*************************************************************/
	/*************** REQUESTER IMPLEMENTATION ********************/
	/*************************************************************/

	// Removes from capital, sends it to Bankrollable target.
	function executeSendCapital(address _target, uint _value)
		internal
		returns (bool _success, string _result)
	{
		// Fail if we do not have the capital available.
		if (_value > capital){
			return (false, "Not enough capital.");
		}
		// Ensure (somewhat) target is Bankrollable.
		_ITrBankrollable _bankrollable = _ITrBankrollable(_target);
		if (!_bankrollable.isBankrollable()) {
			// todo: this current throws. would instead like to catch it.
			return (false, "Target is not Bankrollable.");
		}

		// Decrease capital, and send it as bankroll.
		capital -= _value;
		capitalUtilized += _value;
		_bankrollable.addBankroll.value(_value)();
		ExecutedSendCapital(now, _bankrollable, _value);
		CapitalRemoved(now, _bankrollable, _value);
		return (true, "Sent bankroll to target.");
	}

	// Calls ".removeBankroll()" on Bankrollable target.
	function executeRecallCapital(address _target, uint _value)
		internal
		returns (bool _success, string _result)
	{
		// Ensure (somewhat) target is Bankrollabe.
		_ITrBankrollable _bankrollable = _ITrBankrollable(_target);
		if (!_bankrollable.isBankrollable()) {
			// todo: this throws. would instead like to detect it.
			return (false, "Target is not Bankrollable.");
		}

		// This should call this.removeBankrollCallback(), incrementing capital.
		// But we don't necessary trust _bankrollable here,
		//  so we look for `capital` to be increased (by any value).
		uint _prevCapital = capital;
		_bankrollable.removeBankroll(_value);
		uint _received = capital - _prevCapital;
		
		// Careful - bankrollable may have sent back any amount.
		if (_received <= capitalUtilized) capitalUtilized -= _received;
		else capitalUtilized = 0;

		// Emit and return
		ExecutedRecallCapital(now, _bankrollable, _received);
		return (true, "Received bankoll back from target.");
	}

	// Increases the capitalTarget amount
	function executeRaiseCapital(uint _value)
		internal
		returns (bool _success, string _result)
	{
		// If we can't mint tokens, don't increase the target.
		require(token != address(0));
		capitalTarget += _value;
		ExecutedRaiseCapital(now, _value);
		return (true, "Capital target raised.");
	}


	/*************************************************************/
	/*************** CONSTANTS ***********************************/
	/*************************************************************/

  	// returns reward to be received if distributeToToken() is called
  	function getDistributeReward()
  		public
  		constant
  		returns (uint)
  	{
  		return currentProfits / DISTRIBUTE_REWARD_DENOM;
  	}

  	function getAmountRaisable()
  		public
  		constant
  		returns (uint)
  	{
  		return capitalTarget > capitalRaised ? (capitalTarget - capitalRaised) * 2 : 0;
  	}
}