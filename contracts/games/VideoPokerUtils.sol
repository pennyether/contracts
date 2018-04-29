pragma solidity ^0.4.23;

contract VideoPokerUtils {
    uint constant HAND_UNDEFINED = 0;
    uint constant HAND_RF = 1;
    uint constant HAND_SF = 2;
    uint constant HAND_FK = 3;
    uint constant HAND_FH = 4;
    uint constant HAND_FL = 5;
    uint constant HAND_ST = 6;
    uint constant HAND_TK = 7;
    uint constant HAND_TP = 8;
    uint constant HAND_JB = 9;
    uint constant HAND_HC = 10;
    uint constant HAND_NOT_COMPUTABLE = 11;

    /*****************************************************/
    /********** PUBLIC PURE FUNCTIONS ********************/
    /*****************************************************/

    // Gets a new 5-card hand, stored in uint32
    // Gas Cost: 3k
    function getHand(uint256 _hash)
        public
        pure
        returns (uint32)
    {
        // Return the cards as a hand.
        return uint32(getCardsFromHash(_hash, 5, 0));
    }

    // Both _hand and _draws store the first card in the
    //   rightmost position. _hand uses chunks of 6 bits.
    //
    // In the below example, hand is [9,18,35,12,32], and
    // the cards 18 and 35 will be replaced.
    //
    // _hand:                                [9,18,35,12,32]  
    //    encoding:    XX 100000 001100 100011 010010 001001
    //      chunks:           32     12     35     18      9
    //       order:        card5, card4, card3, card2, card1
    //     decimal:                                540161161
    //
    // _draws:                               card2 and card4
    //    encoding:   XXX      0      0      1      1      0
    //       order:        card5, card4, card3, card2, card1 
    //     decimal:                                        6
    // 
    // Gas Cost: Fixed 6k gas. 
    function drawToHand(uint256 _hash, uint32 _hand, uint _draws)
        public
        pure
        returns (uint32)
    {
        // Draws must be valid. If no hand, must draw all 5 cards.
        assert(_draws <= 31);
        assert(_hand != 0 || _draws == 31);
        // Shortcuts. Return _hand on no draws, or 5 cards on full draw.
        if (_draws == 0) return _hand;
        if (_draws == 31) return uint32(getCardsFromHash(_hash, 5, handToBitmap(_hand)));

        // Create a mask of 1's where new cards should go.
        uint _newMask;
        for (uint _i=0; _i<5; _i++) {
            if (_draws & 2**_i == 0) continue;
            _newMask |= 63 * (2**(6*_i));
        }
        // Create a mask of 0's where new cards should go.
        // Be sure to use only first 30 bits (5 cards x 6 bits)
        uint _discardMask = ~_newMask & (2**31-1);

        // Select from _newHand, discard from _hand, and combine.
        uint _newHand = getCardsFromHash(_hash, 5, handToBitmap(_hand));
        _newHand &= _newMask;
        _newHand |= _hand & _discardMask;
        return uint32(_newHand);
    }

    // Looks at a hand of 5-cards, determines strictly the HandRank.
    // Gas Cost: up to 7k depending on hand.
    function getHandRank(uint32 _hand)
        public
        pure
        returns (uint)
    {
        if (_hand == 0) return HAND_NOT_COMPUTABLE;

        uint _card;
        uint[] memory _valCounts = new uint[](13);
        uint[] memory _suitCounts = new uint[](5);
        uint _pairVal;
        uint _minNonAce = 100;
        uint _maxNonAce = 0;
        uint _numPairs;
        uint _maxSet;
        bool _hasFlush;
        bool _hasAce;

        // Set all the values above.
        // Note:
        //   _hasTwoPair will be true even if one pair is Trips.
        //   Likewise, _hasTrips will be true even if there are Quads.
        uint _i;
        uint _val;
        for (_i=0; _i<5; _i++) {
            _card = readFromCards(_hand, _i);
            if (_card > 51) return HAND_NOT_COMPUTABLE;
            
            // update val and suit counts, and if it's a flush
            _val = _card % 13;
            _valCounts[_val]++;
            _suitCounts[_card/13]++;
            if (_suitCounts[_card/13] == 5) _hasFlush = true;
            
            // update _hasAce, and min/max value
            if (_val == 0) {
                _hasAce = true;
            } else {
                if (_val < _minNonAce) _minNonAce = _val;
                if (_val > _maxNonAce) _maxNonAce = _val;
            }

            // update _pairVal, _numPairs, _maxSet
            if (_valCounts[_val] == 2) {
                if (_numPairs==0) _pairVal = _val;
                _numPairs++;
            } else if (_valCounts[_val] == 3) {
                _maxSet = 3;
            } else if (_valCounts[_val] == 4) {
                _maxSet = 4;
            }
        }

        if (_numPairs > 0){
            // If they have quads, they can't have royal flush, so we can return.
            if (_maxSet==4) return HAND_FK;
            // One of the two pairs was the trips, so it's a full house.
            if (_maxSet==3 && _numPairs==2) return HAND_FH;
            // Trips is their best hand (no straight or flush possible)
            if (_maxSet==3) return HAND_TK;
            // Two pair is their best hand (no straight or flush possible)
            if (_numPairs==2) return HAND_TP;
            // One pair is their best hand (no straight or flush possible)
            if (_numPairs == 1 && (_pairVal >= 10 || _pairVal==0)) return HAND_JB;
            // They have a low pair (no straight or flush possible)
            return HAND_HC;
        }

        // They have no pair. Do they have a straight?
        bool _hasStraight = _hasAce
            // Check for: A,1,2,3,4 or 9,10,11,12,A
            ? _maxNonAce == 4 || _minNonAce == 9
            // Check for X,X+1,X+2,X+3,X+4
            : _maxNonAce - _minNonAce == 4;
        
        // Check for hands in order of rank.
        if (_hasStraight && _hasFlush && _minNonAce==9) return HAND_RF;
        if (_hasStraight && _hasFlush) return HAND_SF;
        if (_hasFlush) return HAND_FL;
        if (_hasStraight) return HAND_ST;
        return HAND_HC;
    }

    // Not used anywhere, but added for convenience
    function handToCards(uint32 _hand)
        public
        pure
        returns (uint8[5] _cards)
    {
        uint32 _mask;
        for (uint _i=0; _i<5; _i++){
            _mask = uint32(63 * 2**(6*_i));
            _cards[_i] = uint8((_hand & _mask) / (2**(6*_i)));
        }
    }



    /*****************************************************/
    /********** PRIVATE INTERNAL FUNCTIONS ***************/
    /*****************************************************/

    function readFromCards(uint _cards, uint _index)
        internal
        pure
        returns (uint)
    {
        uint _offset = 2**(6*_index);
        uint _oneBits = 2**6 - 1;
        return (_cards & (_oneBits * _offset)) / _offset;
    }

    // Returns a bitmap to represent the set of cards in _hand.
    function handToBitmap(uint32 _hand)
        internal
        pure
        returns (uint _bitmap)
    {
        if (_hand == 0) return 0;
        uint _mask;
        uint _card;
        for (uint _i=0; _i<5; _i++){
            _mask = 63 * 2**(6*_i);
            _card = (_hand & _mask) / (2**(6*_i));
            _bitmap |= 2**_card;
        }
    }

    // Returns numCards from a uint256 (eg, keccak256) seed hash.
    // Returns cards as one uint, with each card being 6 bits.
    function getCardsFromHash(uint256 _hash, uint _numCards, uint _usedBitmap)
        internal
        pure
        returns (uint _cards)
    {
        // Return early if we don't need to pick any cards.
        if (_numCards == 0) return;

        uint _cardIdx = 0;                // index of currentCard
        uint _card;                       // current chosen card
        uint _usedMask;                   // mask of current card

        while (true) {
            _card = _hash % 52;           // Generate card from hash
            _usedMask = 2**_card;         // Create mask for the card

            // If card is not used, add it to _cards and _usedBitmap
            // Return if we have enough cards.
            if (_usedBitmap & _usedMask == 0) {
                _cards |= (_card * 2**(_cardIdx*6));
                _usedBitmap |= _usedMask;
                _cardIdx++;
                if (_cardIdx == _numCards) return _cards;
            }

            // Generate hash used to pick next card.
            _hash = uint256(keccak256(_hash));
        }
    }
}