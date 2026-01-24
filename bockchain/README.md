# YieldStaking

A fixed-term staking contract with snapshot APY, linear rewards, and multiple
independent staking positions per user.

## 1. Overview

YieldStaking allows users to:

- Stake a token into predefined lock packages
- Earn rewards linearly over time
- Create multiple independent staking positions
- Claim rewards during or after the lock period

Key characteristics:

- APY is snapshotted at stake time
- Each stake is an independent position
- No compounding, no dynamic yield

## 2. Core Concepts

### 2.1 Staking Package

Each package defines:

- Lock period (seconds)
- APY (basis points, 10000 = 100%)
- Enabled / disabled status

Packages can be updated by Admin, but only affect future stakes.

### 2.2 Stake Position

Each time a user stakes, a new Stake Position is created.

A position contains:

- Principal amount
- Total reward for the full lock period
- Claimed reward so far
- Lock period snapshot
- Unlock timestamp
- Last claim timestamp

Multiple stakes by the same user are stored and managed separately.

## 3. Reward Model

### 3.1 Reward Calculation

Total reward is calculated once at stake time:

```
rewardTotal =
  amount × APY × lockPeriod
  -------------------------
     365 days × 10000
```

This value is fixed and stored inside the stake position.

### 3.2 Reward Accrual

Rewards accrue linearly over time.

Reward per second:

```
rewardPerSecond = rewardTotal / lockPeriod
```

Rewards stop accruing after `unlockTimestamp`.

### 3.3 Claiming Rewards

Users can:

- Claim rewards multiple times
- Claim at any moment during or after the lock period

On each claim:

- Reward is calculated from `lastClaimTimestamp` to now
- Reward is capped to remaining unclaimed reward
- `lastClaimTimestamp` is updated

## 4. Withdraw Flow

### 4.1 Normal Withdraw

Conditions:

- Lock period has ended

User receives:

- 100% principal
- All remaining unclaimed rewards

The stake position is removed after withdrawal.

### 4.2 Emergency Withdraw

Conditions:

- Contract is paused
- Executed by Operator role

User receives:

- 100% principal
- All unclaimed rewards are forfeited

Used only in emergency situations (system failure, security incident).

## 5. Admin Capabilities

Admin can:

- Create or update staking packages
- Enable or disable packages
- Pause and unpause the contract
- Withdraw excess reward tokens (not reserved for users)

Admin cannot:

- Modify existing stake positions
- Change rewards of already-created stakes

## 6. Accounting and Safety

### 6.1 Reward Debt

The contract tracks:

- `totalRewardDebt`: total rewards owed to all active stakes
- `totalLocked`: total principal locked in the contract

This ensures:

- Insolvency protection
- Safe excess reward withdrawal

### 6.2 Token Handling

- Fee-on-transfer tokens are not supported
- Stake amount must be received fully by the contract
- Reward transfers use `SafeERC20`

## 7. Roles

Role | Description
--- | ---
DEFAULT_ADMIN | Role administration
ADMIN | Package management, pause control
OPERATOR | Emergency withdraw execution

## 8. Pausable Behavior

When paused:

- `stake`, `claim`, `withdraw` are disabled
- `emergencyWithdraw` is allowed (Operator only)
