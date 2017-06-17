pragma solidity ^0.4.0;
contract IMainController {
  function createPennyAuction(uint _initialPrize,
	    					 	uint _bidPrice,
	    					 	uint _bidTimeS,
	    					 	uint _bidFeePct,
        					 	uint _auctionTimeS)
  	returns (bool _success, address _pennyAuction);

  function updatePennyAuctions() returns (bool _success, bool _didUpdate);
  function changePennyAuctionSettings() returns (bool _success);
}