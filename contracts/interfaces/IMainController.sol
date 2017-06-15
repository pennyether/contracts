pragma solidity ^0.4.0;
contract IMainController {
  function createPennyAuction(uint _initialPrize,
	    					 	uint _bidPrice,
	    					 	uint _bidTimeS,
	    					 	uint _bidFeePct,
        					 	uint _auctionTimeS) returns (address _pennyAuction);
  function updatePennyAuctions();
  function changePennyAuctionSettings();
}