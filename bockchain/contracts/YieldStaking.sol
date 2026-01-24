// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import "./AccessRoles.sol";

contract YieldStaking is AccessControl, AccessRoles, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20Metadata;

    IERC20Metadata public immutable stakeToken;
    IERC20Metadata public immutable rewardToken;

    struct StakeInfo {
        uint128 balance; // principal
        uint128 rewardTotal; // total reward for full lock
        uint128 rewardClaimed; // already claimed reward
        uint64 lockPeriod; // snapshot lock period
        uint64 unlockTimestamp; // start + lockPeriod
        uint64 lastClaimTimestamp; // last claim time
    }

    struct PackageConfig {
        uint64 lockPeriod; // seconds
        uint32 apy; // basis points (10000 = 100%)
        bool enabled;
    }

    mapping(uint8 => PackageConfig) public packages;

    mapping(address => mapping(uint8 => uint32)) public userStakeCount;
    mapping(address => mapping(uint8 => mapping(uint32 => StakeInfo))) public userStakeHistory;

    mapping(address => uint256) public userTotalStakes;
    mapping(uint8 => uint256) public packageTotalStaked;

    uint256 public totalLocked;
    uint256 public totalRewardDebt;

    uint256 public minStakeAmount;
    uint256 public maxStakePerUser;
    uint256 public maxTotalStakedPerPackage;

    event Staked(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 amount,
        uint256 rewardTotal
    );

    event Claimed(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 amount
    );

    event Withdrawn(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 principal,
        uint256 reward
    );

    event EmergencyWithdrawn(
        address indexed user,
        uint8 indexed packageId,
        uint32 stakeId,
        uint256 principal,
        uint256 lostReward
    );

    event ExcessRewardWithdrawn(address indexed admin, uint256 amount);

    event PackageUpdated(
        uint8 indexed id,
        uint64 lockPeriod,
        uint32 apy,
        bool enabled
    );


    constructor(
        address admin,
        address operator,
        IERC20Metadata _stakeToken,
        IERC20Metadata _rewardToken
    ) {
        require(admin != address(0) && operator != address(0), "Invalid role");
        require(address(_stakeToken) != address(0), "Invalid stake token");
        require(address(_rewardToken) != address(0), "Invalid reward token");

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(OPERATOR_ROLE, operator);
        _setRoleAdmin(OPERATOR_ROLE, ADMIN_ROLE);

        stakeToken = _stakeToken;
        rewardToken = _rewardToken;

        uint8 decimals = stakeToken.decimals();
        require(decimals <= 18, "Decimals > 18");

        minStakeAmount = 500 * 10 ** decimals;

        // default packages
        packages[0] = PackageConfig(90 days, 2000, true);
        packages[1] = PackageConfig(180 days, 2500, true);
        packages[2] = PackageConfig(270 days, 3500, true);
        packages[3] = PackageConfig(360 days, 5000, true);
    }

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    function setPackage(
        uint8 id,
        uint64 lockPeriod,
        uint32 apy,
        bool enabled
    ) external onlyRole(ADMIN_ROLE) {
        require(lockPeriod > 0, "Invalid lock period");
        require(apy <= 10_000, "APY too high"); // max 100%

        packages[id] = PackageConfig(lockPeriod, apy, enabled);
        emit PackageUpdated(id, lockPeriod, apy, enabled);
    }

    /**
     * @notice Withdraw reward tokens not needed to pay future rewards
     */
    function withdrawExcessReward(
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        uint256 balance = rewardToken.balanceOf(address(this));

        if (address(stakeToken) == address(rewardToken)) {
            require(balance >= totalLocked + totalRewardDebt, "Insolvent");
            uint256 excess = balance - totalLocked - totalRewardDebt;
            require(amount <= excess, "Exceeds excess");
        } else {
            require(balance >= totalRewardDebt, "Insolvent");
            uint256 excess = balance - totalRewardDebt;
            require(amount <= excess, "Exceeds excess");
        }

        rewardToken.safeTransfer(msg.sender, amount);
        emit ExcessRewardWithdrawn(msg.sender, amount);
    }

    function stake(
        uint256 amount,
        uint8 packageId
    ) external nonReentrant whenNotPaused {
        PackageConfig memory pkg = packages[packageId];
        require(pkg.enabled && pkg.lockPeriod > 0, "Invalid package");
        require(amount >= minStakeAmount, "Below minimum");
        require(amount <= type(uint128).max, "Amount too large");

        if (maxStakePerUser > 0) {
            require(
                userTotalStakes[msg.sender] + amount <= maxStakePerUser,
                "User cap"
            );
        }

        if (maxTotalStakedPerPackage > 0) {
            require(
                packageTotalStaked[packageId] + amount <=
                    maxTotalStakedPerPackage,
                "Package cap"
            );
        }

        require(
            userStakeCount[msg.sender][packageId] < type(uint32).max,
            "StakeId overflow"
        );

        uint256 rewardTotal = Math.mulDiv(
            amount * pkg.apy,
            pkg.lockPeriod,
            365 days * 10_000
        );

        require(rewardTotal <= type(uint128).max, "Reward too large");

        uint256 balanceBefore = stakeToken.balanceOf(address(this));
        stakeToken.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = stakeToken.balanceOf(address(this));
        uint256 received = balanceAfter - balanceBefore;
        require(received == amount, "Fee-on-transfer not supported");

        totalRewardDebt += rewardTotal;

        uint32 stakeId = userStakeCount[msg.sender][packageId];

        userStakeHistory[msg.sender][packageId][stakeId] = StakeInfo({
            balance: uint128(amount),
            rewardTotal: uint128(rewardTotal),
            rewardClaimed: 0,
            lockPeriod: pkg.lockPeriod,
            unlockTimestamp: uint64(block.timestamp + pkg.lockPeriod),
            lastClaimTimestamp: uint64(block.timestamp)
        });

        userStakeCount[msg.sender][packageId]++;
        totalLocked += amount;
        userTotalStakes[msg.sender] += amount;
        packageTotalStaked[packageId] += amount;

        emit Staked(msg.sender, packageId, stakeId, amount, rewardTotal);
    }

    /* ========================= CLAIM ========================= */

    function claim(
        uint8 packageId,
        uint32 stakeId
    ) external nonReentrant whenNotPaused {
        StakeInfo storage s = userStakeHistory[msg.sender][packageId][stakeId];
        require(s.balance > 0, "No stake");

        uint256 claimable = getClaimableRewardsForStake(
            msg.sender,
            packageId,
            stakeId
        );
        require(claimable > 0, "Nothing to claim");

        s.rewardClaimed += uint128(claimable);
        s.lastClaimTimestamp = uint64(
            Math.min(block.timestamp, s.unlockTimestamp)
        );

        totalRewardDebt -= claimable;

        rewardToken.safeTransfer(msg.sender, claimable);

        emit Claimed(msg.sender, packageId, stakeId, claimable);
    }

    function withdraw(
        uint8 packageId,
        uint32 stakeId
    ) external nonReentrant whenNotPaused {
        StakeInfo storage s = userStakeHistory[msg.sender][packageId][stakeId];
        require(s.balance > 0, "No stake");
        require(block.timestamp >= s.unlockTimestamp, "Locked");

        uint256 remainingReward = s.rewardTotal - s.rewardClaimed;

        totalRewardDebt -= remainingReward;
        totalLocked -= s.balance;
        userTotalStakes[msg.sender] -= s.balance;
        packageTotalStaked[packageId] -= s.balance;

        uint256 principal = s.balance;
        delete userStakeHistory[msg.sender][packageId][stakeId];

        stakeToken.safeTransfer(msg.sender, principal);
        if (remainingReward > 0) {
            rewardToken.safeTransfer(msg.sender, remainingReward);
        }

        emit Withdrawn(
            msg.sender,
            packageId,
            stakeId,
            principal,
            remainingReward
        );
    }

    /**
     * @notice Emergency withdraw when contract is paused.
     * User receives principal only, reward is forfeited.
     */
    function emergencyWithdraw(
        address user,
        uint8 packageId,
        uint32 stakeId
    ) external onlyRole(OPERATOR_ROLE) {
        require(paused(), "Not paused");

        StakeInfo storage s = userStakeHistory[user][packageId][stakeId];
        require(s.balance > 0, "No stake");

        uint256 lostReward = s.rewardTotal - s.rewardClaimed;

        totalRewardDebt -= lostReward;
        totalLocked -= s.balance;
        userTotalStakes[user] -= s.balance;
        packageTotalStaked[packageId] -= s.balance;

        uint256 principal = s.balance;
        delete userStakeHistory[user][packageId][stakeId];

        stakeToken.safeTransfer(user, principal);

        emit EmergencyWithdrawn(
            user,
            packageId,
            stakeId,
            principal,
            lostReward
        );
    }

    function getClaimableRewardsForStake(
        address user,
        uint8 packageId,
        uint32 stakeId
    ) public view returns (uint256) {
        StakeInfo memory s = userStakeHistory[user][packageId][stakeId];
        if (s.balance == 0) return 0;

        uint256 claimUntil = Math.min(block.timestamp, s.unlockTimestamp);
        if (claimUntil <= s.lastClaimTimestamp) return 0;

        uint256 elapsed = claimUntil - s.lastClaimTimestamp;

        uint256 reward = (uint256(s.rewardTotal) * elapsed) / s.lockPeriod;

        uint256 remaining = s.rewardTotal - s.rewardClaimed;
        return reward > remaining ? remaining : reward;
    }

    function getStakeCount(address user, uint8 packageId)
        external
        view
        returns (uint32)
    {
        return userStakeCount[user][packageId];
    }
}
