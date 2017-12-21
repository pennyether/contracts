pragma solidity ^0.4.19;
interface IPennyAuctionController {
	function refreshAuctions() public returns (uint _numAuctionsEnded, uint _feesCollected);
	function startDefinedAuction(uint _index) payable public returns (bool _success, address _auction);
	function numDefinedAuctions() public constant returns(uint);
	function getNumEndedAuctions() public constant returns (uint _numEndedAuctions);
	function getAvailableFees() public constant returns (uint _feesAvailable);
	function getInitialPrize(uint _index) public constant returns (uint);
	function getIsStartable(uint _index) public constant returns (bool);
}