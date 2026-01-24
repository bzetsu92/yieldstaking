// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IYieldStaking {
    struct StakeInfo {
        uint128 balance;
        uint128 rewardTotal;
        uint128 rewardClaimed;
        uint64 startTimestamp;
        uint64 unlockTimestamp;
        uint64 lockPeriod;
        uint64 lastClaimTimestamp;
    }

    struct PackageConfig {
        uint64 lockPeriod;
        uint32 apy;
        bool enabled;
    }

    function stake(uint256 amount, uint8 packageId) external;
    function withdraw(uint8 packageId, uint32 stakeId) external;
    function claim(uint8 packageId, uint32 stakeId) external;
    function getUserStakes(address user, uint8 packageId) external view returns (StakeInfo[] memory);
    function getClaimableRewardsForStake(address user, uint8 packageId, uint32 stakeId) external view returns (uint256);
    function getTotalClaimableRewards(address user) external view returns (uint256);
    function getContractBalance() external view returns (uint256 stakeBalance, uint256 rewardBalance);
    function getExcessRewardBalance() external view returns (uint256);

    function packages(uint8 id) external view returns (PackageConfig memory);
    function setPackage(uint8 id, uint64 lockPeriod, uint32 apy, bool enabled) external;
    
    function stakeToken() external view returns (IERC20Metadata);
    function rewardToken() external view returns (IERC20Metadata);
    function totalLocked() external view returns (uint256);
    function minStakeAmount() external view returns (uint256);
    function userTotalStakes(address user) external view returns (uint256);
    function packageTotalStaked(uint8 packageId) external view returns (uint256);
    function packageEnabled(uint8 packageId) external view returns (bool);
}

