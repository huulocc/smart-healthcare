# AI_USAGE — Ghi nhận việc dùng công cụ AI

Yêu cầu Mục 5.3 của đề: liệt kê các phần chính được sinh ra bằng công cụ AI, công
cụ nào, prompt chính, và **nhóm đã kiểm tra hoặc sửa gì** trong code đó; kèm ít
nhất **2 trường hợp code AI sinh ra bị sai** và cách phát hiện, khắc phục.

Đây là file tổng hợp. Hai mảng việc đã có hồ sơ chi tiết riêng, viết bằng tiếng
Anh, và file này chỉ tóm tắt lại:

- [`docs/AI_USAGE_AND_REVIEW.md`](docs/AI_USAGE_AND_REVIEW.md) — phần tài khoản
  (đăng ký, đăng nhập, hồ sơ, đổi/quên mật khẩu)
- [`docs/AI_USAGE_BOOKING.md`](docs/AI_USAGE_BOOKING.md) — phần đặt lịch hẹn

Ai sở hữu module nào để vấn đáp thì xem [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md).
Lưu ý hai thứ đó khác nhau: bảng dưới đây ghi **ai đã dùng AI để viết code**, còn
bảng phân công ghi **ai đứng ra giải thích**.

---

## 1. Công cụ AI đã dùng

| Công cụ | Model | Dùng cho |
|---|---|---|
| **Claude Code** (Claude desktop, tab Code) | Claude Sonnet 5, Claude Opus 5 | Phần tài khoản, admin, bác sĩ, chuyển sang SQL Server, danh bạ công khai, RAG |
| **Codex** | — | Khung backend đặt lịch: entity, `AvailabilityEngine`, DTO, migration `001_booking.sql` |
| **Antigravity** | Gemini 3.8 Flash | Tích hợp full-stack phần đặt lịch: `bookingApi.ts`, schema Zod, nối các trang React, xử lý collation SQL Server |

**Cách làm chung:** AI đọc dự án, đề xuất kế hoạch, người phụ trách trả lời các
câu hỏi còn mở, rồi AI làm **từng bước một**; sau mỗi bước người phụ trách chạy
thử và duyệt mới cho đi tiếp.

---

## 2. Các mảng việc

Sáu mảng, theo đúng thứ tự trong `git log`.

### 2.1. Giao diện danh sách khoa, bác sĩ và khung chat — PR #2 (20/08/2026)

**Người thực hiện:** Lộc (`huulocc`)

> *Chờ Lộc viết.* Cần: công cụ đã dùng, một prompt đại diện, AI sinh ra những file
> nào (`pages/Departments`, `pages/Doctors`, `components/AIChatWidget.tsx`), và
> bạn đã kiểm tra hoặc sửa gì trước khi commit.

### 2.2. Tài khoản: đăng ký, đăng nhập, hồ sơ, mật khẩu — PR #3, #5 (30/08 và 11/10/2026)

**Người thực hiện:** Huy · **Công cụ:** Claude Code (Sonnet 5, Opus 5)

**Prompt chính:** *"Xây phần tài khoản cho ứng dụng y tế: đăng ký, đăng nhập, hồ
sơ, đổi mật khẩu, quên mật khẩu. Giai đoạn 1 làm giao diện React với dữ liệu giả
và validation; giai đoạn 2 thay bằng Spring Boot + MySQL thật, mật khẩu băm
BCrypt, đăng nhập bằng JWT, đặt lại mật khẩu qua email."*

**AI sinh ra:** 6 màn hình React cùng `FormInput`, `AuthLayout`, schema Zod; phía
backend là `AuthController`, `AuthService`, `JwtService`,
`JwtAuthenticationFilter`, `SecurityConfig`, hai dịch vụ token (kích hoạt email và
đặt lại mật khẩu), và bộ test API.

**Người kiểm tra và sửa:** chia công việc thành 7 bước, mỗi bước chạy thử rồi mới
duyệt bước sau. Các vấn đề phát hiện được ghi ở mục 3.1. Kiểm chứng bằng test tự
động, gọi API bằng curl trên MySQL thật, và chạy tay trên trình duyệt toàn bộ
luồng từ đăng ký tới đặt lại mật khẩu.

Chi tiết: [`docs/AI_USAGE_AND_REVIEW.md`](docs/AI_USAGE_AND_REVIEW.md).

### 2.3. RAG cho chatbot — PR #4 (11/10/2026)

**Người thực hiện:** Huy (13 commit trong `rag/`) · **Công cụ:** Claude Code

> *Chờ Huy viết.* Cần: prompt đại diện, AI sinh ra những gì trong `rag/`
> (`ingest.py`, `retrieve.py`, `generate.py`, `evaluate.py`, `llm.py`), và bạn đã
> kiểm tra hoặc sửa gì.
>
> Nguyên liệu sẵn có để viết mục này, không cần nhớ lại: `rag/README.md` đã ghi
> các số đo và những thứ đã thử; thư mục `rag/eval/results/` lưu kết quả từng lần
> chạy kèm cấu hình; và `rag/config.py` có comment giải thích vì sao chọn từng
> tham số. Hai ứng viên rõ ràng cho mục "AI sai": chuyện thiếu tiền tố
> `search_document:` / `search_query:` làm hỏng xếp hạng **mà không báo lỗi gì**,
> và chuyện trộn hai model embedding khác nhau khiến tìm kiếm trả về sai đoạn
> nhưng điểm số vẫn trông hợp lý.

### 2.4. Khu quản trị và quản lý bác sĩ — PR #6, #9 (11/10 và 22/10/2026)

**Người thực hiện:** Huy · **Công cụ:** Claude Code

**Prompt chính:** *"Dựng khu admin trên dữ liệu thật: duyệt yêu cầu làm bác sĩ,
quản lý hồ sơ bác sĩ có tìm kiếm/lọc/phân trang, quản lý khoa, và bảng xếp lịch
trực theo tuần. Bỏ hết các màn hình chạy dữ liệu giả."*

**AI sinh ra:** `AdminDoctorController/Service`, `DoctorRequestController/Service`,
`AdminScheduleController/Service`, `AdminDepartmentController/Service` cùng các
repository và DTO; phía frontend là `AdminDoctors`, `AdminDoctorRequests`,
`AdminSchedules`, `AdminDepartments` và các component dùng chung trong
`components/admin/`.

**Người kiểm tra và sửa:** 47 test API cho khu này — `AdminDoctorApiTest` (18),
`AdminScheduleApiTest` (12), `DoctorRequestApiTest` (10),
`AdminDepartmentApiTest` (7). Phần đáng kiểm nhất là
`AdminScheduleService.validateDay()` — các quy tắc chống trùng ca, `BREAK` phải
nằm trong `WORK`, sửa một ca không được bỏ rơi giờ nghỉ của nó — đều được chốt
lại bằng test trước khi tin là đúng.

### 2.5. Chuyển backend từ MySQL sang SQL Server — PR #8 (22/10/2026)

**Người thực hiện:** Huy · **Công cụ:** Claude Code

**Prompt chính:** *"Chuyển toàn bộ backend từ MySQL sang SQL Server, giữ nguyên
dữ liệu nhóm đang có trong file .bak."*

**AI sinh ra:** đổi driver và module Flyway, viết lại cả 5 migration sang T-SQL,
thêm `V6` để hoà giải schema, và tài liệu [`docs/DATABASE.md`](docs/DATABASE.md).

**Người kiểm tra và sửa:** kiểu cột **không dịch bằng tay** mà đọc ra từ schema do
Hibernate sinh cho `SQLServerDialect`, vì `ddl-auto=validate` so từng cột và sẽ
chặn khởi động nếu lệch. Giả thuyết "SQL Server sẽ từ chối cặp khóa ngoại vòng
tròn giữa `departments` và `doctors`" được **kiểm chứng bằng cách xóa thật một
user** rồi quan sát, chứ không tin theo suy đoán — hóa ra nó không từ chối, và
không delete rule nào phải đổi. Cả `V1–V6` chạy trên database rỗng và `V6` chạy
trên bản khôi phục đều được so schema từng cột, kết quả giống nhau.

### 2.6. Đặt lịch hẹn — commit `4e032f0` (23/10/2026)

**Người thực hiện:** Dũng (`chidungg`) · **Công cụ:** Codex, Antigravity (Gemini 3.8 Flash)

**AI sinh ra:** Codex dựng khung backend — `Appointment`, `BookingRequestKey`,
`AppointmentHistory`, `AvailabilityException`, `AvailabilityEngine`, DTO và
migration `001_booking.sql`. Antigravity làm phần tích hợp: `bookingApi.ts`,
`bookingSchemas.ts`, nối các trang React, xử lý collation SQL Server và script
kiểm thử PowerShell.

**Người kiểm tra và sửa:** ba lỗi thật được phát hiện và khắc phục, ghi ở mục 3.3.

Chi tiết: [`docs/AI_USAGE_BOOKING.md`](docs/AI_USAGE_BOOKING.md).

### 2.7. Danh bạ công khai — chưa merge (24/10/2026)

**Người thực hiện:** Huy · **Công cụ:** Claude Code (Opus 5)

**Prompt chính:** *"Mở endpoint công khai chỉ-đọc cho danh sách bác sĩ và khoa,
rồi nối hai trang công khai vào đó."*

**AI sinh ra:** package `catalog` ở backend (`PublicCatalogController`,
`PublicCatalogService`, `PublicDepartmentResponse`), `DoctorRepository.searchPublic`,
một dòng `permitAll` trong `SecurityConfig`, 9 test, và phía frontend là
`api/publicApi.ts` cùng hai trang `Doctors`, `DoctorDetails` viết lại.

**Người kiểm tra và sửa:** bốn trường bịa trên trang chi tiết bác sĩ (điểm đánh
giá `4.9`, số lượt đánh giá tính theo `120 + id * 15`, số phòng khám, phí khám) bị
**gỡ bỏ** thay vì giữ lại, vì backend không có nguồn nào cho chúng và giữ lại là
bịa dữ liệu y tế. Bốn lỗi của chính AI trong phiên này ghi ở mục 3.4.

---

## 3. Những trường hợp code AI sinh ra bị sai

Đề yêu cầu ít nhất 2. Dưới đây có 9, chia theo mảng việc.

### 3.1. Phần tài khoản — Huy

| Vấn đề | Ai phát hiện | Cách khắc phục |
|---|---|---|
| Bật pnpm qua corepack làm `pnpm-lock.yaml` bị ghi đè kèm nhiều thay đổi không liên quan | AI, khi xem `git diff` | Hoàn tác, chỉ thêm đúng một dòng dependency rồi chạy `npm install` |
| Toàn bộ chữ trên giao diện đang là tiếng Việt trong khi hệ thống dùng tiếng Anh | Người review PR #3 | Dịch lại toàn bộ chuỗi |
| Nút **Log Out** ở trang hồ sơ nhảy về `/login` thay vì về trang chủ | AI, khi chạy thử trên trình duyệt | Gộp đăng xuất và điều hướng vào một `startTransition` trong `Navbar.tsx` |

### 3.2. Chuyển sang SQL Server — Huy

**Kiểu cột dịch bằng tay thì sai.** Dịch cơ học `datetime(6)` của MySQL sang
`datetime2` là cách làm trực giác và **sai**: Hibernate ánh xạ `Instant` qua
`TIMESTAMP_UTC`, mà dialect của SQL Server render thành `datetimeoffset`. Cột
`datetime2` báo về một mã kiểu JDBC khác và ứng dụng sẽ không khởi động nổi. Phát
hiện khi `ddl-auto=validate` chặn khởi động; khắc phục bằng cách đọc kiểu cột ra
từ schema do chính Hibernate sinh cho dialect đó thay vì tự dịch.

### 3.3. Phần đặt lịch — Dũng

**Case 1 — Collation không phân biệt hoa thường trên khóa idempotency.** AI tạo
cột `request_key varchar(64)` theo collation mặc định của database
(`SQL_Latin1_General_CP1_CI_AS`), vốn **không phân biệt hoa thường**. Khóa
idempotency cần so khớp chính xác từng byte, nếu không sẽ có nguy cơ đụng khóa
giả. Phát hiện khi rà soát collation của các ràng buộc; khắc phục bằng cách
chuyển cột sang `Latin1_General_100_BIN2`.

**Case 2 — Schema validation phía client lệch với backend.** AI để `dob` và
`reason` là `optional` trong `bookingSchemas.ts`, trong khi DTO Java bắt buộc
`@NotNull @Past` và `@NotBlank @Size(max=500)`, kèm regex số điện thoại Việt Nam.
Người dùng bỏ trống sẽ bị `400 Bad Request` không rõ lý do. Phát hiện bởi
`frontend/tests/booking.test.ts`; khắc phục bằng cách siết schema Zod cho khớp
từng ràng buộc của backend.

**Case 3 — Script test không chạy trên PowerShell 5.1.** AI viết script với
`#requires -Version 7.0`, dùng `[Net.Http.HttpClient]` mà không nạp assembly, và
đặt `$ErrorActionPreference = 'Stop'` quanh lệnh native khiến script dừng giữa
chừng. Khắc phục bằng cách viết lại cho tương thích 5.1.

### 3.4. Danh bạ công khai — Huy

Bốn lỗi dưới đây xảy ra trong cùng một phiên làm việc ngày 24/10/2026 và đều kiểm
chứng được trong lịch sử phiên.

**(a) AI kết luận sai về hiện trạng dự án.** AI báo cáo rằng cả 5 trang bác sĩ
vẫn chạy trên dữ liệu giả và "chưa được nối vào API thật". Thực tế 3 trong 5 trang
đã gọi API thật từ trước. Nguyên nhân: AI đọc **danh sách dòng `import`** rồi kết
luận, trong khi phần lớn thứ được import từ `appointmentDemo` chỉ là kiểu dữ liệu
và hàm xử lý ngày tháng, không phải dữ liệu giả. Phát hiện khi mở
`AppointmentContext.tsx` ra đọc nội dung. Đây là loại lỗi nguy hiểm nhất trong cả
danh sách: không sai cú pháp, không test nào bắt được, chỉ sai ở việc **hiểu bối
cảnh** — và nếu tin theo thì nhóm đã đi sửa những trang vốn không hỏng.

**(b) AI viết code thừa để che lỗi của chính nó.** AI để lại một import không dùng
tới, rồi thay vì xóa import đó lại thêm một method `documented()` vô nghĩa chỉ để
"hợp thức hóa" nó. Tự phát hiện ngay sau khi ghi file, xóa cả hai.

**(c) Test do AI viết không biên dịch được.** Static import `get` của MockMvc trùng
tên với method `get(url, token)` kế thừa từ `ApiTestSupport`, Maven báo
*"actual and formal argument lists differ in length"*. Khắc phục bằng một helper
đặt tên `anonymous()` để gọi rõ ràng.

**(d) AI áp sai nguyên tắc của nhóm.** AI gỡ ba trang bác sĩ khỏi module doctor vì
chúng do thành viên khác viết — trong khi nhóm chia module theo **chủ đề**, không
theo tác giả. Người phụ trách chỉ ra, AI hoàn tác và ghi nguyên tắc đó thành câu
đầu tiên của [`docs/OWNERSHIP.md`](docs/OWNERSHIP.md) để không lặp lại.

---

## 4. Cách nhóm kiểm chứng code do AI sinh ra

- **Test tự động:** `cd backend && ./mvnw test` — hiện 123 test, 0 lỗi, 3 skip
  (nhóm test hợp đồng SQL Server, cần instance thật).
- **Kiểm kiểu và lint phía frontend:** `npx tsc -b` và `npx eslint`.
- **Chạy tay trên trình duyệt** với backend thật cho từng luồng chính.
- **Đối chiếu schema:** `ddl-auto=validate` so từng cột giữa entity và database ở
  mỗi lần khởi động — xem [`docs/DATABASE.md`](docs/DATABASE.md) mục 6, nơi giải
  thích vì sao đây là thứ duy nhất đang kiểm các migration.
  **Lưu ý:** từ commit `4e032f0` thiết lập này đã bị đổi thành `ddl-auto=update`
  và Flyway bị tắt, nên trên `main` hiện tại lớp kiểm chứng đó **không còn chạy**.
  `docs/DATABASE.md` đang mô tả thiết kế dự định chứ không phải cấu hình thực tế.
- **Bộ đánh giá RAG:** `python rag/evaluate.py`, kết quả từng lần chạy lưu kèm
  cấu hình trong `rag/eval/results/`.

---

## 5. Còn thiếu

- [ ] Mục 2.1 — Lộc viết
- [ ] Mục 2.3 — Huy viết (phần RAG)
- [ ] Mảng việc nào phát sinh sau 25/10/2026 thì thêm một mục vào phần 2 ngay khi
      merge, đừng để dồn tới cuối kỳ
