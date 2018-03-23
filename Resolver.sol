pragma solidity ^0.4.19;
/**
An experimental Utility class that interacts with
a virtually endless bitmap, where bits only ever
go from 0 to 1.

- Provides a fixed-gas way to get the lowest 0 bit.
- Allows setting any bit to 1, with minimal gas cost.

Seems it would quite useful as a process-once queue
of incremental indexes, where processing can happen
out of order.
*/
contract Resolver {
    uint private MAX_UINT = 2**255 + (2**255-1);
    uint private rCurPageIdx = 0;
    mapping(uint=>uint) private rPages;

    function Resolver() {
        // test that setting a bit across pages works.
        // rPages[0] = MAX_UINT;
    }

    // Sets a bit to 1 in the correct page and bit-index.
    function setResolved(uint _id)
        internal
    {
        uint _pageIdx = _id / 256;
        uint _bit = (_id % 256);
        rPages[_pageIdx] = rPages[_pageIdx] | 2**_bit;
        updateCurPageIdx();
    }

    // Returns the lowest bit that is 0
    // Fixed ~2000 gas.
    function getFirstUnresolved()
        public
        view
        returns (uint _id)
    {
        uint _page = rPages[rCurPageIdx];
        return 256*rCurPageIdx + findFirst0Bit(_page);
    }

    // Updates rCurPageIdx. Goes through current
    // page, if it's all 1s, increments. Repeats
    // until a non-full page is found.
    function updateCurPageIdx()
        private
    {
        uint _pageIdx = rCurPageIdx;
        uint _page = rPages[_pageIdx];
        while (_page == MAX_UINT) {
            _pageIdx++;
            _page = rPages[_pageIdx];
        }
        rCurPageIdx = _pageIdx;
    }

    // Returns the first bit (0-indexed) that is 0.
    // Worst case gas is ~2000
    function findFirst0Bit(uint256 _num)
        private
        pure
        returns (uint8 _index)
    {
        uint _right = 0;
        uint _left = 256;
        uint _mid = 128;
        uint _mask;
        while (_left > _right + 1){
            _mask = 2**_mid - 1;
            if (_num & _mask == _mask) {
                _right = _mid;
            } else {
                _left = _mid;
            }
            _mid = (_left + _right) / 2;
        }
        return uint8(_mid);
    }
}