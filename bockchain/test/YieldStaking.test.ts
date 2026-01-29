import { expect } from "chai";
import { ethers } from "hardhat";
import { YieldStaking__factory } from "../typechain-types";
//import { ERC20__factory } from "../typechain-types";


describe("YieldStaking", () => {
        it("deploys with valid admin/operator and token addresses", async () => { //1
            //1. Lấy các account
            const [admin, operator, user] = await ethers.getSigners(); 

            //2. Lấy factory của contract MockERC20
            const Token = await ethers.getContractFactory("MockERC20");
            
            //3. Deploy stakeToken
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000"));
            await stakeToken.waitForDeployment(); 

            //4. Deploy rewardToken
            const rewardToken = await Token.deploy(
                "Reward Token",
                "RWD",
                18,
                ethers.parseEther("1000000")
            );
            await rewardToken.waitForDeployment();

            //5. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                rewardToken.target
            );
            await staking.waitForDeployment();

            //6. Kiểm tra contract có lưu đúng địa chỉ stakeToken, rewardToken không
            expect(await staking.stakeToken()).to.equal(stakeToken.target);
            expect(await staking.rewardToken()).to.equal(rewardToken.target);

            //7. Kiểm tra admin và operator có được cấp đúng role không
            const ADMIN_ROLE = await staking.ADMIN_ROLE();
            const OPERATOR_ROLE = await staking.OPERATOR_ROLE();

            expect(await staking.hasRole(ADMIN_ROLE, admin.address)).to.equal(true);
            expect(await staking.hasRole(OPERATOR_ROLE, operator.address)).to.equal(true);
        });

        it("reverts when admin/operator is zero address", async () => { //2
            //1. Lấy các account
            const [admin, operator] = await ethers.getSigners();

            //2. Deploy mock tokens
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            const rewardToken = await Token.deploy(
                "Reward Token",
                "RWD",
                18,
                ethers.parseEther("1000000")
            );
            await rewardToken.waitForDeployment();

            //3. deploy với admin = zero address 
            await expect(
                new YieldStaking__factory(admin).deploy(
                    ethers.ZeroAddress,
                    operator.address,
                    stakeToken.target,
                    rewardToken.target
                )
            ).to.be.revertedWith("Invalid role");

            //4. deploy với operator = zero address
            await expect(
                new YieldStaking__factory(admin).deploy(
                    admin.address,
                    ethers.ZeroAddress,
                    stakeToken.target,
                    rewardToken.target
                )
            ).to.be.revertedWith("Invalid role");
        });

        it("reverts when stakeToken or rewardToken is zero address", async() => { //3
            const [admin, operator] = await ethers.getSigners();

            //1. Deploy mock tokens
            const Token = await ethers.getContractFactory("MockERC20");

            const validToken = await Token.deploy(
                "Valid Token",
                "VLD",
                18,
                ethers.parseEther("1000000")
            );
            await validToken.waitForDeployment();

            //2. deploy với stakeToken = zero address
            await expect(
                new YieldStaking__factory(admin).deploy(
                    admin.address,
                    operator.address,
                    ethers.ZeroAddress,
                    validToken.target
                )
            ).to.be.revertedWith("Invalid stake token");

            //3. deploy với rewardToken = zero address
            await expect(
                new YieldStaking__factory(admin).deploy(
                    admin.address,
                    operator.address,
                    validToken.target,
                    ethers.ZeroAddress
                )
            ).to.be.revertedWith("Invalid reward token");

        });

        it("initializes default packages (0..3) correctly", async () => {
        //kiểm tra default packages được khởi tạo đúng: refer dòng 112 -> 116

            const [admin, operator] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            const rewardToken = await Token.deploy(
                "Reward Token",
                "RWD",
                18,
                ethers.parseEther("1000000")
            );
            await rewardToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const YieldStaking = await ethers.getContractFactory("YieldStaking");
            const staking = await YieldStaking.deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                rewardToken.target
            );
            await staking.waitForDeployment();

            //3. Check default packages 0...3
            const pk0 = await staking.packages(0);
            expect(pk0.lockPeriod).to.equal(90*24*60*60); // lockPeriod có đúng 90 days không
            expect(pk0.apy).to.equal(2000); // apy có đúng 20% không
            expect(pk0.enabled).to.equal(true);// enabled có đúng true không

            const pk1 = await staking.packages(1);
            expect(pk1.lockPeriod).to.equal(180*24*60*60); // 180 days
            expect(pk1.apy).to.equal(2500); // 25%
            expect(pk1.enabled).to.equal(true);

            const pk2 = await staking.packages(2);
            expect(pk2.lockPeriod).to.equal(270*24*60*60); // 270 days
            expect(pk2.apy).to.equal(3500); // 35%
            expect(pk2.enabled).to.equal(true);

            const pk3 = await staking.packages(3);
            expect(pk3.lockPeriod).to.equal(360*24*60*60); // 360 days
            expect(pk3.apy).to.equal(5000); // 50%
            expect(pk3.enabled).to.equal(true);
        });
    });

    //Test chức năng Admin cấu hình package staking: line 127
    describe("Admin: setPackage", () => {
        it("updates package config and emits PackageUpdated", async() => {
        //Test update package config thành công và event PackageUpdated phải được emit
            const [admin, operator] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Admin update package 0
            const newLockPeriod = 180 * 24 * 60 * 60; // 180 days
            const newApy = 3000; // 30%
            const newEnabled = false;

            await expect(
                staking.connect(admin).setPackage(
                    0,
                    newLockPeriod,
                    newApy,
                    newEnabled
                )
            )
                .to.emit(staking, "PackageUpdated")
                .withArgs(0, newLockPeriod, newApy, newEnabled);

            //4. Kiểm tra package 0 đã được cập nhật đúng
            const pk0 = await staking.packages(0);
            expect(pk0.lockPeriod).to.equal(newLockPeriod);
            expect(pk0.apy).to.equal(newApy);
            expect(pk0.enabled).to.equal(newEnabled);
        });

        it("disables staking when enabled=false", async() => {
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Admin disable package 0
            await staking.connect(admin).setPackage(
                0, 
                90*24*60*60, 
                2000, 
                false);
            
            //4. Chuyển token cho user để stake
            await stakeToken.transfer(
                user.address,
                ethers.parseEther("1000")
            );
            await stakeToken.connect(user).approve(
                staking.target,
                ethers.parseEther("1000")
            );

            //5. User stake -> revert
            await expect(
                staking.connect(user).stake(
                    ethers.parseEther("500"),
                    0
                )
            ).to.be.revertedWith("Invalid package");
        });

        it("reverts when lockPeriod is zero", async() => {
        // Kiểm tra admin không thể set package với lockPeriod = 0: line 133
            const [admin, operator] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Admin set package với lockPeriod = 0 -> revert
            await expect(
                staking.connect(admin).setPackage(
                    0, //packageId
                    0, //lockPeriod
                    2000,
                    true
                )
            ).to.be.revertedWith("Invalid lock period");
        });

        it("reverts when apy > 10000 bps", async() => {
        //Check admin không thể set package với apy > 10000 bps (100%): line 134
            const [admin, operator] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Admin set package với apy > 10000 bps -> revert
            await expect(
                staking.connect(admin).setPackage(
                    0, //packageId
                    90*24*60*60, //lockPeriod
                    10001, //apy
                    true
                )
            ).to.be.revertedWith("APY too high");
        });

        it("prevents non-admin from updating package", async() => {
        //Check non-admin không thể update package
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. non-admin gọi setPackage -> revert
            await expect(
                staking.connect(user).setPackage(
                    0,
                    90*24*60*60,
                    2000,
                    true
                )
            ).to.be.revertedWithCustomError(
                staking,
                "AccessControlUnauthorizedAccount" );
        });
    });

    describe("Stake", () => {
        it("stakes successfully and emits Staked with rewardTotal snapshot", async() => {
        // Test stake thành công và emit Staked với rewardTotal snapshot (giá trị rewardTotal tại thời điểm stake)
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            const rewardToken = stakeToken; // Sử dụng cùng token

            //2. Deploy YieldStaking contract
            const staking:any = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                rewardToken.target
            );
            await staking.waitForDeployment();

            //3. Cấp token cho user
            const stakeAmount = ethers.parseEther("500");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            //4. Lấy package 0
            const pk0 = await staking.packages(0);
            
            //rewardTotal = amount * apy * lockPeriod / (10000 * 365 days)
            const expectedRewardTotal =
                (stakeAmount *
                    BigInt(pk0.apy) *
                    BigInt(pk0.lockPeriod)) /
                (BigInt(365 * 24 * 60 * 60) * 10_000n);
            
            //5. User stake và check event
            await expect(
                staking.connect(user).stake(stakeAmount, 0)
            )
                .to.emit(staking, "Staked")
                .withArgs(
                    user.address,
                    0, //packageId
                    0, //stakeId
                    stakeAmount,
                    expectedRewardTotal
                );
            //6. Check snapshot rewardTotal trong storage
            const stakeInfo = await staking.userStakeHistory(
                user.address,
                0, // packageId
                0  // stakeId
);

expect(stakeInfo.rewardTotal).to.equal(expectedRewardTotal);

        });

        it("reverts when package is disable or not configured", async() => {
        // Test revert khi package bị disable hoặc không được cấu hình - line 166, 167
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            const rewardToken = stakeToken; // Sử dụng cùng token

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //4. Case 1: package disable
            await staking.connect(admin).setPackage(
                0,
                90*24*60*60, //lockPeriod
                2000, //apy
                false //disable
            );
            await expect(
                staking.connect(user).stake(stakeAmount, 0)
            ).to.be.revertedWith("Invalid package");

            //5. Case 2: package chưa được cấu hình
            await expect(
                staking.connect(user).stake(stakeAmount, 99) //packageId = 99 không tồn tại
            ).to.be.revertedWith("Invalid package");    
        });

        it("reverts when amount < minStakeAmount", async() => {
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            const rewardToken = stakeToken; // Sử dụng cùng token

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Cấp token cho user
            const stakeAmount = ethers.parseEther("100"); //< minStakeAmount default = 500 - Line 110
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //4. Stake với ammount < minStakeAmount
            await expect(
                staking.connect(user).stake(stakeAmount, 0)
            ).to.be.revertedWith("Below minimum");
        });

        it("reverts on fee-on-transfer stake token", async () => {
        //Check revert khi stake token có fee on transfer - Line 203
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy fee-on-transfer token
            const FeeToken = await ethers.getContractFactory("MockFeeERC20");
            const stakeToken: any = await FeeToken.deploy(
                "Fee Token",
                "FEE",
                18,
                ethers.parseEther("1000000"),
                100 //1% fee
            );
            await stakeToken.waitForDeployment();
            const rewardToken = stakeToken; // Sử dụng cùng token

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Config package 0 để staking
            await staking.connect(admin).setPackage(
                0,
                90*24*60*60, //lockPeriod
                2000, //apy
                true //enable
            );

            //4.Cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);

            //5. User approve và stake
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. Stake và expect revert
            await expect(
                staking.connect(user).stake(stakeAmount, 0)
            ).to.be.reverted;
        });

        it("enforces maxStakePerUser when set", async() => {
        //Check if maxStakePerUser vượt quá giới hạn -. revert "User cap" - Line 171 - 175 
        //đang có biến maxStakePerUser nhưng không có setter (không có hàm nào để set) -> cần thêm func setMaxStakePerUser
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1_000_000") // 2 billion
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            // 3. Set maxStakePerUser (VD: 1000)
            await staking.connect(admin).setMaxStakePerUser(
                ethers.parseEther("1000")
            );

            // 4. Transfer + approve
            await stakeToken.transfer(
                user.address,
                ethers.parseEther("10000")
            );
            await stakeToken.connect(user).approve(
                staking.target,
                ethers.MaxUint256
            );

            // 5. Stake vượt cap → revert
            await expect(
                staking.connect(user).stake(
                    ethers.parseEther("2000"), // > maxStakePerUser
                    0
                )
            ).to.be.revertedWith("User cap");

        });

        it("enforces maxTotalStakedPerPackage when set", async () => {
        // Check revert khi tổng token stake vào 1 package vượt quá giới hạn
        //----> Tại contract: cần thêm setter cho maxTotalStakedPerPackage (Function setMaxTotalStakedPerPackage)

            const [admin, operator, user1, user2] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000000") //1 billion tokens
            );
            await stakeToken.waitForDeployment();
            const rewardToken = stakeToken; // Sử dụng cùng token

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Cấp rất nhiều token cho 2 user
            await stakeToken.transfer(
                user1.address,
                ethers.parseEther("1000000")
            );
            await stakeToken.transfer(
                user2.address,
                ethers.parseEther("1000000")
            );
            
            await stakeToken.connect(user1).approve(
                staking.target,
                ethers.MaxUint256
            );
            await stakeToken.connect(user2).approve(
                staking.target,
                ethers.MaxUint256
            );

            //4. User1 stake 600k vào package 0
            await staking.connect(user1).stake(
                ethers.parseEther("600000"),
                0
            );

            //5. User 2 stake thêm 600k vào cùng package
            await expect(
                staking.connect(user2).stake(
                    ethers.parseEther("600000"),
                    0
                )
            ).to.be.revertedWith("Package cap");
        });

        it("reverts when stakeId overflows uint32", async () => {
        //Check revert khi stakeId vượt quá uint32 
        //----> Chưa check được case overflow stakeID
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //4. Cấp token +approve
            await stakeToken.transfer(
                user.address,
                ethers.parseEther("1000")
            );
            await stakeToken.connect(user).approve(
                staking.target,
                ethers.MaxUint256
            );

            //5. force overflow stake

            const Max_Uint32 = (2n**32n) - 1n;
            await staking.__setUserStakeCount(
                user.address,
                0,
                Max_Uint32
            );
            await expect(
                staking.connect(user).stake(
                    ethers.parseEther("500"),
                    0
                )
            )
            .to.be.revertedWith("StakeId overflow");
        });

        it("snapshots rewardTotal and lockPeriod from package at stake time", async() => {
        // Check khi user stake, thì rewardTotal và lockPeriod phải được snapshot tại thời điểm stake
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package ban đầu
            const lockPeriod1 = 90*24*60*60;
            const apy1 = 2000;

            await staking.connect(admin).setPackage(
                0,
                lockPeriod1,
                apy1,
                true
            );

            //4. Cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(
                user.address,
                stakeAmount
            );
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //5. User stake
            await staking.connect(user).stake(
                stakeAmount,
                0
            );

            //6. Admin thay đổi package sau khi stake
            const lockPeriod2 = 30*24*60*60;
            const apy2 = 5000; //50%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod2,
                apy2,
                true
            );

            //7. Đọc stake infor
            const stakeInfo = await staking.userStakeHistory(user.address, 0, 0);

            //8. Kiểm tra snapshot
            expect(stakeInfo.lockPeriod).to.equal(lockPeriod1);
            const expectedRewardTotal =
                (stakeAmount *
                    BigInt(apy1) *
                    BigInt(lockPeriod1)) /
                BigInt(365*24*60*60*10000)
            expect(stakeInfo.rewardTotal).to.equal(expectedRewardTotal);
        });
    });

    describe("Claim", () => {
        it("claims linear rewards and emits Claimed", async () => {
        //Check reward claim theo linear và emit event Claimed
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            
            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100; //seconds
            const apy = 10_000; //100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            //4. fund rewardToken cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            //5. User stake
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            await staking.connect(user).stake(stakeAmount,0);

            //6. Tăng thời gian (50% lockPeriof)
            await ethers.provider.send("evm_increaseTime", [50]);
            await ethers.provider.send("evm_mine", []);

            //7. Claim
            const tx = await staking.connect(user).claim(0,0);

            //8. Expect event
            await expect(tx)
                .to.emit(staking, "Claimed");
            
            //9.Check reward = 50%
            const stakeInfo = await staking.userStakeHistory(user.address, 0, 0);

            // rewardTotal = stakeAmount * apy * lockPeriod / YEAR / 10000
            const YEAR = BigInt(365 * 24 * 60 * 60);

            const rewardTotal =
                (stakeAmount *
                    BigInt(apy) *
                    BigInt(lockPeriod)) /
                (YEAR * BigInt(10000));

            // claim 50%
            const expectedClaim =
                (rewardTotal * BigInt(50)) / BigInt(100);

            expect(stakeInfo.rewardClaimed).to.be.closeTo(
                expectedClaim,
                expectedClaim / BigInt(1000) // ~0.1% tolerance
            );
        });

        it("reverts when no stake exists", async() => {
        //Check nếu user claim khi chưa stake
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            
            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            await staking.connect(admin).setPackage(
                0,
                100, // lockPeriod
                1000,// apy
                true
            );
            
            //4. User gọi claim khi chưa stake
            await expect(
                staking.connect(user).claim(0,0)
            ).to.be.revertedWith("No stake")
        });

        it("reverts when nothing to claim", async() => {
        //Check trường hợp chưa có rewaid nào để stake - line 240
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            
            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            await staking.connect(admin).setPackage(
                0,
                100, // lockPeriod
                1000,// apy
                true
            );

            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("1000")
            );

            //5. Cấp token cho user và approve
            const stakeAmount = ethers.parseEther("1000")
            await stakeToken.transfer(user.address, stakeAmount)
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //7. Claim khi chưa có reward
            await expect(
                staking.connect(user).claim(0,0)
            ).to.be.revertedWith("Nothing to claim")
        });

        it("updates rewardClaimed and totalRewardDebt correctly", async() => {
        //Check update rewardClaimed, giảm totalRewardDebt sau khi user đã claim
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            
            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            await staking.connect(admin).setPackage(
                0,
                100, // lockPeriod
                1000,// apy
                true
            );

            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("1000")
            );

            //5. Cấp token cho user và approve
            const stakeAmount = ethers.parseEther("1000")
            await stakeToken.transfer(user.address, stakeAmount)
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //Lấy totalRewarDebt ban đầu
            const totalRewardDebtBefore = await staking.totalRewardDebt();

            //7. Tăng thời gian giả lập để reward sinh ra
            await ethers.provider.send("evm_increaseTime", [500]); // 50% lock
            await ethers.provider.send("evm_mine", []);

            //8. Claim reward
            const tx = await staking.connect(user).claim(0,0);
            const receipt = await tx.wait();

            //9. Lấy event Claimed
            const event = receipt!.logs.find(
            (log: any) => log.fragment?.name === "Claimed"
            );

            expect(event).to.not.be.undefined;
            const claimedAmount = (event as any).args.amount;

            //10. Kiểm tra rewardClaimed
            const stakeInfo = await staking.userStakeHistory(user.address, 0, 0);
            expect(stakeInfo.rewardClaimed).to.equal(claimedAmount);

            //11. Kiểm tra totalRewardDebt giảm đúng
            const totalRewardDebtAfter = await staking.totalRewardDebt();
            expect(totalRewardDebtAfter).to.equal(
                totalRewardDebtBefore - claimedAmount
            );
        });

        it("does not allow claim after full reward claimed", async() => {
        //Check trường hợp user đã claim hết toàn bộ reward, sau đó claim lần nữa
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();
            
            //2. Deploy YieldStaking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000 // 100%

            await staking.connect(admin).setPackage(
                0,
                100, // lockPeriod
                1000,// apy
                true
            );

            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("1000")
            );

            //5. Cấp token cho user và approve
            const stakeAmount = ethers.parseEther("1000")
            await stakeToken.transfer(user.address, stakeAmount)
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //7. Tua thời gian vượt lockPeriod
            await ethers.provider.send("evm_increaseTime", [lockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            //8. Claim lần 1 -> claim hết reward
            await staking.connect(user).claim(0,0);

            //9. Claim lần 2 -> revert
            await expect(
                staking.connect(user).claim(0,0)
            ).to.be.revertedWith("Nothing to claim");
        });

        it("does not change rewards for existing stake when package config changes", async() => {
        //check snapshot tại thời điểm user stake, nếu admin đổi package sau đó, stake cũ không được thay đổi reward
            const [admin, operator, user] = await ethers.getSigners();

            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            // 3. Initial package
            const lockPeriod1 = 90 * 24 * 60 * 60; // 90 days
            const apy1 = 2000; // 20%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod1,
                apy1,
                true
            );

            // 4. Fund reward token
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            // 5. User stake
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            await staking.connect(user).stake(stakeAmount, 0);

            // 6. Admin thay đổi package sau khi stake
            const lockPeriod2 = 30 * 24 * 60 * 60; // 30 days
            const apy2 = 5000; // 50%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod2,
                apy2,
                true
            );

            // 7. Read stake info
            const stakeInfo = await staking.userStakeHistory(user.address, 0, 0);

            // 8. Kiểm tra snapshot stake cũ không đổi
            expect(stakeInfo.lockPeriod).to.equal(lockPeriod1);

            const expectedRewardTotal =
                (stakeAmount *
                    BigInt(apy1) *
                    BigInt(lockPeriod1)) /
                (BigInt(10000) * BigInt(365 * 24 * 60 * 60));

            expect(stakeInfo.rewardTotal).to.equal(expectedRewardTotal);
        });
    });

    describe("Withdraw", () => {
        it("withdraws principal and remaining rewards after unlock", async () => {
        //Check user được rút tiền gốc và reward còn lại sau khi mở khóa - line 260
            const [admin, operator, user] = await ethers.getSigners();

            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; //100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            //5. Cấp token cho user & approve
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //7. Tăng thời gian > lockPeriod
            await ethers.provider.send("evm_increaseTime", [lockPeriod + 1]);
            await ethers.provider.send("evm_mine", []);

            //8. Lấy balance trước khi withdraw
            const userBalanceBefore = await stakeToken.balanceOf(user);

            //9. Withdraw + check event
            const tx = await staking.connect(user).withdraw(0,0);
            await expect(tx).to.emit(staking, "Withdrawn");

            //10. Balance sau withdraw
            const userBalanceAfter = await stakeToken.balanceOf(user.address);

            //11. Balance sau khi withdraw
            const YEAR = 365n * 24n * 60n * 60n;

            const expectedReward =
                (stakeAmount *
                BigInt(apy) *
                BigInt(lockPeriod)) /
                (10_000n * YEAR);

            const expectedTotalReceived = stakeAmount + expectedReward;
            
            //12. Assert user nhận đúng principal + reward
            expect(userBalanceAfter - userBalanceBefore)
                .to.equal(expectedTotalReceived);

            //12. Stake bị clear sau withdraw
            const stakeInfor = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            expect(stakeInfor.balance).to.equal(0);
        });

        it("reverts when still locked", async() => {
        //Check user không thể withdraw nếu chưa hết lockPeriod -- line 260
            const [admin, operator, user] = await ethers.getSigners();

            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; //100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );
            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            //5. Cấp token cho user & approve
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount,0);

            //7. Gọi withdraw ngay lập tức (khi chưa hết lock)
            await expect(
                staking.connect(user).withdraw(0,0)
            ).to.be.revertedWith("Locked")       
        });

        it("reduces totalLocked, totalRewardDebt, userTotalStakes, packageTotalStaked", async() => {
        //Check khi user withdraw thành công, các biến trên phải bị giảm đúng
            const [admin, operator, user] = await ethers.getSigners();
            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; //100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );
            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            //5. Cấp token cho user & approve
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount,0);

            //Snapshot stake trước khi withdraw
            const totalLockedBefore = await staking.totalLocked();
            const totalRewardDebtBefore = await staking.totalRewardDebt();
            const userTotalStakesBefore = await staking.packageTotalStaked(0);
            const packageTotalBefore = await staking.packageTotalStaked(0);

            //7. Tăng thời gian để unlock
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine", []);

            //8. Withdraw
            await staking.connect(user).withdraw(0,0);

            //snapshot stake sau khi withdraw
            const totalLockedAfter = await staking.totalLocked();
            const totalRewardDebtAfter = await staking.totalRewardDebt();
            const userTotalStakesAfter = await staking.userTotalStakes(user.address);
            const packageTotalAfter = await staking.packageTotalStaked(0);

            //9. Kiểm tra
            expect(totalLockedAfter).to.equal(totalLockedBefore - stakeAmount); //totalLock giảm đúng bằng số user rút
            expect(userTotalStakesAfter).to.equal(userTotalStakesBefore - stakeAmount);//Total stake của user update đúng
            expect(packageTotalAfter).to.equal(packageTotalBefore - stakeAmount);//Tổng stake của package giảm tương ứng

            //Check rewardDebt giảm về 0
            expect(totalRewardDebtAfter).to.equal(0);
        });



        it("handles zero remaining reward after full claim", async() => {
        // Check xử lý đúng trường hợp không còn reward sau khi user claim toàn bộ
            const [admin, operator, user] = await ethers.getSigners();
            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; //100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );
            //4. Fund reward token cho contract
            await stakeToken.transfer(
                staking.target,
                ethers.parseEther("10000")
            );

            //5. Cấp token cho user & approve
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //6. User stake
            await staking.connect(user).stake(stakeAmount,0);

            //7. Tăng thời gian để unlock
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine", []);

            //8. Claim toàn bộ reward
            await staking.connect(user).claim(0,0);

            //Check: rewardClaimed = rewardTotal
            const stakeInfoAfterClaim = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            expect(stakeInfoAfterClaim.rewardClaimed)
                .to.equal(stakeInfoAfterClaim.rewardTotal);
            
            //snapshot totalRewardDebt trước withdraw
            const rewardDebtBefore = await staking.totalRewardDebt();

            //9. Withdraw
            await staking.connect(user).withdraw(0, 0);

            //10. Check TotalRewardDebt sau khi user claim/withdraw
            const rewardDebtAfter = await staking.totalRewardDebt();

            //không còn reward để trừ nữa
            expect(rewardDebtAfter).to.equal(rewardDebtBefore);

            //Stake đã bị xóa
            const deletedStake = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            expect(deletedStake.balance).to.equal(0);
        });
    });

    describe("Emergency withdraw", () => {
        it("only operator can emergencyWithdraw", async() => {
        //Check chỉ có operator mới được gọi emergencyWithdraw
            const [admin, operator, user] = await ethers.getSigners();
            ///1. Deploy mock ERC20 token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            await staking.connect(admin).setPackage(
                0,
                100, //lockPeriod
                1000, //apy
                true
            );

            //4. Fund + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(staking.target, ethers.parseEther("10000"));
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);
            
            //5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //6. Pause contract 
            await staking.connect(admin).pause();

            //Case 1: user gọi -> revert
            await expect(
                staking.connect(user).emergencyWithdraw(user.address, 0, 0)
            ).to.be.revertedWithCustomError(
                staking,
                "AccessControlUnauthorizedAccount"
            );

            //Case 2: admin gọi -> revert
            await expect(
                staking.connect(admin).emergencyWithdraw(user.address, 0, 0)
            ).to.be.revertedWithCustomError(
                staking,
                "AccessControlUnauthorizedAccount"
            );

            //Case 3: operator gọi -> pass
            await expect(
                staking.connect(operator).emergencyWithdraw(
                    user.address,
                    0,
                    0
                )
            ).to.emit(staking, "EmergencyWithdrawn");
        });

        it("requires contract to be paused", async() => {
        //Check chỉ khi paused = true thì mới được phép emergencyWithdraw - Line 290 -> 295
            const [admin, operator, user] = await ethers.getSigners();

            // 1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            // 3. Set package hợp lệ
            await staking.connect(admin).setPackage(
            0,
            100,   // lockPeriod
            1000,  // apy
            true
            );

             // 4. Fund reward + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");

            await stakeToken.transfer(staking.target, ethers.parseEther("10000"));
            await stakeToken.transfer(user.address, stakeAmount);

            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //6. Operator gọi emergencyWithdraw khi chưa pause
            await expect(
            staking.connect(operator).emergencyWithdraw(
                user.address,
                0,
                0)
            ).to.be.revertedWith("Not paused");
        });

        it("returns principal only and forfeits reward", async () => {
        //Check chỉ trả lại tiền gốc và mất phần thưởng khi emergencyWithdraw
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();
            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            //4. Fund reward cho contract + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");

            await stakeToken.transfer(staking.target, ethers.parseEther("10000"));
            await stakeToken.transfer(user.address, stakeAmount);

            await stakeToken.connect(user).approve(
                staking.target,
                stakeAmount
            );

            //5. User stake
            await staking.connect(user).stake(stakeAmount,0);

            //Snapshot stake info
            const stakeInfoBefore = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            const expectedLostReward = stakeInfoBefore.rewardTotal;

            // Snapshot balance user trước emergency withdraw
            const userBalanceBefore = await stakeToken.balanceOf(user.address);

            //6. Pause contract
            await staking.connect(admin).pause();

            // 7. Operator gọi emergencyWithdraw
            const tx = await staking.connect(operator).emergencyWithdraw(
            user.address,
            0,
            0);

            // 8. Check event 
            await expect(tx)
                .to.emit(staking, "EmergencyWithdrawn")
                .withArgs(
                    user.address,
                    0,
                    0,
                    stakeAmount,
                    expectedLostReward
                );
            
            //9. User chỉ nhận lại principal
            const userBalanceAfter = await stakeToken.balanceOf(user.address);
            expect(userBalanceAfter).to.equal(userBalanceBefore + stakeAmount);

            //10. Stake bị xóa
            const stakeAfter = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            expect(stakeAfter.balance).to.equal(0);
        });

        it("reduces totalRewardDebt by lost reward", async() => {
        //Check totalRewardDebt -= lostReward - Line 300 -> 302
            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);

            //4. Fund reward + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(staking.target, ethers.parseEther("10000"));
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            //5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //Snapshot stake info
            const stakeInfo = await staking.userStakeHistory(
                user.address,
                0,
                0
            );
            const lostReward = stakeInfo.rewardTotal; // User stake xong chưa gọi claim() lần nào

            //Snapshot totalRewardDebt trước emergencyWithdraw
            const rewardDebtBefore = await staking.totalRewardDebt();

            //6. Pause contract
            await staking.connect(admin).pause();

            //7. Operator gọi emergencyWithdraw
            await staking.connect(operator).emergencyWithdraw(
                user.address,
                0,
                0
            );

            //8. Snapshot totalRewardDebt sau emergencyWithdraw
            const rewardDebtAfter = await staking.totalRewardDebt();

            //9. Check totalRewardDebt giảm đúng bằng lostReward
            expect(rewardDebtAfter).to.equal(
                rewardDebtBefore - lostReward
            );
        });

        it("emits EmergencyWithdrawn with lostReward amount", async() => {
        //Check emit EmergencyWithdrawn với lostReward đúng giá trị
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy staking contract
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                stakeToken.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);

            //4. Fund reward + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(staking.target, ethers.parseEther("10000"));
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            //5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            //6. Lấy stake info để tính lostReward
            const stakeInfo = await staking.userStakeHistory(
                user.address,
                0,
                0
            );

            //Vì chưa claim gì → lostReward = rewardTotal
            const expectedLostReward = stakeInfo.rewardTotal;

            //7. Pause contract
            await staking.connect(admin).pause();

            //8. Operator gọi emergencyWithdraw
            const tx = await staking.connect(operator).emergencyWithdraw(
                user.address,
                0,
                0
            );

            //9. Assert event + lostReward
            await expect(tx)
                .to.emit(staking, "EmergencyWithdrawn")
                .withArgs(
                    user.address,
                    0,                    // packageId
                    0,                    // stakeId
                    stakeAmount,          // principal
                    expectedLostReward    // lostReward
                );
                });
    });
    //Rút Reward dư thừa
    describe("withdrawExcessReward", () => {
        it("reverts when insolvent for same-token stake/reward", async() => {
        //Check withdrawExcessReward khi contract bị insolvent (vỡ nợ / contract ko đủ token để trả) trong trường hợp stakeToken = rewardToken - Line 146 -> 156

            const [admin, operator, user] = await ethers.getSigners();
            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            // 2. Deploy staking (stakeToken = rewardToken)
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target, //
                token.target //
            );
            await staking.waitForDeployment();

            // 3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);

            // 4. Fund token cho user
            const stakeAmount = ethers.parseEther("1000");
            await token.transfer(user.address, stakeAmount);
            await token.connect(user).approve(staking.target, stakeAmount);

            // 5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            /**
             * LÚC NÀY:
             * - Contract balance = stakeAmount
             * - totalLocked = stakeAmount
             * - totalRewardDebt > 0 (do có reward)
             *
             * => balance < totalLocked + totalRewardDebt
             * => insolvent
             */

            // 6. Admin cố withdraw excess reward
            await expect(
                staking.connect(admin).withdrawExcessReward(1)
            ).to.be.revertedWith("Insolvent");
        });

        it("reverts when insolvent for different-token reward", async() => {
        //Line 146 -> 156
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy stake token
            const Token = await ethers.getContractFactory("MockERC20");
            const stakeToken:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await stakeToken.waitForDeployment();

            //2. Deploy reward token
            const rewardToken = await Token.deploy(
                "Reward Token",
                "RWD",
                18,
                ethers.parseEther("1000000")
            );
            await rewardToken.waitForDeployment();

            //3. Deploy staking (stakeToken ≠ rewardToken)
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                stakeToken.target,
                rewardToken.target
            );
            await staking.waitForDeployment();

            //4. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);

            //5. Fund stake token cho user
            const stakeAmount = ethers.parseEther("1000");
            await stakeToken.transfer(user.address, stakeAmount);
            await stakeToken.connect(user).approve(staking.target, stakeAmount);

            //6. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            /**
             * LÚC NÀY:
             * - rewardToken balance của contract = 0
             * - totalRewardDebt > 0 (do stake tạo reward)
             *
             * => balance < totalRewardDebt
             * => insolvent
             */

            //7. Admin cố withdraw excess reward
            await expect(
                staking.connect(admin).withdrawExcessReward(1)
            ).to.be.revertedWith("Insolvent");
            });

        it("allows admin to withdraw only excess rewards and emits event", async() => {
        //Check admin chỉ được rút reward dư và phải emit event - Line 150, 150; 158, 159
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            //2. Deploy staking (stakeToken = rewardToken)
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);

            //4. User stake
            const stakeAmount = ethers.parseEther("1000");
            await token.transfer(user.address, stakeAmount);
            await token.connect(user).approve(staking.target, stakeAmount);
            await staking.connect(user).stake(stakeAmount, 0);

            //5. Fund excess reward
            //rewardDebt < balance - totalLocked
            await token.transfer(
                staking.target,
                ethers.parseEther("5000")
            );

            //6. Snapshot state
            const totalLocked = await staking.totalLocked();
            const totalRewardDebt = await staking.totalRewardDebt();
            const balanceBefore = await token.balanceOf(staking.target);
            const adminBalanceBefore = await token.balanceOf(admin.address);

            //excess = balance - totalLocked - totalRewardDebt
            const excess = balanceBefore - totalLocked - totalRewardDebt;
            expect(excess).to.be.gt(0n);

            //7. Rút 1.2 excess
            const exessWithdrawAmount = excess / 2n;

            //8. Admin withdraw excess reward
            const tx = await staking
                .connect(admin)
                .withdrawExcessReward(exessWithdrawAmount);

            //9. Check event
            await expect(tx)
                .to.emit(staking, "ExcessRewardWithdrawn")
                .withArgs(admin.address, exessWithdrawAmount);

            //10. Check balance admin nhận đúng
            const adminBalanceAfter = await token.balanceOf(admin.address);
            expect(adminBalanceAfter).to.equal(adminBalanceBefore + exessWithdrawAmount);

            //11. Check contract balance giảm đúng
            const balanceAfter = await token.balanceOf(staking.target);
            expect(balanceAfter).to.equal(
                balanceBefore - exessWithdrawAmount
            );

            //12. Check contract vẫn còn đủ token để trả principal + reward (solvent)
            expect(balanceAfter).to.be.gte(
                totalLocked + totalRewardDebt
            );
        });

        it("reverts when non-admin calls withdrawExcessReward", async() => {
        //Check revert khi non-admin gọi withdrawExcessReward
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );            
            await token.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Fund token cho contract để tránh fail vì insolvent
            await token.transfer(
                staking.target,
                ethers.parseEther("1000")
            );

            //4. Non-admin (operator) gọi withdrawExcessReward -> revert
            await expect(
                staking
                    .connect(user)
                    .withdrawExcessReward(ethers.parseEther("1"))
            ).to.be.reverted;
            });
    });

    describe("Pause / Unpause", () => {
        it("only admin can pause and unpause", async() => {
        //Line 119 -> 125
            const [admin, operator, user] = await ethers.getSigners();

            // 1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //Case 1: PAUSE

            // Non-admin cannot pause
            await expect(
                staking.connect(user).pause()
            ).to.be.reverted;

            // Admin can pause
            await expect(
                staking.connect(admin).pause()
            ).to.emit(staking, "Paused");

            expect(await staking.paused()).to.equal(true);

            //Case 2: UNPAUSE

            // Non-admin cannot unpause
            await expect(
                staking.connect(operator).unpause()
            ).to.be.reverted;

            // Admin can unpause
            await expect(
                staking.connect(admin).unpause()
            ).to.emit(staking, "Unpaused");

            expect(await staking.paused()).to.equal(false);
        });

        it("reverts stake/claim/withdraw when paused", async() => {
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Setup package
            await staking.connect(admin).setPackage(
                0,
                100,       // lockPeriod
                10_000,    // 100% APY
                true
            );

            const stakeAmount = ethers.parseEther("1000");

            //4. Fund + approve
            await token.transfer(user.address, stakeAmount);
            await token.transfer(staking.target, ethers.parseEther("10000"));

            await token.connect(user).approve(staking.target, stakeAmount);

            //5. User stake (khi chưa pause)
            await staking.connect(user).stake(stakeAmount, 0);

            //6. Pause contract
            await staking.connect(admin).pause();
            expect(await staking.paused()).to.equal(true);

            //Case 1: stake
            await expect(
                staking.connect(user).stake(stakeAmount, 0)
            ).to.be.revertedWithCustomError(staking, "EnforcedPause");

            //Case 2: claim
            await expect(
                staking.connect(user).claim(0, 0)
            ).to.be.revertedWithCustomError(staking, "EnforcedPause");

            //Case 3: withdraw
            await expect(
                staking.connect(user).withdraw(0, 0)
            ).to.be.revertedWithCustomError(staking, "EnforcedPause");
        });
    });

    describe("Views", () => {
        it("getClaimableRewardsForStake returns 0 when no stake", async() => {
        //Check khi user chưa stake -> hàm getClaimableRewardsForStake phải return 0 - Line 321 - 338
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Call view function without any stake
            const claimable = await staking.getClaimableRewardsForStake(
                user.address,
                0, // packageId
                0  // stakeId
            );

            //4. Assert
            expect(claimable).to.equal(0);
        });

        it("getClaimableRewardsForStake caps at remaining reward", async() => {
        //Check chỉ cho phép user claim <= tổng reward mà stake đó được hưởng - Line 332 - 337
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token: any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Setup package
            const lockPeriod = 100; // seconds
            const apy = 10_000;     // 100%
            await staking.connect(admin).setPackage(0, lockPeriod, apy, true);
            const stakeAmount = ethers.parseEther("1000");

            //4. Fund + approve
            await token.transfer(user.address, stakeAmount);
            await token.transfer(staking.target, ethers.parseEther("10000"));
            await token.connect(user).approve(staking.target, stakeAmount);

            // 5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            // 6. Fast-forward time gần hết lockPeriod
            await ethers.provider.send("evm_increaseTime", [90]);
            await ethers.provider.send("evm_mine", []);

            // 7. Claim phần lớn reward
            await staking.connect(user).claim(0, 0);

            const stakeInfoAfterClaim = await staking.userStakeHistory(
                user.address,
                0,
                0
            );

            const remainingReward = stakeInfoAfterClaim.rewardTotal - stakeInfoAfterClaim.rewardClaimed;

            // 8. Fast-forward vượt unlock
            await ethers.provider.send("evm_increaseTime", [100]);
            await ethers.provider.send("evm_mine", []);

            // 9. Call view function
            const claimable = await staking.getClaimableRewardsForStake(
                user.address,
                0,
                0
            );

            // 10. Assert: reward được trả ra không bao giờ vượt quá phần thưởng còn lại
            expect(claimable).to.equal(remainingReward);
        });

        it("getStakeCount returns monotonic counter", async() => {
        //Check số lượng stake của user chỉ tăng theo time, không bị giảm or reset
            const [admin, operator, user] = await ethers.getSigners();

            //1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            //2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            //3. Setup package
            await staking.connect(admin).setPackage(
                0,
                100,      // lockPeriod
                10_000,   // 100% APY
                true
            );
            const stakeAmount = ethers.parseEther("1000");

            //4. Fund cho contract và user, user approve contract quyền lấy token
            await token.transfer(staking.target, ethers.parseEther("10000"));
            await token.transfer(user.address, stakeAmount * 3n);
            await token.connect(user).approve(staking.target, stakeAmount * 3n);

            // Stake #0
            await staking.connect(user).stake(stakeAmount, 0);
            expect(await staking.getStakeCount(user.address, 0)).to.equal(1);

            // Stake #1 
            await staking.connect(user).stake(stakeAmount, 0);
            expect(await staking.getStakeCount(user.address, 0)).to.equal(2);

            // Withdraw stakeId = 0 
            await ethers.provider.send("evm_increaseTime", [200]);
            await ethers.provider.send("evm_mine", []);
            await staking.connect(user).withdraw(0, 0);

            // Counter KHÔNG giảm
            expect(await staking.getStakeCount(user.address, 0)).to.equal(2);

            // Stake #2
            await staking.connect(user).stake(stakeAmount, 0);

            // Counter tiếp tục tăng
            expect(await staking.getStakeCount(user.address, 0)).to.equal(3);
        });
    });

    describe("Gas profiling (optional)", () => {
        it("records gas for stake()", async() => {
        //Check record lượng gas tiêu thụ khi gọi hàm stake()
        const [admin, operator, user] = await ethers.getSigners();

        //1. Deploy mock ERC
        const Token = await ethers.getContractFactory("MockERC20");
        const token: any = await Token.deploy(
        "Stake Token",
        "STK",
        18,
        ethers.parseEther("1000000")
        );
        await token.waitForDeployment();

        //2. Deploy staking contract
        const staking = await new YieldStaking__factory(admin).deploy(
        admin.address,
        operator.address,
        token.target,
        token.target
        );
        await staking.waitForDeployment();

        //3. Setup package (bắt buộc)
        await staking.connect(admin).setPackage(
        0,
        30 * 24 * 60 * 60, // lockPeriod = 30 ngày
        10000,            // 100% APY
        true
        );

        const stakeAmount = ethers.parseEther("500")

        //3. Fund reward pool
        await token.transfer(staking.target, ethers.parseEther("1000"));

        //4. Fund user & approve
        await token.transfer(user.address, stakeAmount);
        await token.connect(user).approve(staking.target, stakeAmount);

        //5. GAS PROFILING
        const tx = await staking.connect(user).stake(
            stakeAmount,
            0);
        const receipt = await tx.wait();

        console.log("Gas used for stake():", receipt!.gasUsed.toString());
        });

        it("records gas for claim()", async() => {
        //Check record gas tiêu thụ của hàm claim()
            const [admin, operator, user] = await ethers.getSigners();

            // 1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            // 2. Deploy staking
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            // 3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            // 4. Fund reward + cấp token cho user
            const stakeAmount = ethers.parseEther("1000");
            await token.transfer(staking.target, ethers.parseEther("10000")); // reward
            await token.transfer(user.address, stakeAmount);                  // user fund
            await token.connect(user).approve(staking.target, stakeAmount);   // approve

            // 5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            // 6. Fast-forward time để có reward
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine", []);

            // 7. User claim reward
            const tx = await staking.connect(user).claim(0, 0);

            // 8. Lấy gasUsed
            const receipt = await tx.wait();
            console.log("Gas used for claim():", receipt!.gasUsed.toString());
        });

        it("records gas for withdraw()", async() => {
        //Check record gas khi withdraw
            const [admin, operator, user] = await ethers.getSigners();

            // 1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            // 2. Deploy staking (stakeToken = rewardToken)
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            // 3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            // 4. Fund reward + cấp token cho user + approve
            const stakeAmount = ethers.parseEther("1000");
            await token.transfer(staking.target, ethers.parseEther("10000")); // reward fund
            await token.transfer(user.address, stakeAmount);                  // user fund
            await token.connect(user).approve(staking.target, stakeAmount);   // approve

            // 5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            // 6. Fast-forward time để qua lockPeriod (cho phép withdraw)
            await ethers.provider.send("evm_increaseTime", [lockPeriod]);
            await ethers.provider.send("evm_mine", []);

            // 7. User withdraw (principal + reward)
            const tx = await staking.connect(user).withdraw(0, 0);

            // 8. Record gasUsed
            const receipt = await tx.wait();
            console.log("Gas used for withdraw():", receipt!.gasUsed.toString());
        });

        it.only("records gas for emergencyWithdraw()", async() => {
        //Check record gas khi emergencyWithdraw
            const [admin, operator, user] = await ethers.getSigners();

            // 1. Deploy mock ERC20
            const Token = await ethers.getContractFactory("MockERC20");
            const token:any = await Token.deploy(
                "Stake Token",
                "STK",
                18,
                ethers.parseEther("1000000")
            );
            await token.waitForDeployment();

            // 2. Deploy staking (stakeToken = rewardToken)
            const staking = await new YieldStaking__factory(admin).deploy(
                admin.address,
                operator.address,
                token.target,
                token.target
            );
            await staking.waitForDeployment();

            // 3. Set package
            const lockPeriod = 100;
            const apy = 10_000; // 100%

            await staking.connect(admin).setPackage(
                0,
                lockPeriod,
                apy,
                true
            );

            // 4. Fund reward + cấp token cho user + approve
            const stakeAmount = ethers.parseEther("1000");

            await token.transfer(staking.target, ethers.parseEther("10000")); // reward fund
            await token.transfer(user.address, stakeAmount);                  // user fund
            await token.connect(user).approve(staking.target, stakeAmount);   // approve

            // 5. User stake
            await staking.connect(user).stake(stakeAmount, 0);

            // 6. Pause contract (bắt buộc để emergencyWithdraw)
            await staking.connect(admin).pause();

            // 7. Operator gọi emergencyWithdraw
            const tx = await staking.connect(operator).emergencyWithdraw(
                user.address,
                0,
                0
            );

            // 8. Record gasUsed
            const receipt = await tx.wait();
            console.log(
                "Gas used for emergencyWithdraw():",
                receipt!.gasUsed.toString());
        });
    });

