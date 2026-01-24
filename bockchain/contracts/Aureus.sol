// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Aureus is ERC20, ERC20Burnable, ERC20Pausable, Ownable {
    uint256 private constant INITIAL_SUPPLY = 1_000_000_000; // 1 billion

    constructor(address initialOwner)
        ERC20("Aureus", "AUR")
        Ownable(initialOwner)
    {
        require(initialOwner != address(0), "Initial owner cannot be zero address");
        _mint(initialOwner, INITIAL_SUPPLY * 10**decimals());
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}