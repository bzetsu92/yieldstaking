# Audit Finding Mapping

## SEC-001: Reentrancy Protection
| ID        | Test case                           | Hành động                 | Mong đợi         | Lý do / Ý nghĩa                                        |
| --------- | ----------------------------------- | ------------------------- | ---------------- | ------------------------------------------------------ |
| SEC-001.1 | nonReentrant on `stake`             | Inspect function selector | Function tồn tại | Xác nhận entrypoint critical có guard (baseline check) |
| SEC-001.2 | nonReentrant on `claim`             | Inspect function selector | Function tồn tại | Tránh double-claim trong cùng tx                       |
| SEC-001.3 | nonReentrant on `withdraw`          | Inspect function selector | Function tồn tại | Ngăn rút + callback reenter                            |
| SEC-001.4 | nonReentrant on `emergencyWithdraw` | Inspect function selector | Function tồn tại | Emergency path vẫn phải an toàn                        |
| SEC-001.N | (TODO) Full reentrancy              | —                         | Chưa test        | Cần malicious ERC20 → **informational gap**            |

## SEC-002: Reward Calculation Precision

| ID        | Test case                 | Hành động              | Mong đợi                    | Lý do / Ý nghĩa                   |
| --------- | ------------------------- | ---------------------- | --------------------------- | --------------------------------- |
| SEC-002.1 | Min stake precision       | Stake `minStakeAmount` | `rewardTotal` = công thức   | Tránh user bị thiệt vì rounding   |
| SEC-002.2 | Odd amount division       | Stake số lẻ (1337)     | Reward khớp                 | Chứng minh chia nguyên không lệch |
| SEC-002.3 | uint128 overflow          | Stake > max uint128    | Revert `"Amount too large"` | Ngăn overflow storage             |
| SEC-002.4 | Max valid stake           | Stake lớn nhưng hợp lệ | Pass + reward ≤ uint128     | Xác định upper bound an toàn      |
| SEC-002.5 | Multiple claims precision | Claim nhiều lần        | Tổng claim ≤ rewardTotal    | Ngăn tích lũy sai số              |
| SEC-002.6 | Claim gần full period     | Claim 89/90 ngày       | Gần rewardTotal             | Chứng minh linear vesting đúng    |


## SEC-003: Timestamp Manipulation

| ID        | Test case              | Hành động                | Mong đợi                    | Lý do / Ý nghĩa                       |
| --------- | ---------------------- | ------------------------ | --------------------------- | ------------------------------------- |
| SEC-003.1 | Year 2106 overflow     | Stake gần uint32 max     | unlockTimestamp overflow    | **Cảnh báo thiết kế (informational)** |
| SEC-003.2 | Same-block stake+claim | Stake & claim cùng block | Revert `"Nothing to claim"` | Không cho claim khi elapsed = 0       |
| SEC-003.3 | Multi-stake same block | 2 stake cùng block       | Timestamp giống nhau        | Đảm bảo consistency                   |

## SEC-004: Emergency Withdraw Access Control

| ID        | Test case                     | Hành động             | Mong đợi              | Lý do / Ý nghĩa                  |
| --------- | ----------------------------- | --------------------- | --------------------- | -------------------------------- |
| SEC-004.1 | Emergency withdraw khi paused | User withdraw stake   | Thành công            | User tự bảo vệ khi hệ thống dừng |
| SEC-004.2 | Not paused                    | Emergency withdraw    | Revert `"Not paused"` | Không lạm dụng emergency path    |
| SEC-004.3 | Cross-user withdraw           | User2 rút stake user1 | Revert `"No stake"`   | Ngăn đánh cắp tài sản            |
| SEC-004.4 | Emergency reward payout       | Withdraw sau 30 ngày  | Principal + reward    | Công bằng cho user               |

## SEC-005: Solvency Edge Cases

| ID            | Test case                | Hành động                                     | Mong đợi                                  | Lý do / Ý nghĩa                                                                                                                                       |
| ------------- | ------------------------ | --------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEC-005.1** | Stake gây insolvency     | User stake với amount vượt phần reward còn dư | Revert `"Insufficient reward liquidity"`  | Ngăn tạo ra nghĩa vụ reward vượt quá số token hiện có, bảo vệ contract khỏi trạng thái **mất khả năng thanh toán ngay tại thời điểm stake**.          |
| **SEC-005.2** | Withdraw excess vượt mức | Admin rút reward vượt phần excess             | Revert `"Exceeds excess"`                 | Đảm bảo admin **không thể rút token đã được ngầm cam kết** cho user, ngăn việc làm contract rơi vào trạng thái âm khi user claim/withdraw.            |
| **SEC-005.3** | Max stakes per package   | Stake đến giới hạn package                    | `balance ≥ totalLocked + totalRewardDebt` | Xác nhận rằng ngay cả khi package được lấp đầy đến mức tối đa, contract vẫn **duy trì invariant solvency**, không tạo nghĩa vụ vượt khả năng chi trả. |


## EDGE-001: Package Parameter Boundaries

| ID         | Test case       | Hành động  | Mong đợi                | Lý do                 |
| ---------- | --------------- | ---------- | ----------------------- | --------------------- |
| EDGE-001.1 | APY < MIN       | setPackage | Revert `"APY too low"`  | Bảo vệ kinh tế        |
| EDGE-001.2 | APY > MAX       | setPackage | Revert `"APY too high"` | Tránh reward overflow |
| EDGE-001.3 | Lock < MIN      | setPackage | Revert                  | Tránh spam stake      |
| EDGE-001.4 | Lock > MAX      | setPackage | Revert                  | Tránh khóa vô hạn     |
| EDGE-001.5 | Boundary values | setPackage | Pass                    | Biên hợp lệ           |

## EDGE-002: Package Disabled Mid-Stake

| ID             | Test case                | Hành động                         | Mong đợi                   | Lý do / Ý nghĩa                                                                                                                                                  |
| -------------- | ------------------------ | --------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EDGE-002.1** | Claim sau khi disable    | Admin disable package             | Claim **thành công**       | Đảm bảo các stake đã được tạo trước đó **không bị ảnh hưởng bởi thay đổi cấu hình**, tránh việc admin có thể làm gián đoạn hoặc tước reward của user đang stake. |
| **EDGE-002.2** | Withdraw sau khi disable | Admin disable package             | Withdraw **thành công**    | Bảo vệ **quyền rút vốn gốc và reward** của user, đảm bảo tính bất biến của điều khoản stake đã được chấp nhận tại thời điểm stake.                               |
| **EDGE-002.3** | Stake mới khi disabled   | User stake vào package đã disable | Revert `"Invalid package"` | Ngăn tạo stake mới vào package không còn hiệu lực, tránh trạng thái không nhất quán và đảm bảo hệ thống chỉ nhận stake vào các cấu hình hợp lệ.                  |


## EDGE-003: Admin Parameter Changes

| ID         | Test case       | Hành động    | Mong đợi            | Lý do                  |
| ---------- | --------------- | ------------ | ------------------- | ---------------------- |
| EDGE-003.1 | APY change      | Change APY   | Stake cũ không đổi  | Immutability guarantee |
| EDGE-003.2 | New APY         | Stake mới    | Reward theo APY mới | Tách snapshot          |
| EDGE-003.3 | MinStake change | Increase min | Stake cũ hợp lệ     | Backward compatibility |

## EDGE-004: Claim Boundary Conditions

| ID             | Test case          | Hành động                                     | Mong đợi                          | Lý do / Ý nghĩa                                                                                                                                                                                                  |
| -------------- | ------------------ | --------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **EDGE-004.1** | Claim +1s          | Stake → tăng thời gian **1 giây** → `claim()` | Reward **> 0** và đúng tỷ lệ      | Xác nhận reward **bắt đầu tích lũy ngay sau khi stake**, với độ phân giải theo **giây**. Điều này đảm bảo không tồn tại “dead zone”, cliff ẩn hoặc làm tròn sai khiến user không nhận được reward khi claim sớm. |
| **EDGE-004.2** | Claim at unlock    | Claim đúng tại `unlockTimestamp`              | Reward = `rewardTotal`            | Đảm bảo user **nhận đủ 100% reward** tại thời điểm kết thúc lock, không bị underpayment do off-by-one, rounding hoặc sai lệch timestamp.                                                                         |
| **EDGE-004.3** | Claim after unlock | Claim sau khi vượt thời gian lock             | Reward **bị cap ở `rewardTotal`** | Ngăn overpayment khi thời gian vượt quá lock period, đảm bảo reward không tiếp tục accrue sau khi đã vest đủ.                                                                                                    |
| **EDGE-004.4** | Many small claims  | Claim nhiều lần (90 lần)                      | Tổng reward ≈ `rewardTotal`       | Chứng minh rằng **chia nhỏ claim không tạo ra sai số tích lũy**, đảm bảo tính ổn định của phép chia nguyên và cập nhật `lastClaimTimestamp`.                                                                     |


## STATE-001: State Bloat Protection

| ID              | Test case        | Hành động                                | Mong đợi                                 | Lý do / Ý nghĩa                                                                                                                                                             |
| --------------- | ---------------- | ---------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **STATE-001.1** | 100 stakes       | Một user stake **100 lần**               | State vẫn truy xuất và xử lý bình thường | Xác nhận contract **không có vòng lặp phụ thuộc vào số lượng stake của user**, tránh DoS do state phình to (unbounded growth).                                              |
| **STATE-001.2** | Gas giảm dần     | So sánh gas stake lần đầu và lần thứ 100 | Gas stake #100 **<** stake #1            | Chứng minh chi phí gas **không tăng theo số lượng stake**, và phản ánh đúng hành vi `SSTORE` (0→nonzero tốn gas hơn nonzero→nonzero), loại trừ nguy cơ gas tăng tuyến tính. |
| **STATE-001.3** | stakeId overflow | Kiểm tra bộ đếm `stakeId`                | Giá trị **< uint32 max**                 | Đảm bảo bộ đếm stake **không tiệm cận overflow**, tránh wrap-around dẫn đến ghi đè stake cũ hoặc truy cập sai dữ liệu.                                                      |


## GAS-001: Gas Guardrails (Optional)

| ID        | Test case    | Hành động      | Mong đợi      | Lý do              |
| --------- | ------------ | -------------- | ------------- | ------------------ |
| GAS-001.1 | stake gas    | Measure        | < 250k        | UX + cost          |
| GAS-001.2 | claim gas    | Measure        | < 100k        | Claim thường xuyên |
| GAS-001.3 | withdraw gas | Measure        | < 100k        | Exit path          |
| GAS-001.4 | Compare ops  | stake vs claim | stake ≥ claim | Hợp lý logic       |
