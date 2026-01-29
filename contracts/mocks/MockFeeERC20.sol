// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockFeeERC20 is ERC20 {
    uint8 private _decimals;
    uint256 public feeBps;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 feeBps_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        feeBps = feeBps_;
        _mint(msg.sender, initialSupply_);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from != address(0) && to != address(0) && feeBps > 0) {
            uint256 fee = (amount * feeBps) / 10_000;
            uint256 sendAmount = amount - fee;

            super._update(from, to, sendAmount);
            super._update(from, address(0xdead), fee);
        } else {
            super._update(from, to, amount);
        }
    }
}
