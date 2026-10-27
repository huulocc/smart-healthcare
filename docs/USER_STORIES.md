# User story

Mục 5.1 của đề: 8–15 user story, mỗi story kèm tiêu chí chấp nhận (acceptance
criteria). Mỗi story đều truy được về code và về ít nhất một test trong
[`TRACEABILITY.md`](TRACEABILITY.md).

**Đây là danh sách của cả sản phẩm, không chia theo người.** Đề không yêu cầu
chia story cho từng thành viên — mục 5.4 chỉ yêu cầu mỗi người **sở hữu ít nhất
một module** và là người đầu tiên trả lời câu hỏi về module đó. Ai đứng tên khối
nào nằm ở [`OWNERSHIP.md`](OWNERSHIP.md), và đó là chỗ duy nhất giữ việc phân
công; file này chỉ mô tả hệ thống làm được gì.

Story được nhóm theo **khối chức năng** chứ không theo tác giả, và mã story mang
tên khối: `AU` authen, `DR` doctor, `AD` admin, `BK` booking, `AI` trợ lý RAG.

Tổng **12 story**, nằm trong mức 8–15 của đề.

| Khối | Story | Nội dung |
|---|---|---|
| authen | US-AU-01 … 03 | đăng ký và kích hoạt, quên mật khẩu, đăng nhập và phân quyền |
| doctor | US-DR-01 … 03 | duyệt và quản lý bác sĩ, lịch trực, khu làm việc của bác sĩ |
| admin | US-AD-01 … 02 | danh mục khoa, giám sát mức dùng AI |
| booking | US-BK-01 … 02 | đặt lịch khám, đổi/huỷ và vòng đời ca khám |
| RAG | US-AI-01 … 02 | hỏi đáp có trích nguồn, gợi ý khoa từ triệu chứng |

**Khối doctor gồm cả hai góc nhìn.** US-DR-01…02 kể từ phía **admin** — duyệt,
quản lý bác sĩ và xếp lịch trực; US-DR-03 kể từ phía **chính bác sĩ** — lịch
hẹn trong ngày, lịch nghỉ và hồ sơ công khai. Cả ba nằm chung một khối vì code
của chúng nằm chung trong package `doctor`.

**Các khối đã được gom theo hành trình chính.** Khối RAG còn hai story: chuyện trả lời
theo dòng là chi tiết giao diện của cùng một hành vi nên gộp vào story đầu. Khối
booking còn hai thay vì ba: huỷ và dời lịch đi chung một bộ quy tắc vòng đời,
tách ra chỉ làm loãng cả hai. Hai cặp story doctor cũng được gom theo cùng một
vai trò và hành trình sử dụng. Tổng 12 nên vẫn còn chỗ nếu sau này cần thêm —
các ứng viên nằm ở mục [Chưa thành story](#chưa-thành-story) cuối file.

Một quy tắc nên giữ nếu viết thêm: **đừng viết story nào không có test nào chạm
tới.** Story rẻ nhất để viết là story đã có sẵn test ghim lại, và ô test để trống
là thứ người đọc nhận ra đầu tiên.

---

## authen

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

## doctor

### US-DR-01 — Duyệt và quản lý bác sĩ

> Là admin, tôi muốn duyệt yêu cầu trở thành bác sĩ và quản lý hồ sơ của những
> người đã được duyệt, để chỉ nhân sự hợp lệ có quyền lâm sàng và thông tin bệnh
> nhân nhìn thấy luôn chính xác.

- **AC1** — Given có yêu cầu đang chờ, When mở hàng đợi, Then các yêu cầu được
  phân trang và xếp người chờ lâu nhất trước.
- **AC2** — Given tài khoản đã xác thực và một khoa đang hoạt động, When admin
  duyệt kèm chuyên môn, Then hồ sơ cùng mã bác sĩ được tạo và vai trò đổi thành
  `DOCTOR`; nếu từ chối thì tài khoản vẫn là `PATIENT`.
- **AC3** — Given tài khoản chưa xác thực, khoa không hợp lệ hoặc yêu cầu đã
  được quyết, Then thao tác duyệt hay từ chối lại bị chặn.
- **AC4** — Given danh sách bác sĩ, When admin kết hợp từ khóa, khoa, chuyên môn,
  trạng thái làm việc và trạng thái tài khoản, Then kết quả lọc và phân trang
  phản ánh đồng thời tất cả điều kiện.
- **AC5** — Given admin sửa hồ sơ hoặc chuyển khoa, Then dữ liệu không hợp lệ bị
  từ chối, khoa đích phải đang hoạt động và chức trưởng khoa cũ được kết thúc.
- **AC6** — Given admin vô hiệu hóa bác sĩ, Then vai trò `DOCTOR` bị thu hồi và
  bác sĩ chuyển sang ngoài ca; khi kích hoạt lại thì vai trò được cấp lại và các
  ô thống kê cập nhật ngay.
- **AC7** — Given người gọi không phải admin, Then toàn bộ endpoint duyệt và
  quản lý bác sĩ bị từ chối; id không tồn tại trả về 404.

### US-DR-02 — Xếp lịch trực theo tuần cho bác sĩ

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

### US-DR-03 — Quản lý công việc và hồ sơ của bác sĩ

> Là bác sĩ, tôi muốn quản lý lịch hẹn, lịch làm việc và hồ sơ công khai của
> chính mình, để hoàn thành buổi khám và cập nhật thông tin mà không phải nhờ
> admin.

- **AC1** — Given đăng nhập bằng tài khoản bác sĩ, When mở khu làm việc, Then tôi
  chỉ thấy lịch hẹn của mình, có thể lọc, phân trang và lấy đúng lịch một ngày.
- **AC2** — Given một ca khám, Then chỉ các bước trạng thái hợp lệ được chấp nhận:
  `PENDING` → `CONFIRMED` → `IN_PROGRESS` → `COMPLETED` hoặc `NO_SHOW`; ghi chú
  mới được lưu mà lịch sử cũ vẫn còn.
- **AC3** — Given tôi mở lịch hẹn của bác sĩ khác, Then nhận 404; người chưa đăng
  nhập, bệnh nhân và admin đều không truy cập được `/api/doctor/**`.
- **AC4** — Given tôi mở hoặc sửa hồ sơ của mình, Then đúng hồ sơ gắn với tài
  khoản được trả về và phần giới thiệu mới xuất hiện ở trang công khai.
- **AC5** — Given tôi xem lịch tuần hoặc tạo ngoại lệ `WORK`, `BREAK`, `LEAVE`
  cho một ngày, Then lịch admin đã xếp được hiển thị và ngoại lệ chỉ ghi đè ngày
  tương ứng.
- **AC6** — Given việc xóa ngoại lệ hay thay đổi trạng thái bác sĩ sẽ làm hỏng
  một lịch hẹn tương lai, Then thao tác bị từ chối.

---

## admin

### US-AD-01 — Quản lý danh mục khoa

> Là admin, tôi muốn tạo khoa, chỉ định trưởng khoa và cho một khoa ngừng hoạt
> động, để danh mục khoa luôn khớp với thực tế phòng khám.

- **AC1** — Given form hợp lệ, When tạo khoa, Then khoa được tạo ở trạng thái
  `ACTIVE`, tên bị cắt khoảng trắng thừa, và mã khoa sinh ra từ id của chính nó.
- **AC2** — Given tên khoa đã tồn tại, dù viết hoa thường kiểu gì, When tạo hoặc
  đổi tên sang tên đó, Then bị từ chối kèm lỗi ở trường tên.
- **AC3** — Given sửa một khoa mà vẫn giữ nguyên tên của chính nó, Then không bị
  coi là trùng tên với chính mình.
- **AC4** — Given tên để trống hoặc chỉ có khoảng trắng, Then bị từ chối kèm lỗi
  ở đúng trường đó.
- **AC5** — Given xem danh sách khoa, Then mỗi khoa hiện trưởng khoa và **số bác
  sĩ đang hoạt động**, không tính bác sĩ đã ngừng hoạt động.
- **AC6** — Given chỉ định trưởng khoa là một bác sĩ thuộc khoa khác, Then bị từ
  chối; given bác sĩ đó thuộc đúng khoa nhưng đã ngừng hoạt động, Then cũng bị từ
  chối, và hai trường hợp báo hai lý do khác nhau.
- **AC7** — Given gửi form không kèm trưởng khoa, Then chức trưởng khoa hiện tại
  được gỡ bỏ.
- **AC8** — Given cho một khoa ngừng hoạt động, Then đó là **đổi trạng thái** sang
  `INACTIVE` — dòng dữ liệu vẫn còn, vì bác sĩ và lịch hẹn cũ vẫn trỏ vào nó.
- **AC9** — Given tài khoản không phải admin, Then mọi endpoint dưới
  `/api/admin/departments` đều từ chối.

### US-AD-02 — Giám sát mức dùng và chi phí AI

> Là admin, tôi muốn xem số lần gọi AI, số token, độ trễ và tỉ lệ lỗi, để biết
> trợ lý đang tốn bao nhiêu và có đang hỏng hay không.

- **AC1** — Given dịch vụ RAG vừa gọi mô hình xong, Then nó gửi một sự kiện
  telemetry kèm nhà cung cấp, tên model, số token, độ trễ và trạng thái — và
  **không** kèm nội dung hội thoại hay danh tính bệnh nhân.
- **AC2** — Given sự kiện gửi lên kèm secret sai hoặc thiếu, Then bị từ chối.
- **AC3** — Given cùng một `requestId` được gửi hai lần, Then chỉ một sự kiện
  được ghi, nên một lần gửi lại không thổi phồng số liệu.
- **AC4** — Given tôi mở trang mức dùng AI, Then thấy thống kê tổng hợp theo từng
  tính năng cùng nhật ký các lần gọi.
- **AC5** — Given chưa cấu hình Google Cloud, Then trang nói rõ là **chưa cấu
  hình** thay vì hiện số liệu trống mà không giải thích gì.
- **AC6** — Given tài khoản không phải admin, Then endpoint
  `/api/admin/ai-usage/**` từ chối.
- **AC7** — Given việc gửi telemetry thất bại hoặc hết thời gian chờ, Then phần
  chat của bệnh nhân vẫn chạy bình thường — đo đạc không bao giờ được làm hỏng
  tính năng.

---

## booking

### US-BK-01 — Đặt lịch khám với bác sĩ

> Là một bệnh nhân đã đăng nhập, tôi muốn chọn bác sĩ, xem khung giờ còn trống và
> đặt một ca khám, để có chỗ khám mà không phải gọi điện cho phòng khám.

- **AC1** — Given một bác sĩ đang hoạt động, When xem lịch trống trong khoảng
  ngày hợp lệ, Then nhận danh sách slot kèm múi giờ `Asia/Ho_Chi_Minh`.
- **AC2** — Given khoảng ngày nằm trong quá khứ, hoặc vượt quá 30 ngày tới, Then
  bị từ chối. Ngày được tính theo lịch Việt Nam, không theo UTC.
- **AC3** — Given một slot còn trống, When gửi form đặt lịch kèm header
  `Idempotency-Key`, Then ca khám được tạo ở trạng thái `CONFIRMED`, và hồ sơ
  bệnh nhân được tạo luôn nếu đây là lần đặt đầu tiên.
- **AC4** — Given gửi lại **đúng** yêu cầu cũ với cùng `Idempotency-Key`, Then
  nhận lại chính ca khám đã tạo chứ không tạo ca thứ hai.
- **AC5** — Given dùng lại `Idempotency-Key` cũ nhưng **đổi** nội dung bên trong,
  Then bị từ chối — cùng một khoá phải nghĩa là cùng một yêu cầu.
- **AC6** — Given thiếu hẳn header `Idempotency-Key`, Then bị từ chối.
- **AC7** — Given giờ bắt đầu không rơi đúng lưới slot, hoặc rơi vào giờ nghỉ của
  bác sĩ, hoặc bác sĩ đã ngừng hoạt động, Then bị từ chối; riêng bác sĩ đã ngừng
  hoạt động thì lịch trống trả về rỗng.
- **AC8** — Given form thiếu ô đồng ý, sai định dạng điện thoại hoặc email, ngày
  sinh ở tương lai, hoặc tên và lý do khám để trống, Then bị từ chối kèm lỗi ở
  đúng trường đó.
- **AC9** — Given hai người cùng đặt một slot ở cùng thời điểm, Then chỉ một ca
  khám được tạo.
- **AC10** — Given việc đặt lịch thất bại giữa chừng, Then không hồ sơ bệnh nhân
  nào và không khoá idempotency nào bị bỏ lại.
- **AC11** — Given tôi đã có một ca khám trùng giờ với bác sĩ khác, Then không
  đặt thêm được.

### US-BK-02 — Đổi, huỷ và theo dõi vòng đời ca khám

> Là người dùng của hệ thống, tôi muốn huỷ hoặc dời ca khám trong phạm vi được
> phép và xem lại lịch sử thay đổi, để lịch luôn phản ánh đúng thực tế.

- **AC1** — Given ca khám của tôi, When huỷ, Then slot đó được trả lại và người
  khác đặt được ngay.
- **AC2** — Given ca khám đã huỷ, Then bản ghi vẫn còn và lịch sử giữ đủ các bước
  đã đi qua.
- **AC3** — Given dời sang một slot không còn trống, Then thao tác bị từ chối và
  ca khám giữ nguyên giờ cũ — không có trạng thái nửa vời.
- **AC4** — Given dời thành công, Then slot cũ được trả lại và slot mới bị chiếm.
- **AC5** — Given ca khám chưa tới giờ, When bác sĩ bấm bắt đầu, Then bị từ chối;
  chỉ khi đã tới giờ mới chuyển sang `IN_PROGRESS` được.
- **AC6** — Given ca khám đã `COMPLETED`, Then mọi thay đổi trạng thái tiếp theo
  đều bị từ chối.
- **AC7** — Given ca khám đã bắt đầu hoặc đã qua giờ, Then bệnh nhân không còn
  huỷ được nữa.
- **AC8** — Given đánh dấu `NO_SHOW`, Then chỉ được phép sau khi khoảng giờ của ca
  khám đã trôi qua.
- **AC9** — Given một người dùng khác mở ca khám không phải của họ, Then nhận
  **404** chứ không phải 403.
- **AC10** — Given bệnh nhân tự đổi trạng thái ca khám, Then bị từ chối — đó là
  việc của bác sĩ hoặc admin.

---

## RAG

Cột test của hai story này trỏ tới các nhóm câu hỏi trong
`rag/eval/eval_questions.yaml`, các lần chạy đã ghi lại trong
`rag/eval/results/`, và các lớp `unittest` trong `rag/` — không phải lớp JUnit
nào.

### US-AI-01 — Hỏi đáp dựa trên tài liệu, có trích nguồn

> Là bệnh nhân, tôi muốn hỏi về bệnh và thuốc rồi nhận câu trả lời kèm phần tài
> liệu nguồn, để biết câu trả lời đến từ đâu thay vì phải tin suông.

- **AC1** — Given một câu hỏi, When gửi tới trợ lý, Then hệ thống nhúng câu hỏi,
  lấy 3 đoạn gần nhất từ kho vector, và chỉ trả lời dựa trên 3 đoạn đó.
- **AC2** — Given câu trả lời, Then phần nguồn kèm theo nêu đúng những
  `section_id` đã dùng, và giao diện hiện chúng ngay dưới câu trả lời.
- **AC3** — Given câu hỏi mà tài liệu không trả lời được, Then trợ lý nói rõ là
  thông tin không có trong tài liệu, không đoán và không lấp chỗ trống.
- **AC4** — Given không tìm được đoạn nào, Then trợ lý trả lời thẳng rằng không
  có tài liệu nào để dựa vào.
- **AC5** — Given tài liệu liệt kê một chuỗi bước hoặc các cảnh báo an toàn, Then
  câu trả lời giữ **đủ** các mục theo đúng thứ tự, không rút gọn cho ngắn.
- **AC6** — Given câu trả lời đang được tạo, Then nội dung hiện dần theo từng
  phần, và phần nguồn hiện ra trước nội dung.
- **AC7** — Given tôi tải lên một file PDF hoặc TXT, Then nội dung file được
  trích ra và dùng kèm tài liệu sẵn có cho riêng câu hỏi đó; file quá 5 MB, quá
  20 trang, có mật khẩu, hoặc là PDF scan không có chữ chọn được đều bị từ chối
  kèm lý do đọc hiểu được.
- **AC8** — Given kho vector rỗng hoặc mô hình nhúng không chạy, Then endpoint
  sức khoẻ báo rõ thành phần nào hỏng và giao diện giải thích, thay vì im lặng
  thất bại. Given kho vector được dựng bằng một mô hình nhúng khác với mô hình
  đang truy vấn, Then hệ thống dừng lại thay vì trả về những đoạn sai mà vẫn
  trông như đúng.
- **AC9** — Given cần đo chất lượng truy hồi, Then bộ 85 câu hỏi trong
  `eval_questions.yaml` chấm được recall@1 và recall@3 trên các section đúng, và
  mỗi lần chạy được lưu lại để so sánh trước/sau.
- **AC10** — Given câu hỏi tìm cách đổi chỉ thị của trợ lý, hỏi chuyện không
  liên quan tới y tế, hoặc đòi đặt/huỷ lịch hẹn, Then bị từ chối **trước khi**
  chạm tới mô hình, kèm một câu nói rõ trợ lý làm được gì — riêng chuyện đặt lịch
  thì chỉ sang trang đặt lịch.
- **AC11** — Given các lời nhắc gửi cho mô hình, Then chúng nằm trong file có
  đánh số phiên bản dưới `rag/prompts/`, không viết thẳng trong code, nên đổi lời
  nhắc là một thay đổi nhìn thấy được trong Git.

### US-AI-02 — Gợi ý khoa khám từ triệu chứng

> Là bệnh nhân đã đăng nhập, tôi muốn mô tả triệu chứng và được gợi ý nên khám
> khoa nào, để không phải tự đoán giữa một danh sách khoa.

- **AC1** — Given tôi chưa đăng nhập, When gọi chức năng gợi ý, Then bị từ chối —
  chức năng này đọc dữ liệu phòng khám thật nên cần token.
- **AC2** — Given mô tả triệu chứng, Then mô hình lần lượt gọi ba công cụ **chỉ
  đọc**: lấy danh sách khoa, tìm bác sĩ theo khoa, xem lịch trống của một bác sĩ.
  Không công cụ nào thay đổi dữ liệu, nên không có bước xác nhận nào cần hỏi.
- **AC3** — Given mô hình xin một công cụ ngoài danh sách cho phép, hoặc trả về
  JSON sai định dạng, Then yêu cầu bị từ chối.
- **AC4** — Given kết quả cuối cùng, Then nó là JSON hợp lệ theo schema đã khai:
  mức khẩn, id khoa, id bác sĩ, lý do, lời dặn an toàn, và danh sách nguồn.
- **AC5** — Given mô hình bịa ra một id khoa hoặc id bác sĩ không có trong dữ
  liệu vừa đọc được, Then kết quả bị từ chối.
- **AC6** — Given mô hình trích một nguồn không nằm trong các đoạn đã lấy, Then
  kết quả bị từ chối.
- **AC7** — Given bác sĩ được gợi ý không thuộc khoa được gợi ý, Then kết quả bị
  từ chối.
- **AC8** — Given mức khẩn là `emergency` hoặc `uncertain`, Then hệ thống **xoá**
  gợi ý khoa và bác sĩ, và khuyên đi khám trực tiếp ngay.
- **AC9** — Given bác sĩ được chọn không còn slot trống nào, Then phần gợi ý bác
  sĩ bị gỡ và chỉ giữ lại gợi ý khoa.
- **AC10** — Given dữ liệu phòng khám tạm thời không gọi được, Then người dùng
  nhận một câu thông báo đọc hiểu được thay vì lỗi kỹ thuật.
- **AC11** — Given văn bản của bệnh nhân hoặc tài liệu lấy về có chứa câu ra lệnh
  cho mô hình, Then chúng được coi là dữ liệu chứ không phải chỉ thị.

---

## Chưa thành story

Tổng đang là 12, nên còn **ba** chỗ trước khi chạm trần 15 của đề. Ba ứng viên
dưới đây đều đã có code và test sẵn, xếp theo thứ tự đáng lấy nhất.

**US-DR-04 — bệnh nhân chưa đăng nhập tìm bác sĩ.** Hai trang công khai
`pages/Doctors` và `pages/DoctorDetails` chạy trên `/api/public/**` và đã có
`catalog/PublicCatalogApiTest` (9 test) phủ phía server. Đây là ứng viên mạnh
nhất vì nó là cửa vào của cả luồng đặt lịch, mà hiện chưa story nào kể.

**US-AU-04 — hồ sơ cá nhân và đổi mật khẩu khi đã đăng nhập.** `/api/users/me`
và `/api/users/me/password` đã có code và đã được `user/UserApiTest` phủ.

**Một story admin thứ ba.** `AdminFeaturesApiTest` còn phủ quản lý người dùng,
quản lý bệnh nhân, báo cáo, cài đặt hệ thống và thông báo — năm mảng chưa story
nào nhận. Gom thành một story thì rộng quá, tách ra thì vượt khung, nên để
nguyên cho tới khi có chỗ.

Lấy thêm cái nào thì nhớ sửa bảng ở đầu file và thêm dòng tương ứng vào
[`TRACEABILITY.md`](TRACEABILITY.md) — một story không có dòng truy vết thì coi
như chưa viết.
