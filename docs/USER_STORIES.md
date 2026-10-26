# User story

Mục 5.1 của đề: 8–15 user story, mỗi story kèm tiêu chí chấp nhận (acceptance
criteria). Mỗi story đều truy được về code và về ít nhất một test trong
[`TRACEABILITY.md`](TRACEABILITY.md); [`OWNERSHIP.md`](OWNERSHIP.md) nói ai trả
lời cho khối nào.

Mã story mang tên module, nên nhìn mã là biết hỏi ai: `AU` authen, `DR` doctor,
`AD` admin, `BK` booking, `AI` trợ lý RAG.

Mục tiêu 15 story. Đã viết 8.

| Khối | Chủ | Story | Trạng thái |
|---|---|---|---|
| authen | Huy | US-AU-01 … 03 | đã viết |
| doctor | Huy | US-DR-01 … 05 | đã viết |
| admin | Dũng | US-AD-01 … 02 | chờ viết |
| booking | Dũng | US-BK-01 … 03 | chờ viết |
| RAG | Lộc | US-AI-01 … 02 | chờ viết |

**Khối doctor gồm cả hai góc nhìn.** US-DR-01…03 kể từ phía **admin** — duyệt
bác sĩ, quản lý hồ sơ, xếp lịch trực; US-DR-04…05 kể từ phía **chính bác sĩ** —
lịch hẹn trong ngày, lịch nghỉ, hồ sơ công khai. Cả năm nằm chung một khối vì
code của chúng nằm chung trong package `doctor` và cùng một người trả lời. Để
tổng nằm trong mức 15 của đề, khối RAG rút còn hai story: chuyện trả lời theo
dòng là chi tiết giao diện của cùng một hành vi nên gộp vào story đầu.

Một quy tắc nên giữ khi viết nốt phần còn lại: **đừng viết story nào không có
test nào chạm tới.** Story rẻ nhất để viết là story đã có sẵn test ghim lại, và ô
test để trống là thứ người đọc nhận ra đầu tiên.

---

## authen — Huy

### US-AU-01 — Đăng ký và kích hoạt tài khoản qua email

> Là một bệnh nhân mới, tôi muốn tạo tài khoản và kích hoạt nó bằng link gửi về
> email, để không ai dùng được một địa chỉ mà họ không sở hữu.

- **AC1** — Given form đăng ký hợp lệ, When gửi đi, Then tài khoản được tạo với
  vai trò `PATIENT`, email lưu ở dạng chữ thường, và một link kích hoạt được gửi
  đi.
- **AC2** — Given email đã đăng ký rồi, dù viết hoa thường kiểu gì, When gửi form
  đăng ký, Then bị từ chối.
- **AC3** — Given form không hợp lệ, When gửi đi, Then mọi trường sai đều được
  báo, không chỉ trường đầu tiên.
- **AC4** — Given tài khoản chưa mở link kích hoạt, When thử đăng nhập, Then bị
  từ chối và thông báo nói rõ email chưa được xác thực.
- **AC5** — Given link kích hoạt đã dùng rồi, When mở lại, Then bị từ chối.
- **AC6** — Given yêu cầu gửi link kích hoạt mới, Then link cũ ngừng hoạt động;
  còn yêu cầu cho một tài khoản không tồn tại hoặc đã kích hoạt thì không gửi gì
  cả.
- **AC7** — Given đăng ký xin vai trò `DOCTOR`, Then hệ thống chỉ ghi nhận yêu
  cầu chứ không cấp vai trò (tiếp tục ở US-DR-01). Vai trò `ADMIN` không bao giờ
  xin được lúc đăng ký.

### US-AU-02 — Đặt lại mật khẩu đã quên

> Là một bệnh nhân quên mật khẩu, tôi muốn nhận link đặt lại qua email, để lấy
> lại quyền truy cập mà không phải gọi phòng khám.

- **AC1** — Given email đã đăng ký, When gửi form quên mật khẩu, Then một email
  chứa link kèm token được gửi đi và phản hồi mang tính trung lập.
- **AC2** — Given email **chưa** đăng ký, When gửi form, Then phản hồi giống hệt
  AC1 và không email nào được gửi, nên không thể dùng form này để dò xem địa chỉ
  nào có trong hệ thống.
- **AC3** — Given link đã dùng hoặc đã hết hạn, When mở link, Then việc đặt lại
  bị từ chối và mật khẩu không đổi.
- **AC4** — Given đặt lại thành công, Then token bị đánh dấu đã dùng và không
  dùng lại được lần nữa.
- **AC5** — Given yêu cầu đặt lại lần thứ hai, Then link cũ bị vô hiệu hóa.
- **AC6** — Given mật khẩu mới không đạt quy tắc mật khẩu, Then việc đặt lại bị
  từ chối kèm lỗi ở đúng trường đó.

### US-AU-03 — Đăng nhập và chỉ vào được phần vai trò cho phép

> Là người dùng, tôi muốn đăng nhập bằng mật khẩu hoặc bằng Google và có thể chọn
> duy trì đăng nhập, để vào được đúng những màn hình vai trò của tôi cho phép và
> không gì khác.

- **AC1** — Given thông tin đăng nhập đúng của một tài khoản đã kích hoạt, When
  đăng nhập, Then nhận được JWT mở được `/api/users/me`.
- **AC2** — Given sai mật khẩu, và given email không tồn tại, Then cả hai trả về
  cùng một câu trả lời, nên không thể dùng màn đăng nhập để dò tài khoản.
- **AC3** — Given có tick "remember me", Then token sống 30 ngày thay vì 1 giờ.
- **AC4** — Given chưa cấu hình Google client id, Then nút "Continue with Google"
  không khả dụng, thay vì hỏng ở cuối luồng.
- **AC5** — Given token thiếu hoặc không hợp lệ, When gọi một endpoint được bảo
  vệ, Then bị từ chối.
- **AC6** — Given token của `PATIENT`, When gọi endpoint admin, Then bị từ chối —
  vai trò lấy từ claim trong token, nên đổi vai trò chỉ có hiệu lực ở lần đăng
  nhập kế tiếp.

---

## doctor — Huy

### US-DR-01 — Quyết định ai trở thành bác sĩ

> Là admin, tôi muốn xem ai đã xin tài khoản bác sĩ, người chờ lâu nhất lên đầu,
> rồi duyệt họ vào một khoa hoặc từ chối, để chỉ nhân sự đã được kiểm chứng mới
> có quyền truy cập lâm sàng.

- **AC1** — Given có các yêu cầu đang chờ, When mở hàng đợi, Then chúng được liệt
  kê theo thứ tự chờ lâu nhất trước và có phân trang.
- **AC2** — Given duyệt kèm khoa và chuyên môn, Then hồ sơ bác sĩ được tạo, vai
  trò tài khoản đổi thành `DOCTOR`, và mã bác sĩ được sinh ra.
- **AC3** — Given từ chối, Then tài khoản vẫn là bệnh nhân bình thường.
- **AC4** — Given tài khoản chưa xác thực email, Then không duyệt được.
- **AC5** — Given yêu cầu đã được quyết rồi, Then không quyết lại lần thứ hai
  được.
- **AC6** — Given khoa không tồn tại hoặc đang ngừng hoạt động, Then việc duyệt
  bị từ chối.
- **AC7** — Given người gọi không phải admin, Then cả hàng đợi lẫn hai thao tác
  quyết định đều bị từ chối; id người dùng không tồn tại trả về 404.

### US-DR-02 — Tìm kiếm và quản lý hồ sơ bác sĩ

> Là admin, tôi muốn tìm kiếm, lọc và phân trang danh sách bác sĩ, đồng thời sửa
> hồ sơ, trạng thái làm việc và trạng thái tài khoản của họ, để những gì bệnh
> nhân nhìn thấy luôn đúng.

- **AC1** — Given danh sách, When lọc theo khoa, chuyên môn, trạng thái làm việc,
  trạng thái tài khoản hoặc từ khóa tự do, Then các bộ lọc kết hợp với nhau chứ
  không thay thế lẫn nhau.
- **AC2** — Given tham số phân trang nằm ngoài khoảng cho phép, Then chúng được
  kéo về trong khoảng; giá trị lọc lạ thì bị từ chối.
- **AC3** — Given một lần sửa hồ sơ, Then dữ liệu được kiểm tra, và giá trị quá
  dài hoặc không an toàn bị từ chối.
- **AC4** — Given chuyển bác sĩ sang khoa khác, Then chức trưởng khoa ở khoa cũ
  (nếu có) kết thúc; chuyển vào khoa **đang ngừng hoạt động** thì bị từ chối.
- **AC5** — Given vô hiệu hóa một bác sĩ, Then vai trò `DOCTOR` bị thu hồi và họ
  được chuyển sang trạng thái ngoài ca; kích hoạt lại thì trả vai trò về.
- **AC6** — Given bất kỳ thao tác nào ở trên, Then các ô thống kê phản ánh ngay
  lập tức.

### US-DR-03 — Xếp lịch trực theo tuần cho bác sĩ

> Là admin, tôi muốn thêm, sửa và xóa ca trực trên bảng lịch tuần, để bệnh nhân
> chỉ được mời những khung giờ bác sĩ thực sự làm việc.

- **AC1** — Given một bác sĩ, When thêm, liệt kê, sửa hoặc xóa một ca, Then bảng
  lịch tuần phản ánh điều đó theo đúng thứ tự các ngày trong tuần.
- **AC2** — Given một ca có giờ kết thúc không sau giờ bắt đầu, Then bị từ chối.
- **AC3** — Given hai ca bắt đầu cùng một thời điểm, Then ca thứ hai bị từ chối;
  ca làm việc và ca nghỉ không được chồng lên nhau.
- **AC4** — Given một ca `BREAK`, Then nó phải nằm trọn trong một ca `WORK`, và
  việc sửa ca làm việc đó không được bỏ rơi nó.
- **AC5** — Given sửa một ca, Then hệ thống không coi nó là xung đột với chính
  nó.
- **AC6** — Given bác sĩ đang ngừng hoạt động, Then lịch tuần của họ chỉ được xóa
  chứ không được thêm; và chỉ admin mới vào được tất cả những chức năng trên.

### US-DR-04 — Lịch hẹn trong ngày

> Là bác sĩ, tôi muốn mở lịch hẹn của chính mình, chuyển trạng thái từng ca khám
> và ghi chú lại, để theo được buổi làm việc mà không phải nhờ admin.

- **AC1** — Given tôi đã đăng nhập bằng tài khoản bác sĩ, When mở khu làm việc,
  Then chỉ thấy lịch hẹn được gán cho chính tôi, lọc và phân trang được.
- **AC2** — Given `from` và `to` cùng một ngày, Then nhận đúng lịch của ngày đó.
- **AC3** — Given một ca khám, When tôi chuyển trạng thái, Then chỉ các bước hợp
  lệ được chấp nhận: `PENDING` → `CONFIRMED` → `IN_PROGRESS` → `COMPLETED` hoặc
  `NO_SHOW`.
- **AC4** — Given tôi ghi chú vào một ca đang khám hoặc đã khám xong, Then ghi
  chú được lưu và bản cũ vẫn còn trong lịch sử.
- **AC5** — Given tôi mở lịch hẹn của bác sĩ khác, Then nhận **404**, không phải
  403 — 403 đã vô tình xác nhận bản ghi đó tồn tại.
- **AC6** — Given tôi chưa đăng nhập, hoặc đăng nhập bằng tài khoản bệnh nhân
  hay admin, Then mọi endpoint `/api/doctor/**` đều từ chối.
- **AC7** — Given tôi còn lịch hẹn trong tương lai, Then admin không thể vô hiệu
  hoá tôi hay đặt tôi sang nghỉ phép.

### US-DR-05 — Lịch nghỉ và hồ sơ công khai

> Là bác sĩ, tôi muốn tự khai những buổi mình không làm được và tự sửa phần giới
> thiệu bệnh nhân nhìn thấy, để không phải nhờ admin cho mỗi thay đổi nhỏ.

- **AC1** — Given tôi đã đăng nhập, When mở hồ sơ của mình, Then thấy đúng hồ sơ
  gắn với tài khoản tôi, không phải của người khác.
- **AC2** — Given tôi sửa phần giới thiệu công khai, Then thay đổi được lưu và
  hiện ra ở trang chi tiết bác sĩ.
- **AC3** — Given tôi xem lịch trực tuần của mình, Then thấy đúng khung giờ admin
  đã xếp cho tôi.
- **AC4** — Given tôi khai một khoảng `WORK`, `BREAK` hoặc `LEAVE` theo ngày cụ
  thể, Then khoảng đó đè lên lịch tuần cho riêng ngày ấy.
- **AC5** — Given tôi xoá một khoảng ngoại lệ mà việc xoá sẽ bỏ rơi một lịch hẹn
  đã đặt, Then thao tác bị từ chối.

---

## admin — Dũng

*Chờ viết: US-AD-01, US-AD-02.*

Ứng viên đã có sẵn test: CRUD khoa cùng vòng đời hoạt động/ngừng hoạt động
(`AdminDepartmentApiTest`). Story thứ hai phụ thuộc vào điểm còn bỏ ngỏ trong
[`OWNERSHIP.md`](OWNERSHIP.md) — nếu dashboard sử dụng AI về tay Dũng thì đó
chính là US-AD-02 tự nhiên nhất, và sẽ cần viết test kèm theo.

---

## booking — Dũng

*Chờ viết: US-BK-01, US-BK-02, US-BK-03.*

Ứng viên đã có sẵn test: đặt lịch với idempotency key, hủy và dời lịch trong
khuôn khổ các quy tắc vòng đời, và màn hình lịch trong ngày của bác sĩ kèm các
ngoại lệ về thời gian rảnh. Xem `backend/docs/BOOKING_BACKEND.md` để biết bảng
endpoint và phân quyền, và `BookingFlowTest` / `AvailabilityEngineTest` để biết
những gì đã được ghim lại.

---

## RAG — Lộc

*Chờ viết: US-AI-01, US-AI-02.*

Ứng viên: hỏi một câu về sức khỏe và nhận câu trả lời có trích dẫn đúng section
nguồn; trợ lý từ chối khi câu trả lời không có trong tài liệu; câu trả lời hiện
dần theo từng token với phần nguồn hiện ra trước. Cột test của mấy story này trỏ
tới các nhóm câu hỏi trong `rag/eval/eval_questions.yaml` và các lần chạy đã ghi
lại trong `rag/eval/results/`, chứ không trỏ tới lớp JUnit nào.

---

## Chưa thành story

Xem và sửa hồ sơ cá nhân, cùng việc đổi mật khẩu khi đã đăng nhập
(`/api/users/me`, `/api/users/me/password`) đã có code và đã được
`user/UserApiTest` phủ, nhưng chưa story nào nhận. Đây là US-AU-04 hiển nhiên
nếu nhóm quyết định vượt quá 14 story.

Các trang bác sĩ hướng tới người dùng cuối cũng chưa có story, mỗi trang vì một
lý do khác nhau — bảng trạng thái trong [`OWNERSHIP.md`](OWNERSHIP.md) liệt kê
từng trang. Hai trang công khai (`pages/Doctors`, `pages/DoctorDetails`) nay đã
chạy trên `/api/public/**` và có `catalog/PublicCatalogApiTest` phủ phía server,
nên chúng là ứng viên **US-DR-04** rõ ràng nhất: "bệnh nhân chưa đăng nhập tìm
bác sĩ theo tên, chuyên môn và khoa". `DoctorProfile` thì chưa viết story được
vì chưa có endpoint nào để nó gọi.
