// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

/**
 * @title AccessRoles
 * @notice Centralized role definitions for consistent access control across contracts
 */
abstract contract AccessRoles {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
}