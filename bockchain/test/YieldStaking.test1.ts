import { expect } from "chai";
import hre from "hardhat";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.connect();

const DAY = 24 * 60 * 60;
const YEAR = 365n * 24n * 60n * 60n;
const BPS = 10_000n;

function calcReward(amount: bigint, apyBps: bigint, lockPeriodSec: bigint): bigint {
  return (amount * apyBps * lockPeriodSec) / (YEAR * BPS);
}

describe("YieldStaking", function () {
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

  async function deployDifferentTokenFixture() {
    const [deployer, admin, operator, user1, user2, user3] = await ethers.getSigners();

    // Step 1: Deploy stake token (6 decimals) and reward token (18 decimals).
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const stakeToken = await MockUSDT.deploy(deployer.address);
    await stakeToken.waitForDeployment();

    const Aureus = await ethers.getContractFactory("Aureus");
    const rewardToken = await Aureus.deploy(deployer.address);
    await rewardToken.waitForDeployment();

    // Step 2: Mint stake token to test users.
    await stakeToken.mint(user1.address, ethers.parseUnits("100000", 6));
    await stakeToken.mint(user2.address, ethers.parseUnits("100000", 6));
    await stakeToken.mint(user3.address, ethers.parseUnits("100000", 6));

    // Step 3: Deploy staking contract.
    const YieldStaking = await ethers.getContractFactory("YieldStaking");
    const staking = await YieldStaking.deploy(
      admin.address,
      operator.address,
      await stakeToken.getAddress(),
      await rewardToken.getAddress()
    );
    await staking.waitForDeployment();

    // Step 4: Fund reward liquidity.
    await rewardToken.transfer(await staking.getAddress(), ethers.parseEther("1000000"));

    return {
      deployer,
      admin,
      operator,
      user1,
      user2,
      user3,
      stakeToken,
      rewardToken,
      staking,
    };
  }

  describe("Deployment", function () {
    it("Deploy contract thành công với địa chỉ admin/operator/token hợp lệ", async function () {
      const { admin, operator, stakeToken, rewardToken, staking } = await networkHelpers.loadFixture(deployFixture);

      expect(await staking.stakeToken()).to.equal(await stakeToken.getAddress());
      expect(await staking.rewardToken()).to.equal(await rewardToken.getAddress());

      const ADMIN_ROLE = await staking.ADMIN_ROLE();
      const OPERATOR_ROLE = await staking.OPERATOR_ROLE();

      expect(await staking.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
      expect(await staking.hasRole(OPERATOR_ROLE, operator.address)).to.equal(true);
    });

    it("Không cho deploy nếu địa chỉ admin/operator là zero address", async function () {
      const [deployer, admin, operator] = await ethers.getSigners();
      const Aureus = await ethers.getContractFactory("Aureus");
      const token = await Aureus.deploy(deployer.address);
      await token.waitForDeployment();

      const YieldStaking = await ethers.getContractFactory("YieldStaking");

      await expect(
        YieldStaking.deploy(ethers.ZeroAddress, operator.address, await token.getAddress(), await token.getAddress())
      ).to.be.revertedWith("Invalid role");

      await expect(
        YieldStaking.deploy(admin.address, ethers.ZeroAddress, await token.getAddress(), await token.getAddress())
      ).to.be.revertedWith("Invalid role");
    });

    it("Không cho deploy nếu địa chỉ stake token hoặc reward token là zero address", async function () {
      const [deployer, admin, operator] = await ethers.getSigners();
      const Aureus = await ethers.getContractFactory("Aureus");
      const token = await Aureus.deploy(deployer.address);
      await token.waitForDeployment();

      const YieldStaking = await ethers.getContractFactory("YieldStaking");

      await expect(
        YieldStaking.deploy(admin.address, operator.address, ethers.ZeroAddress, await token.getAddress())
      ).to.be.revertedWith("Invalid stake token");

      await expect(
        YieldStaking.deploy(admin.address, operator.address, await token.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid reward token");
    });

    it("Khởi tạo đúng các package mặc định", async function () {
      const { staking } = await networkHelpers.loadFixture(deployFixture);

      const p0 = await staking.packages(0);
      const p1 = await staking.packages(1);
      const p2 = await staking.packages(2);
      const p3 = await staking.packages(3);

      expect(p0.lockPeriod).to.equal(90 * DAY);
      expect(p1.lockPeriod).to.equal(180 * DAY);
      expect(p2.lockPeriod).to.equal(270 * DAY);
      expect(p3.lockPeriod).to.equal(360 * DAY);

      expect(p0.apy).to.equal(2000);
      expect(p1.apy).to.equal(2500);
      expect(p2.apy).to.equal(3500);
      expect(p3.apy).to.equal(5000);

      expect(p0.enabled).to.equal(true);
      expect(p1.enabled).to.equal(true);
      expect(p2.enabled).to.equal(true);
      expect(p3.enabled).to.equal(true);
    });
  });

  describe("Admin: setPackage", function () {
    it("Admin có thể cập nhật cấu hình package", async function () {
      const { admin, staking } = await networkHelpers.loadFixture(deployFixture);

      await expect(staking.connect(admin).setPackage(0, 180 * DAY, 3000, true))
        .to.emit(staking, "PackageUpdated")
        .withArgs(0, 180 * DAY, 3000, true);

      const pkg = await staking.packages(0);
      expect(pkg.lockPeriod).to.equal(180 * DAY);
      expect(pkg.apy).to.equal(3000);
      expect(pkg.enabled).to.equal(true);
    });

    it("Không cho phép staking khi package bị disable", async function () {
      const { admin, staking, user1, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await staking.connect(admin).setPackage(0, 180 * DAY, 3000, false);
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);

      await expect(staking.connect(user1).stake(amount, 0)).to.be.revertedWith("Invalid package");
    });

    it("Không cho phép cập nhật package với lock period = 0", async function () {
      const { admin, staking } = await networkHelpers.loadFixture(deployFixture);
      await expect(staking.connect(admin).setPackage(0, 0, 3000, true)).to.be.revertedWith("Lock period too short");
    });

    it("Không cho phép cập nhật package với apy > 10000 bps", async function () {
      const { admin, staking } = await networkHelpers.loadFixture(deployFixture);
      await expect(staking.connect(admin).setPackage(0, 180 * DAY, 10001, true)).to.be.revertedWith("APY too high");
    });

    it("User thường không được cập nhật package", async function () {
      const { user1, staking } = await networkHelpers.loadFixture(deployFixture);
      await expect(staking.connect(user1).setPackage(0, 180 * DAY, 3000, true)).to.be.revert(ethers);
    });
  });

  describe("Stake", function () {
    it("Stake thành công", async function () {
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const expectedReward = calcReward(amount, 2000n, BigInt(90 * DAY));

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);

      await expect(staking.connect(user1).stake(amount, 0))
        .to.emit(staking, "Staked")
        .withArgs(user1.address, 0, 0, amount, expectedReward);

      const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
      expect(stakeInfo.balance).to.equal(amount);
      expect(stakeInfo.rewardTotal).to.equal(expectedReward);
      expect(stakeInfo.rewardClaimed).to.equal(0);
      expect(stakeInfo.lockPeriod).to.equal(90 * DAY);
    });

    it("Không cho phép staking khi package bị disable", async function () {
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(admin).setPackage(0, 180 * DAY, 3000, false);

      await expect(staking.connect(user1).stake(amount, 0)).to.be.revertedWith("Invalid package");
      await expect(staking.connect(user1).stake(amount, 99)).to.be.revertedWith("Invalid package");
    });

    it("Không cho phép staking khi số lượng staking < minStakeAmount", async function () {
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const minStake = await staking.minStakeAmount();
      const amount = minStake - 1n;

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await expect(staking.connect(user1).stake(amount, 0)).to.be.revertedWith("Below minimum");
    });

    it("Áp dụng giới hạn staking cho mỗi package", async function () {
      /*Bước thực hiện:
      1. Admin set maxTotalStakedPerPackage cho package 0 là 1500 token.
      2. User1 stake 1000 token vào package 0 -> thành công.
      3. User2 stake 600 token vào package 0 -> revert vì vượt cap 1500 token.
      */
      
      const { admin, user1, user2, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const cap = ethers.parseEther("1500");
      const firstStake = ethers.parseEther("1000");
      const secondStake = ethers.parseEther("600");

      await staking.connect(admin).setMaxTotalStakedPerPackage(cap);
      await stakeToken.connect(user1).approve(await staking.getAddress(), firstStake);
      await stakeToken.connect(user2).approve(await staking.getAddress(), secondStake);

      await staking.connect(user1).stake(firstStake, 0);
      await expect(staking.connect(user2).stake(secondStake, 0)).to.be.revertedWith("Package cap");
    });

    it("snapshots reward và lockPeriod từ package tại thời điểm staking", async function () {
      /*Bước thực hiện:
      1. Admin set package 0: lockPeriod = 180 ngày, APY = 30%.
      2. User1 stake vào package 0 với số lượng 1000 token.
      3. Kiểm tra userStakeHistory của User1 để xác nhận lockPeriod = 180 ngày và rewardTotal được tính đúng theo APY 30%.
      4. Admin cập nhật lại package 0: lockPeriod = 360 ngày, APY = 50%.
      5. Kiểm tra lại userStakeHistory của User1 để xác nhận lockPeriod vẫn là 180 ngày và rewardTotal không thay đổi (vẫn tính theo APY 30% tại thời điểm stake).
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await staking.connect(admin).setPackage(0, 180 * DAY, 3000, true);
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      const originalStake = await staking.userStakeHistory(user1.address, 0, 0);
      expect(originalStake.lockPeriod).to.equal(180 * DAY);
      expect(originalStake.rewardTotal).to.equal(calcReward(amount, 3000n, BigInt(180 * DAY)));

      await staking.connect(admin).setPackage(0, 360 * DAY, 5000, true);
      const sameStake = await staking.userStakeHistory(user1.address, 0, 0);
      expect(sameStake.lockPeriod).to.equal(180 * DAY);
      expect(sameStake.rewardTotal).to.equal(originalStake.rewardTotal);
    });
  });

  describe("Claim", function () {
    it("Claim phần thưởng thành công", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến nửa chặng đường (45 ngày) bằng cách setNextBlockTimestamp.
      3. User1 gọi claim() cho stake đó.
      4. Xác nhận rằng event Claimed được emit với amount reward gần đúng bằng nửa phần thưởng tối đa.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);

      const amount = ethers.parseEther("1000");
      const lockPeriod = 90 * DAY;
      const halfway = lockPeriod / 2;
      const expectedHalfReward = calcReward(amount, 2000n, BigInt(lockPeriod)) / 2n;

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
      const claimTimestamp = Number(stakeInfo.lastClaimTimestamp) + halfway;

      await networkHelpers.time.setNextBlockTimestamp(claimTimestamp);

      await expect(staking.connect(user1).claim(0, 0))
        .to.emit(staking, "Claimed")
        .withArgs(user1.address, 0, 0, expectedHalfReward);
});

    it("Không cho claim khi không có stake", async function () {
      /*
      Bước thực hiện:
      1. User1 chưa stake gì.
      2. User1 gọi claim() với stakeId = 0.5
      3. Giao dịch revert với message "No stake" vì user không có stake nào với stakeId đó.
      */
      const { user1, staking } = await networkHelpers.loadFixture(deployFixture);
      await expect(staking.connect(user1).claim(0, 0)).to.be.revertedWith("No stake");
    });

    it("Không cho claim khi không còn gì để claim", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      3. User1 gọi claim() cho stake đó để claim toàn bộ phần thưởng.
      4. User1 gọi claim() lại lần nữa cho cùng stakeId.
      5. Giao dịch revert với message "Nothing to claim" vì user đã claim hết phần thưởng có thể nhận được.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);

      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
      const unlockTimestamp = Number(stakeInfo.unlockTimestamp);

      // Claim toàn bộ reward tại thời điểm unlock
      await networkHelpers.time.setNextBlockTimestamp(unlockTimestamp);
      await staking.connect(user1).claim(0, 0);

      // Claim lại -> không còn gì để claim nữa
      await expect(
        staking.connect(user1).claim(0, 0)
      ).to.be.revertedWith("Nothing to claim");
    });

   it("Cập nhật đúng rewardClaimed và totalRewardDebt sau khi claim", async function () {
    /*
    Bước thực hiện:
    1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
    2. Fast forward thời gian đến nửa chặng đường (45 ngày) bằng cách setNextBlockTimestamp.
    3. User1 gọi claim() cho stake đó.
    4. Xác nhận rằng rewardClaimed của stake đó được cập nhật gần đúng bằng nửa phần thưởng tối đa.
    5. Xác nhận rằng totalRewardDebt của contract giảm đi gần đúng bằng nửa phần thưởng tối đa.
    */
    const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
    const amount = ethers.parseEther("1000");

    await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
    await staking.connect(user1).stake(amount, 0);

    const debtBefore = await staking.totalRewardDebt();
    const before = await staking.userStakeHistory(user1.address, 0, 0);

    const halfway = Math.floor(Number(before.lockPeriod) / 2);
    const claimTimestamp = Number(before.lastClaimTimestamp) + halfway;
    const halfReward = before.rewardTotal / 2n;

    await networkHelpers.time.setNextBlockTimestamp(claimTimestamp);
    await staking.connect(user1).claim(0, 0);

    const stakeInfo = await staking.userStakeHistory(user1.address, 0, 0);
    const debtAfter = await staking.totalRewardDebt();

    expect(stakeInfo.rewardClaimed).to.equal(halfReward);
    expect(stakeInfo.lastClaimTimestamp).to.equal(claimTimestamp);
    expect(debtAfter).to.equal(debtBefore - halfReward);
  });

  });

  describe("Withdraw", function () {
    it("Withdraw thành công sau khi hết thời gian khóa", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      3. User1 gọi withdraw(0,0) cho stake đó (packageId = 0, stakeId = 0 -> lần rút stake đầu tiên của user1 trong package 0).
      Exp: Giao dịch thành công, event Withdrawn được emit với amount rút gần bằng 1000 token và reward gần bằng phần thưởng tối đa. User1 nhận lại token đã stake + phần thưởng.

      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const fullReward = calcReward(amount, 2000n, BigInt(90 * DAY));

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(90 * DAY + 1);

      await expect(staking.connect(user1).withdraw(0, 0))
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, 0, 0, amount, fullReward);
    });

    it("Không thể rút token khi vẫn đang khóa", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến giữa chừng (45 ngày) bằng cách setNextBlockTimestamp.
      3. User1 gọi withdraw(0,0) cho stake đó.
      Exp: Giao dịch revert với message "Locked" vì vẫn đang trong thời gian khóa.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      await expect(staking.connect(user1).withdraw(0, 0)).to.be.revertedWith("Locked");
    });

    it("Giảm đúng totalLocked, totalRewardDebt, userTotalStakes, packageTotalStaked sau khi rút", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      3. User1 gọi withdraw(0,0) cho stake đó.
      Exp: Giao dịch thành công. Sau khi rút, totalLocked, totalRewardDebt của contract đều giảm về 0. userTotalStakes của User1 giảm về 0. packageTotalStaked của package 0 giảm về 0.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const reward = calcReward(amount, 2000n, BigInt(90 * DAY));

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(90 * DAY + 1);
      await staking.connect(user1).withdraw(0, 0);

      expect(await staking.totalLocked()).to.equal(0);
      expect(await staking.totalRewardDebt()).to.equal(0);
      expect(await staking.userTotalStakes(user1.address)).to.equal(0);
      expect(await staking.packageTotalStaked(0)).to.equal(0);

      // Sanity check that reward was really accounted for.
      expect(reward).to.be.gt(0);
    });

    it("Withdraw sau khi claim hết phần thưởng", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      3. User1 gọi claim() để claim toàn bộ phần thưởng.
      4. User1 gọi withdraw(0,0) cho stake đó.
      Exp: Giao dịch thành công, event Withdrawn được emit với amount rút gần bằng 1000 token và reward = 0. 
      User1 nhận lại token đã stake, không nhận thêm reward nào vì đã claim hết từ trước.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(90 * DAY);
      await staking.connect(user1).claim(0, 0);

      await expect(staking.connect(user1).withdraw(0, 0))
        .to.emit(staking, "Withdrawn")
        .withArgs(user1.address, 0, 0, amount, 0);
    });
  });

  describe("Emergency withdraw", function () {
    it("Chỉ cho phép rút khẩn cấp khi hợp đồng đã bị tạm dừng", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. User1 gọi emergencyWithdraw(0,0) cho stake đó khi contract đang hoạt động bình thường.
      Expect 1: Giao dịch revert với message "Not paused" vì contract chưa bị tạm dừng.
      3. Admin gọi pause() để tạm dừng contract.
      4. User1 gọi emergencyWithdraw(0,0) lại lần nữa.
      Expect 2: Giao dịch thành công, event EmergencyWithdrawn được emit với các thông số đúng.
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      await expect(staking.connect(user1).emergencyWithdraw(0, 0)).to.be.revertedWith("Not paused");
      await staking.connect(admin).pause();
      await expect(staking.connect(user1).emergencyWithdraw(0, 0)).to.emit(staking, "EmergencyWithdrawn");
    });

    it("Emergency withdraw trả gốc + reward đã tích lũy, mất reward chưa tích lũy", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến giữa chừng (45 ngày) bằng cách setNextBlockTimestamp.
      3. Admin gọi pause() để tạm dừng contract.
      4. User1 gọi emergencyWithdraw(0,0) cho stake đó.
      Exp: Giao dịch thành công, event EmergencyWithdrawn được emit với amount rút gần bằng 1000 token, 
      accruedReward gần bằng nửa phần thưởng tối đa, 
      forfeitedReward gần bằng nửa phần thưởng tối đa.
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      const before = await staking.userStakeHistory(user1.address, 0, 0);
      const halfway = Math.floor(Number(before.lockPeriod) / 2);
      const withdrawTimestamp = Number(before.lastClaimTimestamp) + halfway;

      const accruedReward = before.rewardTotal / 2n;
      const forfeitedReward = before.rewardTotal - accruedReward;

      await staking.connect(admin).pause();
      await networkHelpers.time.setNextBlockTimestamp(withdrawTimestamp);

      await expect(staking.connect(user1).emergencyWithdraw(0, 0))
        .to.emit(staking, "EmergencyWithdrawn")
        .withArgs(user1.address, 0, 0, amount, accruedReward, forfeitedReward);
    });

    it("totalRewardDebt giảm đúng bằng toàn bộ reward debt của stake đã rút khẩn cấp", async function () {
      /*
      - accruedReward = phần thưởng đã tích lũy được tại thời điểm rút khẩn cấp (tính theo thời gian đã trôi qua).
      - forfeitedReward = phần thưởng bị mất do rút khẩn cấp (tính theo phần thời gian còn lại của lock period).
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến giữa chừng (45 ngày) bằng cách setNextBlockTimestamp.
      3. Admin gọi pause() để tạm dừng contract.
      4. User1 gọi emergencyWithdraw(0,0) cho stake đó.
      Exp: 
      - Giao dịch thành công
      - totalRewardDebt sau khi rút khẩn cấp giảm bằng toàn bộ reward của stake đó (full reward)
      - lostReward > 0 để xác nhận đây đúng là trường hợp rút khẩn cấp giữa chừng, user mất phần reward chưa tích lũy được.
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      const fullReward = calcReward(amount, 2000n, BigInt(90 * DAY));
      const accruedReward = fullReward / 2n;
      const lostReward = fullReward - accruedReward;

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      const debtBefore = await staking.totalRewardDebt();
      await networkHelpers.time.increase(45 * DAY);
      await staking.connect(admin).pause();
      await staking.connect(user1).emergencyWithdraw(0, 0);
      const debtAfter = await staking.totalRewardDebt();

      expect(debtAfter).to.equal(debtBefore - fullReward);
      expect(lostReward).to.be.gt(0);
    });

    it("Kiểm tra event EmergencyWithdrawn ghi nhận đúng giá trị lost reward", async function () {
      /*
      Bước thực hiện:
      1. User1 stake 1000 token vào package 0 (90 ngày, APY 20%).
      2. Fast forward thời gian đến 1/3 chặng đường (30 ngày) bằng cách setNextBlockTimestamp.
      3. Admin gọi pause() để tạm dừng contract.
      4. User1 gọi emergencyWithdraw(0,0) cho stake đó.
      Exp: Giao dịch thành công, event EmergencyWithdrawn được emit với amount rút gần bằng 1000 token,
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      const before = await staking.userStakeHistory(user1.address, 0, 0);
      const withdrawTimestamp = Number(before.lastClaimTimestamp) + 30 * DAY;

      const accruedReward = (before.rewardTotal * 30n) / 90n;
      const lostReward = before.rewardTotal - accruedReward;

      await staking.connect(admin).pause();
      await networkHelpers.time.setNextBlockTimestamp(withdrawTimestamp);

      await expect(staking.connect(user1).emergencyWithdraw(0, 0))
        .to.emit(staking, "EmergencyWithdrawn")
        .withArgs(user1.address, 0, 0, amount, accruedReward, lostReward);
    });
  });

  describe("Pause / Unpause", function () {
    it("Kiểm tra chỉ tài khoản admin được phép pause và unpause", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với admin, user1, staking.
      2. User1 gọi pause() -> giao dịch revert vì không có quyền.
      3. Admin gọi pause() -> giao dịch thành công.
      4. User1 gọi unpause() -> giao dịch revert vì không có quyền.
      5. Admin gọi unpause() -> giao dịch thành công.
      */
      const { admin, user1, staking } = await networkHelpers.loadFixture(deployFixture);

      await expect(staking.connect(user1).pause()).to.be.revert(ethers);
      await expect(staking.connect(admin).pause()).to.not.be.revert(ethers);

      await expect(staking.connect(user1).unpause()).to.be.revert(ethers);
      await expect(staking.connect(admin).unpause()).to.not.be.revert(ethers);
    });

    it("Kiểm tra không cho phép stake/claim/withdraw khi contract đã bị pause", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với admin, user1, staking, stakeToken.
      2. User1 stake 1000 token vào package 0 -> thành công.
      3. Admin gọi pause() để tạm dừng contract.
      4. User1 gọi stake() lại lần nữa -> giao dịch revert vì contract đang bị tạm dừng.
      5. User1 gọi claim() -> giao dịch revert vì contract đang bị tạm dừng.
      6. User1 gọi withdraw() -> giao dịch revert vì contract đang bị tạm dừng.
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await staking.connect(admin).pause();

      await expect(staking.connect(user1).stake(amount, 0)).to.be.revert(ethers);
      await expect(staking.connect(user1).claim(0, 0)).to.be.revert(ethers);
      await expect(staking.connect(user1).withdraw(0, 0)).to.be.revert(ethers);
    });
  });

  describe("Views", function () {
    it("Kiểm tra hàm getClaimableRewardsForStake trả về 0 khi user chưa stake", async function () {
      /*Bước thực hiện:
      1. Khởi tạo contract với user1, staking.
      2. Gọi getClaimableRewardsForStake(user1.address, 0, 0) khi user1 chưa stake gì.
      Exp: Hàm trả về 0 vì user chưa có stake nào với stakeId đó.
      */
      const { user1, staking } = await networkHelpers.loadFixture(deployFixture);
      expect(await staking.getClaimableRewardsForStake(user1.address, 0, 0)).to.equal(0);
    });

    it("Kiểm tra hàm getClaimableRewardsForStake chỉ trả về tối đa số reward còn lại", async function () {
      /*Bước thực hiện:
      1. Khởi tạo contract với user1, staking, stakeToken.
      2. User1 stake 1000 token vào package 0 -> thành công.
      3. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      4. User1 gọi claim() để claim một phần reward
      5. Fast forward thời gian thêm 180 ngày nữa để đảm bảo đã vượt thời gian khóa và phần reward còn lại đã tích lũy đủ.
      3. Gọi getClaimableRewardsForStake(user1.address, 0, 0) và kiểm tra giá trị trả về.
      Exp: Giá trị trả về không được vượt quá số reward còn lại trong package.
      */
     //Arrange: Khởi tạo dữ liệu kiểm thử và tạo stake ban đầu
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");

      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);

      //Tăng thời gian đến giữa kì và claim 1 phần reward
      const before = await staking.userStakeHistory(user1.address, 0, 0);
      const firstClaimTimestamp = Number(before.lastClaimTimestamp) + 45 * DAY;

      await networkHelpers.time.setNextBlockTimestamp(firstClaimTimestamp);
      await staking.connect(user1).claim(0, 0);

      //Chuẩn bị dữ liệu kì vọng sau khi đã clam 1 phần
      const afterClaim = await staking.userStakeHistory(user1.address, 0, 0);
      const unlockTimestamp = Number(afterClaim.unlockTimestamp);

      //Tăng thời gian vượt quá thời điểm unlock
      await networkHelpers.time.setNextBlockTimestamp(unlockTimestamp + 180 * DAY);
      await networkHelpers.mine();
      //Gọi hàm lấy số reward có thể claim được tại thời điểm này
      const claimable = await staking.getClaimableRewardsForStake(user1.address, 0, 0);

      const claimUntil = BigInt(unlockTimestamp); // vì đã vượt unlock, hàm sẽ cap ở unlock
      const elapsed = claimUntil - BigInt(afterClaim.lastClaimTimestamp);
      const reward = (afterClaim.rewardTotal * elapsed) / BigInt(afterClaim.lockPeriod);
      const remaining = afterClaim.rewardTotal - afterClaim.rewardClaimed;
      const expected = reward > remaining ? remaining : reward;

      //Assert: Kiểm tra giá trị trả về có đúng như kì vọng không
      expect(claimable).to.equal(expected);
    });

    it("Kiểm tra hàm getStakeCount trả về số lượng stake đúng", async function () {
      /*Bước thực hiện:
      1. Khởi tạo contract với user1, staking, stakeToken.
      2. Thiết lập số lượng stake là 1000 token
      3. Sử dụng account user1 gọi hàm approve() để cấp quyền cho contract được sử dụng 2000 token
      4. Gọi getStakeCount(user1.address, 0) để kiểm tra số lượng stake ban đầu, exp: trả về 0.
      5. User1 gọi stake() để tạo 1 stake đầu tiên vào package 0.
      6. Gọi getStakeCount(user1.address, 0) để kiểm tra số lượng stake sau khi tạo stake đầu tiên, exp: trả về 1.
      7. User1 gọi stake() để tạo thêm 1 stake nữa vào package 0.
      8. Gọi getStakeCount(user1.address, 0) để kiểm tra số lượng stake sau khi tạo stake thứ hai, exp: trả về 2.
      9. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      10. User1 gọi withdraw(0,0) để rút stake đầu tiên.
      11. Gọi getStakeCount(user1.address, 0) để kiểm tra số lượng stake sau khi rút stake đầu tiên, exp: vẫn trả về 2 vì dù đã rút nhưng thông tin stake vẫn còn trong lịch sử.
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount * 2n);

      expect(await staking.getStakeCount(user1.address, 0)).to.equal(0);
      await staking.connect(user1).stake(amount, 0);
      expect(await staking.getStakeCount(user1.address, 0)).to.equal(1);
      await staking.connect(user1).stake(amount, 0);
      expect(await staking.getStakeCount(user1.address, 0)).to.equal(2);
      await networkHelpers.time.increase(90 * DAY + 1);
      await staking.connect(user1).withdraw(0, 0);
      expect(await staking.getStakeCount(user1.address, 0)).to.equal(2);
    });
  });

  describe("Gas profiling", function () {
    it("Kiểm tra giao dịch stake() tiêu tốn gas hợp lệ", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với user1, staking, stakeToken.
      2. Thiết lập số lượng stake là 1000 token
      3. User1 gọi approve() để cấp quyền cho staking contract sử dụng token của user1.
      4. User1 gọi stake() để tạo 1 stake vào package 0.
      5. Ghi nhận lượng gas tiêu tốn cho giao dịch stake() và kiểm tra giá trị gasUsed của giao dịch.
      Exp: gasUsed phải lớn hơn 0
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      const tx = await staking.connect(user1).stake(amount, 0);
      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.gt(0);
    });

    it("Kiểm tra giao dịch claim() tiêu tốn gas hợp lệ", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với user1, staking, stakeToken.
      2. User1 stake 1000 token vào package 0.
      3. Fast forward thời gian đến giữa chừng (45 ngày) bằng cách setNextBlockTimestamp.
      4. User1 gọi claim() cho stake đó.
      5. Ghi nhận lượng gas tiêu tốn cho giao dịch claim() và kiểm tra giá trị gasUsed của giao dịch.
      Exp: gasUsed phải lớn hơn 0
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(45 * DAY);
      const tx = await staking.connect(user1).claim(0, 0);
      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.gt(0);
    });

    it("Kiểm tra giao dịch withdraw() tiêu tốn gas hợp lệ", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với user1, staking, stakeToken.
      2. User1 stake 1000 token vào package 0.
      3. Fast forward thời gian đến sau khi unlock (90 ngày + 1) bằng cách setNextBlockTimestamp.
      4. User1 gọi withdraw(0,0) cho stake đó.
      5. Ghi nhận lượng gas tiêu tốn cho giao dịch withdraw() và kiểm tra giá trị gasUsed của giao dịch.
      Exp: gasUsed phải lớn hơn 0
      */
      const { user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(90 * DAY + 1);
      const tx = await staking.connect(user1).withdraw(0, 0);
      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.gt(0);
    });

    it("Kiểm tra giao dịch emergencyWithdraw() tiêu tốn gas hợp lệ", async function () {
      /*
      Bước thực hiện:
      1. Khởi tạo contract với admin, user1, staking, stakeToken.
      2. User1 stake 1000 token vào package 0.
      3. Fast forward thời gian đến giữa chừng (30 ngày) bằng cách setNextBlockTimestamp.
      4. Admin gọi pause() để tạm dừng contract.
      5. User1 gọi emergencyWithdraw(0,0) cho stake đó.
      6. Ghi nhận lượng gas tiêu tốn cho giao dịch emergencyWithdraw() và kiểm tra giá trị gasUsed của giao dịch.
      Exp: gasUsed phải lớn hơn 0
      */
      const { admin, user1, staking, stakeToken } = await networkHelpers.loadFixture(deployFixture);
      const amount = ethers.parseEther("1000");
      await stakeToken.connect(user1).approve(await staking.getAddress(), amount);
      await staking.connect(user1).stake(amount, 0);
      await networkHelpers.time.increase(30 * DAY);
      await staking.connect(admin).pause();
      const tx = await staking.connect(user1).emergencyWithdraw(0, 0);
      const receipt = await tx.wait();
      expect(receipt!.gasUsed).to.be.gt(0);
    });
  });
});
