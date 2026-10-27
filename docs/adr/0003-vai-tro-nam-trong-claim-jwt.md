# ADR-0003 — Vai trò nằm trong claim của JWT, không tra database mỗi request

**Ngày:** 2026-09-14 · **Commit:** `b601064` *(thêm đăng nhập JWT và endpoint
người dùng hiện tại)* · **Phạm vi:** xác thực và phân quyền

## Trạng thái

Đã chấp nhận, và đây là quyết định bị hỏi nhiều nhất trong nhóm, vì hệ quả của
nó lộ ra ở ba chỗ khác nhau trong ứng dụng.

## Bối cảnh

API không giữ phiên (`SessionCreationPolicy.STATELESS`). Mỗi request đến mang
theo một JWT, và Spring Security phải quyết định request đó được vào `/api/admin/**`,
`/api/doctor/**` hay không được vào đâu cả.

Để quyết định, filter cần biết **vai trò** của tài khoản. Có hai nguồn: lấy từ
chính token, hoặc lấy từ database.

## Các phương án đã cân nhắc

**1. Vai trò nằm trong claim của token.** `generateToken()` ghi `role` vào token
lúc đăng nhập; `JwtAuthenticationFilter` đọc claim đó và dựng quyền từ nó.

**2. Token chỉ mang id, tra database mỗi request.** Filter lấy `sub`, gọi
`userRepository.findById()`, đọc vai trò hiện tại.

**3. Phương án 1 kèm danh sách token bị thu hồi.** Vai trò trong token, nhưng
server giữ một bảng token đã bị vô hiệu để cắt sớm khi cần.

## Quyết định

Chọn **phương án 1**.

Đánh đổi rất rõ: bỏ **một truy vấn database cho mọi request được xác thực**, đổi
lấy việc **thay đổi vai trò có độ trễ**. Với quy mô của bài tập, một truy vấn
thêm trên mỗi request là chi phí thường trực để phục vụ một sự kiện hiếm — admin
đổi vai trò của ai đó.

Phương án 3 giải được độ trễ, nhưng nó mang lại đúng cái mà phương án 1 vừa bỏ:
một lần đọc trạng thái dùng chung trên mỗi request. Nếu dự án cần tới nó thì
phương án 2 đơn giản hơn và trung thực hơn.

Token chứa đúng năm trường — `sub`, `email`, `role`, `iat`, `exp` — ký HS256.
Cần nhớ: **JWT được ký chứ không được mã hoá.** Ai cầm token đều đọc được email
và vai trò trong đó, nên không có gì bí mật được đặt vào token.

## Hệ quả

**Được:**

- Phân quyền tốn đúng một phép kiểm chữ ký, không chạm database.
- Backend giữ đúng tinh thần không phiên: không có trạng thái dùng chung nào
  phải đồng bộ.

**Phải chịu — và cả ba đều là chuyện sẽ bị hỏi:**

1. **Admin duyệt một người thành bác sĩ, người đó chưa vào được `/doctor` ngay.**
   Phải đăng nhập lại để lấy token mới. Không phải "đăng xuất" — đăng xuất chỉ
   xoá token khỏi trình duyệt; cái cấp vai trò mới là *lần đăng nhập kế tiếp*.
2. **Vô hiệu hoá một bác sĩ không cắt quyền ngay.** Vì vậy
   `AdminDoctorService.updateStatus()` phải hạ `user.role` về `PATIENT` chứ
   không chỉ đặt `status = INACTIVE` — nếu không, người đó giữ `ROLE_DOCTOR` cho
   tới khi token hết hạn, tối đa **30 ngày** với token "remember me".
3. **Frontend và backend có thể lệch nhau.** `AuthProvider` gọi `GET /users/me`
   mỗi lần khởi động, nên giao diện thấy vai trò **mới** từ database, trong khi
   backend vẫn tin vai trò **cũ** trong token. Người dùng vào được trang nhưng
   mọi lệnh gọi API trả 403. Nói gọn: *frontend hỏi database, backend tin token.*

Cửa sổ lệch tối đa bằng tuổi thọ token: 1 giờ bình thường, 30 ngày nếu tick
"remember me".

## Kiểm chứng ở đâu

- Nguồn của vai trò: `auth/jwt/JwtService.java:41` (`generateToken`) và
  `auth/jwt/JwtAuthenticationFilter.java`.
- Quyết định được ghi lại ngay tại chỗ nó gây hậu quả —
  `config/SecurityConfig.java`, comment phía trên hai dòng `hasRole`:
  *"so a role change only takes effect once that user logs in again"*.
- Hệ quả 2 được giữ bởi
  `doctor/AdminDoctorApiTest.deactivatingTakesTheDoctorRoleAwayAndActivatingGivesItBack`.
- Hệ quả vai trò cũ không mở được khu bác sĩ:
  `booking/BookingFlowTest.authenticationRoleOwnershipAndRevokedRoleAreEnforced`
  (phần cuối dùng một token `stale`).
- Mô tả cho người dùng cuối: US-AU-03 AC6 trong
  [`../USER_STORIES.md`](../USER_STORIES.md).
