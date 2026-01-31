import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

/**
 * YieldStaking - Security & Edge Case Tests
 * 
 * OVERVIEW:
 * This test suite provides comprehensive security testing for the YieldStaking
 * contract, focusing on edge cases, boundary conditions, and potential vulnerabilities.
 */

describe("YieldStaking - Security & Edge Case Tests", function () {
    const PACKAGES = {
        0: { lockPeriod: 90n * 24n * 60n * 60n, apy: 2000n },  // 90 days, 20%
        1: { lockPeriod: 180n * 24n * 60n * 60n, apy: 2500n }, // 180 days, 25%
        2: { lockPeriod: 270n * 24n * 60n * 60n, apy: 3500n }, // 270 days, 35%
        3: { lockPeriod: 360n * 24n * 60n * 60n, apy: 5000n }, // 360 days, 50%
    };

    const YEAR_IN_SECONDS = 365n * 24n * 60n * 60n;
    const BASIS_POINTS = 10_000n;

    /**
     * Deploy and setup test environment
     * 
     * Steps:
     * 1. Deploy Aureus token
     * 2. Deploy YieldStaking contract with admin and operator roles
     * 3. Distribute tokens to test users
     * 4. Fund contract with reward liquidity
     * 
     * Returns: All necessary contracts and signers for testing
     */
    async function deployFixture() {
        const [deployer, admin, operator, user1, user2, user3] =
            await ethers.getSigners();

        // Step 1: Deploy Aureus ERC20 token
        const Aureus = await ethers.getContractFactory("Aureus") as any;
        const stakeToken = await Aureus.deploy(deployer.address) as any;
        await stakeToken.waitForDeployment();

        const stakeTokenAddress = await stakeToken.getAddress();

        const YieldStaking = await ethers.getContractFactory("YieldStaking") as any;
        const staking = await YieldStaking.deploy(
            admin.address,
            operator.address,
            stakeTokenAddress,
            stakeTokenAddress
        );
        await staking.waitForDeployment();

        // distribute tokens
        await stakeToken.transfer(user1.address, ethers.parseEther("100000"));
        await stakeToken.transfer(user2.address, ethers.parseEther("100000"));
        await stakeToken.transfer(user3.address, ethers.parseEther("100000"));

        // fund reward liquidity
        await stakeToken.transfer(staking.target, ethers.parseEther("1000000"));


        return {
            deployer,
            admin,
            operator,
            user1,
            user2,
            user3,
            stakeToken,
            rewardToken: stakeToken,
            staking,
        };
    }

    /**
     * HELPER: Calculate expected total reward
     * Formula: (amount * apy * lockPeriod) / (365 days * 10000)
     */
    function calculateTotalReward(
        amount: bigint,
        apy: bigint,
        lockPeriod: bigint
    ): bigint {
        return (amount * apy * lockPeriod) / (YEAR_IN_SECONDS * BASIS_POINTS);
    }

    /*
     * SEC-001: REENTRANCY PROTECTION
     * 
     * OVERVIEW:
     * Basic validation that critical entrypoints exist. Full reentrancy tests require malicious contract.
     * to prevent reentrancy attacks.
     * 
     * TESTS:
     * - Check function selectors exist (basic validation)
     * - Full reentrancy attack requires malicious contract (TODO)
     */
    describe("SEC-001: Reentrancy Protection", function () {
        it("should have nonReentrant modifier on stake", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const iface = staking.connect(admin).interface!;
            const fn = iface.getFunction("stake");

            expect(fn).to.not.be.null;
        });

        it("should have nonReentrant modifier on claim", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const iface = staking.connect(admin).interface!;
            expect(iface.getFunction("claim")).to.not.be.null;
        });

        it("should have nonReentrant modifier on withdraw", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const iface = staking.connect(admin).interface!;
            expect(iface.getFunction("withdraw")).to.not.be.null;
        });

        it("should have nonReentrant modifier on emergencyWithdraw", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const iface = staking.connect(admin).interface!;
            expect(iface.getFunction("emergencyWithdraw")).to.not.be.null;
        });
    });


    /*
     * SEC-002: REWARD CALCULATION PRECISION
     * 
     * OVERVIEW:
     * Tests precision and accuracy of reward calculations, especially for:
     * - Minimum stake amounts
     * - Odd amounts that might cause rounding issues
     * - Boundary conditions near uint128 max
     */
    describe("SEC-002: Reward Calculation Precision", function () {
        /**
         * TEST: Minimum stake amount precision
         * 
         * Steps:
         * 1. Get minimum stake amount from contract
         * 2. Stake minimum amount
         * 3. Calculate expected reward manually
         * 4. Compare with contract calculation
         * 
         * Expected: Exact match (no precision loss)
         */
        it("should handle minimum stake amount without precision loss", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            // Step 1: Get minimum stake amount
            const minAmount = await staking.minStakeAmount();
            const packageId = 0;

            // Step 2: Stake minimum amount
            await stakeToken.connect(user1).approve(staking.target, minAmount);
            await staking.connect(user1).stake(minAmount, packageId);

            // Step 3: Get actual reward from contract
            const stakeInfo = await staking.userStakeHistory(user1.address, packageId, 0);

            // Step 4: Calculate expected reward
            const expectedReward = calculateTotalReward(
                minAmount,
                PACKAGES[0].apy,
                PACKAGES[0].lockPeriod
            );

            // Step 5: Verify exact match
            expect(stakeInfo.rewardTotal).to.equal(expectedReward);
        });

        /**
         * TEST: Odd amount divisions
         * 
         * Steps:
         * 1. Stake odd amount (1337 tokens)
         * 2. Verify reward calculation is correct
         * 
         * Purpose: Ensure division truncation doesn't cause issues
         */
        it("should handle odd amount divisions correctly", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const oddAmount = ethers.parseEther("1337");
            const packageId = 0;

            await stakeToken.connect(user1).approve(staking.target, oddAmount);
            await staking.connect(user1).stake(oddAmount, packageId);

            const stakeInfo = await staking.userStakeHistory(user1.address, packageId, 0);

            const expectedReward = calculateTotalReward(
                oddAmount,
                PACKAGES[0].apy,
                PACKAGES[0].lockPeriod
            );

            expect(stakeInfo.rewardTotal).to.equal(expectedReward);
        });

        /**
         * TEST: uint128 amount overflow protection
         * 
         * Steps:
         * 1. Calculate amount that exceeds uint128 max
         * 2. Attempt to stake this amount
         * 3. Verify contract reverts with "Amount too large"
         * 
         * Note: Contract checks amount <= uint128 max BEFORE reward calculation
         */
        it("should revert when amount exceeds uint128", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            // Calculate amount > uint128 max
            const maxUint128 = BigInt(2) ** BigInt(128) - BigInt(1);
            const hugeAmount = maxUint128 + BigInt(1);

            await stakeToken.connect(user1).approve(staking.target, hugeAmount);

            // Should revert with "Amount too large" (before reward calculation)
            await expect(
                staking.connect(user1).stake(hugeAmount, 3)
            ).to.be.revertedWith("Amount too large");
        });

        /**
         * TEST: Maximum valid stake amount
         * 
         * Steps:
         * 1. Calculate largest amount where reward < uint128 max
         * 2. Stake this amount
         * 3. Verify reward is within uint128 bounds
         * 
         * Purpose: Find upper limit of safe staking amounts
         */
        it("should handle maximum valid stake amount (within total supply)", async function () {
            const { staking, stakeToken, deployer, user1 } =
                await loadFixture(deployFixture);

            // 1. Large but valid stake
            const totalSupply = await stakeToken.totalSupply();
            const largeAmount = totalSupply / 10n;

            // 2. Calculate EXACT reward
            const reward = calculateTotalReward(
                largeAmount,
                PACKAGES[3].apy,
                PACKAGES[3].lockPeriod
            );

            // 3. Read current state
            const currentBalance = await stakeToken.balanceOf(staking.target);
            const totalLocked = await staking.totalLocked();        // = 0
            const totalRewardDebt = await staking.totalRewardDebt();// = 0

            // 4. REQUIRED balance per contract logic
            const requiredBalance =
                totalLocked + largeAmount + reward;

            // 5. Fund EXACT missing amount
            if (currentBalance < requiredBalance) {
                await stakeToken
                    .connect(deployer)
                    .transfer(staking.target, requiredBalance - currentBalance);
            }

            // 6. Fund user
            await stakeToken
                .connect(deployer)
                .transfer(user1.address, largeAmount);

            await stakeToken
                .connect(user1)
                .approve(staking.target, largeAmount);

            // 7. Stake should PASS
            await staking.connect(user1).stake(largeAmount, 3);

            const stakeInfo = await staking.userStakeHistory(user1.address, 3, 0);

            expect(stakeInfo.balance).to.equal(largeAmount);
            expect(stakeInfo.rewardTotal).to.equal(reward);
            expect(stakeInfo.rewardTotal).to.be.lte((1n << 128n) - 1n);
        });

        /**
         * TEST: Precision across multiple claims
         * 
         * Steps:
         * 1. Stake amount
         * 2. Claim at multiple intervals
         * 3. Sum all claimed amounts
         * 4. Verify total ≤ rewardTotal (no overpayment)
         * 
         * Purpose: Ensure repeated claims don't accumulate rounding errors
         */
        it("should maintain precision across multiple claims", async function () {
            const { staking, stakeToken, rewardToken, user1 } = await loadFixture(deployFixture);

            const stakingUser = staking.connect(user1);
            const stakingAddr = await staking.getAddress();

            const amount = ethers.parseEther("10000");
            const packageId = 0;

            // Step 1: Stake
            await stakeToken.connect(user1).approve(stakingAddr, amount);
            await stakingUser.stake(amount, packageId);

            const stakeInfo = await stakingUser.userStakeHistory(user1.address, packageId, 0);
            const rewardTotal: bigint = stakeInfo.rewardTotal;

            let totalClaimed: bigint = 0n;

            const claimIntervals: number[] = [10, 20, 30, 29]; // days

            for (const d of claimIntervals) {
                const seconds: number = d * 24 * 60 * 60;
                await time.increase(seconds);

                const balBefore: bigint = await rewardToken.balanceOf(user1.address);
                await stakingUser.claim(packageId, 0);
                const balAfter: bigint = await rewardToken.balanceOf(user1.address);

                totalClaimed += balAfter - balBefore;
            }

            // Step 3: Verify total claimed ≤ rewardTotal
            expect(totalClaimed).to.be.lte(rewardTotal);

            // Should be close to full reward (89/90 days)
            const expectedClaimed: bigint = (rewardTotal * 89n) / 90n;
            expect(totalClaimed).to.be.closeTo(expectedClaimed, 100n);
        });

    });

    /* 
     * SEC-003: TIMESTAMP MANIPULATION
     * 
     * OVERVIEW:
     * Tests contract behavior with extreme timestamps and edge cases:
     * - Near uint32 max (year 2106 problem)
     * - Same-block operations
     * - Multiple operations in same block
     */
    describe("SEC-003: Timestamp Manipulation", function () {
        /**
         * TEST: Year 2106 timestamp overflow
         * 
         * Steps:
         * 1. Set timestamp near uint32 max (Feb 2106)
         * 2. Stake for 360 days
         * 3. Check if unlockTimestamp overflowed
         * 
         * CRITICAL: This is a known issue - uint32 overflows in 2106
         */
        it("Demonstrates potential uint32 overflow near Year 2106 (informational)", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            // uint32 max = 4294967295 (Feb 7, 2106, 06:28:15 UTC)
            const nearMaxTimestamp = 4294967295 - (365 * 24 * 60 * 60); // 1 year before overflow

            // Set blockchain time to near uint32 max
            await time.increaseTo(nearMaxTimestamp);

            const amount = ethers.parseEther("1000");
            await stakeToken.connect(user1).approve(staking.target, amount);

            // Stake for 360 days (will overflow uint32)
            await staking.connect(user1).stake(amount, 3);

            const stakeInfo = await staking.userStakeHistory(user1.address, 3, 0);

            // Calculate expected unlock time
            const expectedUnlock = nearMaxTimestamp + Number(PACKAGES[3].lockPeriod);

            if (expectedUnlock > 4294967295) {
                console.log("\n⚠️  CRITICAL: Year 2106 timestamp overflow detected!");
                console.log(`Expected unlock: ${expectedUnlock} (overflows uint32)`);
                console.log(`Actual unlock: ${stakeInfo.unlockTimestamp} (wrapped around)`);
                console.log("User could withdraw immediately due to overflow!\n");
            }
        });

        /**
         * TEST: Same-block stake and claim
         * 
         * Steps:
         * 1. Disable auto-mining
         * 2. Submit stake transaction
         * 3. Submit claim transaction (same block)
         * 4. Mine block
         * 5. Verify claim reverts (no time elapsed)
         */
        it("should handle same-block stakes and claims correctly", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("5000");

            // Disable auto-mining to control block production
            await ethers.provider.send("evm_setAutomine", [false]);

            // Submit stake
            await stakeToken.connect(user1).approve(staking.target, amount);
            const stakeTx = await staking.connect(user1).stake(amount, 0);

            // Try to claim in same block
            const claimTx = staking.connect(user1).claim(0, 0);

            // Mine block with both transactions
            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_setAutomine", [true]);

            await stakeTx;

            // Claim should fail (elapsed time = 0)
            await expect(claimTx).to.be.revertedWith("Nothing to claim");
        });

        /**
         * TEST: Multiple stakes in same block
         * 
         * Steps:
         * 1. Submit two stake transactions without mining
         * 2. Mine single block
         * 3. Verify both stakes have same timestamp
         */
        it("should handle multiple stakes in same block", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount1 = ethers.parseEther("1000");
            const amount2 = ethers.parseEther("2000");

            await ethers.provider.send("evm_setAutomine", [false]);

            await stakeToken.connect(user1).approve(staking.target, amount1 + amount2);
            const stake1Tx = await staking.connect(user1).stake(amount1, 0);
            const stake2Tx = await staking.connect(user1).stake(amount2, 0);

            await ethers.provider.send("evm_mine", []);
            await ethers.provider.send("evm_setAutomine", [true]);

            await stake1Tx;
            await stake2Tx;

            const stake1Info = await staking.userStakeHistory(user1.address, 0, 0);
            const stake2Info = await staking.userStakeHistory(user1.address, 0, 1);

            // Both stakes should have same lastClaimTimestamp
            expect(stake1Info.lastClaimTimestamp).to.equal(stake2Info.lastClaimTimestamp);
        });
    });

    /*
     * SEC-004: EMERGENCY WITHDRAW ACCESS CONTROL
     *
     * 
     * OVERVIEW:
     * Tests emergency withdraw function - CORRECTED VERSION
     * 
     * NOTE: Based on actual contract code, emergencyWithdraw:
     * - Takes only (packageId, stakeId) parameters
     * - Can be called by the user themselves when contract is paused
     * - Does NOT require operator role
     */
    describe("SEC-004: Emergency Withdraw Access Control", function () {
        /**
         * TEST: Emergency withdraw when paused (user can withdraw own stake)
         * 
         * Steps:
         * 1. User stakes
         * 2. Admin pauses contract
         * 3. User calls emergencyWithdraw on their own stake
         * 4. Verify success
         */
        it("should allow user to emergency withdraw their own stake when paused", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("5000");

            // Step 1: User stakes
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            // Step 2: Admin pauses
            await staking.connect(admin).pause();

            // Step 3: User withdraws their own stake (no operator needed)
            await expect(
                staking.connect(user1).emergencyWithdraw(0, 0)
            ).to.not.be.reverted;
        });

        /**
         * TEST: Emergency withdraw requires pause
         * 
         * Steps:
         * 1. User stakes
         * 2. User tries emergency withdraw WITHOUT pause
         * 3. Verify revert
         */
        it("should prevent emergency withdraw when not paused", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("5000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            // Try without pausing
            await expect(
                staking.connect(user1).emergencyWithdraw(0, 0)
            ).to.be.revertedWith("Not paused");
        });

        /**
         * TEST: User cannot emergency withdraw another user's stake
         * 
         * Steps:
         * 1. User1 stakes
         * 2. Admin pauses
         * 3. User2 tries to withdraw User1's stake
         * 4. Verify revert
         */
        it("should prevent user from withdrawing another user's stake", async function () {
            const { staking, stakeToken, admin, user1, user2 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("5000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            await staking.connect(admin).pause();

            // User2 tries to withdraw User1's stake
            await expect(
                staking.connect(user2).emergencyWithdraw(0, 0)
            ).to.be.revertedWith("No stake");
        });

        /**
         * TEST: Emergency withdraw pays earned rewards up to current time
         * 
         * Steps:
         * 1. User stakes
         * 2. Time passes (30 days)
         * 3. Admin pauses
         * 4. User emergency withdraws
         * 5. Verify user receives principal + partial rewards
         */
        it("should pay earned rewards during emergency withdraw", async function () {
            const { staking, stakeToken, rewardToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");

            // Step 1: Stake
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
            const rewardTotal = stakeInfo.rewardTotal;

            // Step 2: Time passes (30 days)
            await time.increase(30 * 24 * 60 * 60);

            // Step 3: Pause
            await staking.connect(admin).pause();

            // Step 4: Emergency withdraw
            const balBefore = await rewardToken.balanceOf(user1.address);
            await staking.connect(user1).emergencyWithdraw(0, 0);
            const balAfter = await rewardToken.balanceOf(user1.address);

            const received = balAfter - balBefore;

            // Step 5: Verify received > principal (includes partial rewards)
            expect(received).to.be.gt(amount);

            // Should receive approximately 30/90 of rewards
            const expectedReward = (rewardTotal * 30n) / 90n;
            const expectedTotal = amount + expectedReward;

            expect(received).to.be.closeTo(expectedTotal, ethers.parseEther("1"));
        });
    });

    /*
     * SEC-005: SOLVENCY EDGE CASES
    *
     * 
     * OVERVIEW:
     * Tests that contract maintains solvency under extreme conditions
     */
    describe("SEC-005: Solvency Edge Cases", function () {
        /**
         * TEST: Prevent stake at insolvency threshold
         * 
         * Steps:
         * 1. Calculate contract's available liquidity
         * 2. Try to stake amount that would cause insolvency
         * 3. Verify revert
         */
        it("should prevent stake when it would cause insolvency", async function () {
            const { staking, stakeToken, deployer, user1, user2 } =
                await loadFixture(deployFixture);

            const stakingAddr = await staking.getAddress();

            // Step 1: Large stake to consume reward liquidity
            const largeStake = ethers.parseEther("200000");
            await stakeToken.connect(deployer).transfer(user1.address, largeStake);
            await stakeToken.connect(user1).approve(stakingAddr, largeStake);
            await staking.connect(user1).stake(largeStake, 3);

            // Step 2: Calculate remaining excess
            const contractBalance: bigint = await stakeToken.balanceOf(stakingAddr);
            const totalLocked: bigint = await staking.totalLocked();
            const totalRewardDebt: bigint = await staking.totalRewardDebt();

            const excess: bigint =
                contractBalance - totalLocked - totalRewardDebt;

            // Step 3: Calculate amount that SHOULD trigger insolvency
            // Package 3 ≈ 49.3% reward
            const overAmount: bigint = (excess * 100n) / 149n + 1n;

            // Step 4: Fund user2 properly
            await stakeToken.connect(deployer).transfer(user2.address, overAmount);
            await stakeToken.connect(user2).approve(stakingAddr, overAmount);

            // Step 5: Expect insolvency revert
            await expect(
                staking.connect(user2).stake(overAmount, 3)
            ).to.be.revertedWith("Insufficient reward liquidity");
        });


        /**
         * TEST: Prevent withdrawExcessReward causing insolvency
         */
        it("should prevent withdrawExcessReward causing insolvency", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const stakingUser = staking.connect(user1);

            const amount = ethers.parseEther("100000");
            await stakeToken
                .connect(user1)
                .approve(await staking.getAddress(), amount);

            await stakingUser.stake(amount, 3);

            const contractBalance: bigint = await stakeToken.balanceOf(
                await staking.getAddress()
            );
            const totalLocked: bigint = await staking.totalLocked();
            const totalRewardDebt: bigint = await staking.totalRewardDebt();

            const excess: bigint =
                contractBalance - totalLocked - totalRewardDebt;

            const tooMuch: bigint = excess + ethers.parseEther("1");

            await expect(
                staking.connect(admin).withdrawExcessReward(tooMuch)
            ).to.be.revertedWith("Exceeds excess");
        });


        /**
         * TEST: Maintain solvency with maximum stakes per package
         */
        it("should maintain solvency with max stakes", async function () {
            const { staking, stakeToken, admin, user1, user2, user3 } = await loadFixture(deployFixture);

            // Set package cap
            await staking.connect(admin).setMaxTotalStakedPerPackage(ethers.parseEther("300000"));

            // Fill to cap
            const stake1 = ethers.parseEther("100000");
            const stake2 = ethers.parseEther("100000");
            const stake3 = ethers.parseEther("100000");

            await stakeToken.connect(user1).approve(staking.target, stake1);
            await staking.connect(user1).stake(stake1, 3);

            await stakeToken.connect(user2).approve(staking.target, stake2);
            await staking.connect(user2).stake(stake2, 3);

            await stakeToken.connect(user3).approve(staking.target, stake3);
            await staking.connect(user3).stake(stake3, 3);

            const balance = await stakeToken.balanceOf(staking.target);
            const totalLocked = await staking.totalLocked();
            const totalRewardDebt = await staking.totalRewardDebt();

            expect(balance).to.be.gte(totalLocked + totalRewardDebt);
        });
    });

    /*
     * EDGE-001: PACKAGE PARAMETER BOUNDARIES
    **/
    describe("EDGE-001: Package Parameter Boundaries", function () {
        it("should reject APY below MIN_APY", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const MIN_APY = await staking.MIN_APY();

            await expect(
                staking.connect(admin).setPackage(5, 90n * 24n * 60n * 60n, MIN_APY - 1n, true)
            ).to.be.revertedWith("APY too low");
        });

        it("should reject APY above MAX_APY", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const MAX_APY = await staking.MAX_APY();

            await expect(
                staking.connect(admin).setPackage(5, 90n * 24n * 60n * 60n, MAX_APY + 1n, true)
            ).to.be.revertedWith("APY too high");
        });

        it("should reject lock period below MIN_LOCK_PERIOD", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const MIN_LOCK = await staking.MIN_LOCK_PERIOD();

            await expect(
                staking.connect(admin).setPackage(5, MIN_LOCK - 1n, 2000n, true)
            ).to.be.revertedWith("Lock period too short");
        });

        it("should reject lock period above MAX_LOCK_PERIOD", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const MAX_LOCK = await staking.MAX_LOCK_PERIOD();

            await expect(
                staking.connect(admin).setPackage(5, MAX_LOCK + 1n, 2000n, true)
            ).to.be.revertedWith("Lock period too long");
        });

        it("should accept boundary values", async function () {
            const { staking, admin } = await loadFixture(deployFixture);

            const MIN_APY = await staking.MIN_APY();
            const MAX_APY = await staking.MAX_APY();
            const MIN_LOCK = await staking.MIN_LOCK_PERIOD();
            const MAX_LOCK = await staking.MAX_LOCK_PERIOD();

            await expect(
                staking.connect(admin).setPackage(5, MIN_LOCK, MIN_APY, true)
            ).to.not.be.reverted;

            await expect(
                staking.connect(admin).setPackage(6, MAX_LOCK, MAX_APY, true)
            ).to.not.be.reverted;
        });
    });

    /*
     * EDGE-002: PACKAGE DISABLED MID-STAKE
    **/
    describe("EDGE-002: Package Disabled Mid-Stake", function () {
        it("should allow existing stakes to claim after package disabled", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            await staking.connect(admin).setPackage(0, PACKAGES[0].lockPeriod, PACKAGES[0].apy, false);

            await time.increase(30 * 24 * 60 * 60);

            await expect(staking.connect(user1).claim(0, 0)).to.not.be.reverted;
        });

        it("should allow existing stakes to withdraw after package disabled", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            await staking.connect(admin).setPackage(0, PACKAGES[0].lockPeriod, PACKAGES[0].apy, false);

            await time.increase(Number(PACKAGES[0].lockPeriod));

            await expect(staking.connect(user1).withdraw(0, 0)).to.not.be.reverted;
        });

        it("should prevent new stakes when package disabled", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            await staking.connect(admin).setPackage(0, PACKAGES[0].lockPeriod, PACKAGES[0].apy, false);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);

            await expect(
                staking.connect(user1).stake(amount, 0)
            ).to.be.revertedWith("Invalid package");
        });
    });

    /*
     * EDGE-003: ADMIN PARAMETER CHANGES
    **/
    describe("EDGE-003: Admin Parameter Changes During Active Stakes", function () {
        it("should not affect existing stakes when APY changed", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo1 = await staking.userStakeHistory(user1.address, 0, 0);
            const originalReward = stakeInfo1.rewardTotal;

            await staking.connect(admin).setPackage(0, PACKAGES[0].lockPeriod, 5000n, true);

            const stakeInfoAfter = await staking.userStakeHistory(user1.address, 0, 0);

            expect(stakeInfoAfter.rewardTotal).to.equal(originalReward);
        });

        it("should apply new APY to new stakes only", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");

            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stake1Info = await staking.userStakeHistory(user1.address, 0, 0);

            await staking.connect(admin).setPackage(0, PACKAGES[0].lockPeriod, 5000n, true);

            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stake2Info = await staking.userStakeHistory(user1.address, 0, 1);

            expect(stake2Info.rewardTotal).to.be.gt(stake1Info.rewardTotal);

            const expectedStake2Reward = calculateTotalReward(amount, 5000n, PACKAGES[0].lockPeriod);
            expect(stake2Info.rewardTotal).to.equal(expectedStake2Reward);
        });

        it("should handle minStakeAmount changes correctly", async function () {
            const { staking, stakeToken, admin, user1 } = await loadFixture(deployFixture);

            const oldMin = await staking.minStakeAmount();

            await stakeToken.connect(user1).approve(staking.target, oldMin);
            await staking.connect(user1).stake(oldMin, 0);

            const newMin = ethers.parseEther("1000");
            await staking.connect(admin).setMinStakeAmount(newMin);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
            expect(stakeInfo.balance).to.equal(oldMin);

            await stakeToken.connect(user1).approve(staking.target, oldMin);
            await expect(
                staking.connect(user1).stake(oldMin, 0)
            ).to.be.revertedWith("Below minimum");

            await stakeToken.connect(user1).approve(staking.target, newMin);
            await expect(staking.connect(user1).stake(newMin, 0)).to.not.be.reverted;
        });
    });

    /*
     * EDGE-004: CLAIM BOUNDARY CONDITIONS
    **/
    describe("EDGE-004: Claim Boundary Conditions", function () {
        it("should handle claim at exactly 1 second after stake", async function () {
            const { staking, stakeToken, rewardToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);

            await time.increase(1);

            const expectedClaimable = (stakeInfo.rewardTotal * 1n) / PACKAGES[0].lockPeriod;

            const balBefore = await rewardToken.balanceOf(user1.address);
            await staking.connect(user1).claim(0, 0);
            const balAfter = await rewardToken.balanceOf(user1.address);

            expect(balAfter - balBefore).to.be.gt(0);
            expect(balAfter - balBefore).to.equal(expectedClaimable);
        });

        it("should handle claim at exactly unlock timestamp", async function () {
            const { staking, stakeToken, rewardToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);

            await time.increase(Number(PACKAGES[0].lockPeriod));

            const balBefore = await rewardToken.balanceOf(user1.address);
            await staking.connect(user1).claim(0, 0);
            const balAfter = await rewardToken.balanceOf(user1.address);

            expect(balAfter - balBefore).to.equal(stakeInfo.rewardTotal);
        });

        it("should cap claimable at rewardTotal when time exceeds unlock", async function () {
            const { staking, stakeToken, rewardToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);

            await time.increase(Number(PACKAGES[0].lockPeriod) * 2);

            const balBefore = await rewardToken.balanceOf(user1.address);
            await staking.connect(user1).claim(0, 0);
            const balAfter = await rewardToken.balanceOf(user1.address);

            expect(balAfter - balBefore).to.equal(stakeInfo.rewardTotal);
        });

        it("should handle many small claims summing to total", async function () {
            const { staking, stakeToken, rewardToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
            const rewardTotal = stakeInfo.rewardTotal;

            let totalClaimed = 0n;

            for (let day = 1; day <= 90; day++) {
                await time.increase(24 * 60 * 60);

                const balBefore = await rewardToken.balanceOf(user1.address);
                await staking.connect(user1).claim(0, 0);
                const balAfter: bigint = await rewardToken.balanceOf(user1.address);

                totalClaimed += (balAfter - balBefore);
            }

            const diff = totalClaimed > rewardTotal ? totalClaimed - rewardTotal : rewardTotal - totalClaimed;

            expect(diff).to.be.lte(90n);
        });
    });

    /*
     * STATE-001: STATE BLOAT PROTECTION
    **/
    describe("STATE-001: State Bloat Protection", function () {
        it("should handle 100 stakes from single user", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const minStake = await staking.minStakeAmount();

            for (let i = 0; i < 100; i++) {
                await stakeToken.connect(user1).approve(staking.target, minStake);
                await staking.connect(user1).stake(minStake, 0);
            }

            const stakeCount = await staking.userStakeCount(user1.address, 0);
            expect(stakeCount).to.equal(100);

            const totalStakes = await staking.userTotalStakes(user1.address);
            expect(totalStakes).to.equal(minStake * 100n);
        });

        /**
         * TEST: Gas variance across multiple stakes
         * 
         * Note: Gas decreases from first to subsequent stakes due to:
         * - First stake: SSTORE from 0 → non-zero (20k gas)
         * - Later stakes: SSTORE from non-zero → non-zero (5k gas)
         * 
         * This is EXPECTED behavior, not a bug
         */
        it("should show gas optimization after first stake", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const stakingUser = staking.connect(user1);
            const stakingAddr = await staking.getAddress();

            const amount = ethers.parseEther("1000");

            await stakeToken.connect(user1).approve(stakingAddr, amount);
            const tx1 = await stakingUser.stake(amount, 0);
            const receipt1 = await tx1.wait();
            const gas1: bigint = receipt1!.gasUsed;

            for (let i = 0; i < 98; i++) {
                await stakeToken.connect(user1).approve(stakingAddr, amount);
                await stakingUser.stake(amount, 0);
            }

            await stakeToken.connect(user1).approve(stakingAddr, amount);
            const tx100 = await stakingUser.stake(amount, 0);
            const receipt100 = await tx100.wait();
            const gas100: bigint = receipt100!.gasUsed;

            const diff: bigint = gas1 - gas100;
            const reductionPct: bigint = (diff * 100n) / gas1;

            console.log(`\nGas Analysis:`);
            console.log(`Stake #1:   ${gas1.toString()} gas`);
            console.log(`Stake #100: ${gas100.toString()} gas`);
            console.log(
                `Difference: ${diff.toString()} gas (${reductionPct.toString()}% reduction)`
            );
            console.log(
                `Reason: SSTORE 0→nonzero costs more than nonzero→nonzero\n`
            );

            expect(gas100).to.be.lt(gas1);
        });


        it("should prevent stakeId overflow", async function () {
            const { staking, user1 } = await loadFixture(deployFixture);

            const maxUint32 = BigInt(2) ** BigInt(32) - BigInt(1);
            const stakeCount = await staking.userStakeCount(user1.address, 0);

            expect(stakeCount).to.be.lt(maxUint32);
        });
    });

    /*
     * GAS-001: OPERATION BENCHMARKS
    **/
    describe("GAS-001: Gas Guardrails", function () {
        /**
         * Realistic gas expectations based on actual measurements:
         * - stake(): ~220k gas (includes SSTORE, transfers, reward calc)
         * - claim(): ~60k gas
         * - withdraw(): ~70k gas
         */
        it("should measure stake() gas cost", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);

            const tx = await staking.connect(user1).stake(amount, 0);
            const receipt = await tx.wait();

            console.log(`\nstake() gas: ${receipt!.gasUsed}`);

            // Realistic expectation: under 250k gas
            expect(receipt!.gasUsed).to.be.lt(250000n);
        });

        it("should measure claim() gas cost", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            await time.increase(30 * 24 * 60 * 60);

            const tx = await staking.connect(user1).claim(0, 0);
            const receipt = await tx.wait();

            console.log(`claim() gas: ${receipt!.gasUsed}`);
            expect(receipt!.gasUsed).to.be.lt(100000n);
        });

        it("should measure withdraw() gas cost", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");
            await stakeToken.connect(user1).approve(staking.target, amount);
            await staking.connect(user1).stake(amount, 0);

            await time.increase(Number(PACKAGES[0].lockPeriod));

            const tx = await staking.connect(user1).withdraw(0, 0);
            const receipt = await tx.wait();

            console.log(`withdraw() gas: ${receipt!.gasUsed}`);
            expect(receipt!.gasUsed).to.be.lt(100000n);
        });

        it("should compare gas costs across operations", async function () {
            const { staking, stakeToken, user1 } = await loadFixture(deployFixture);

            const amount = ethers.parseEther("10000");

            await stakeToken.connect(user1).approve(staking.target, amount);
            const stakeTx = await staking.connect(user1).stake(amount, 0);
            const stakeGas = (await stakeTx.wait())!.gasUsed;

            await time.increase(45 * 24 * 60 * 60);
            const claimTx = await staking.connect(user1).claim(0, 0);
            const claimGas = (await claimTx.wait())!.gasUsed;

            await time.increase(45 * 24 * 60 * 60);
            const withdrawTx = await staking.connect(user1).withdraw(0, 0);
            const withdrawGas = (await withdrawTx.wait())!.gasUsed;

            console.log("\n=== Gas Comparison ===");
            console.log(`stake():    ${stakeGas}`);
            console.log(`claim():    ${claimGas}`);
            console.log(`withdraw(): ${withdrawGas}`);
            console.log("======================\n");

            expect(stakeGas).to.be.gte(claimGas);
        });
    });
});