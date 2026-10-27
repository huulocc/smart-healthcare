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
| **Codex** | — | Giao diện danh bạ/chat, triage + upload + chatbot eval; khung backend đặt lịch |
| **Antigravity** | Gemini 3.8 Flash | Tích hợp full-stack phần đặt lịch: `bookingApi.ts`, schema Zod, nối các trang React, xử lý collation SQL Server |

**Cách làm chung:** AI đọc dự án, đề xuất kế hoạch, người phụ trách trả lời các
câu hỏi còn mở, rồi AI làm **từng bước một**; sau mỗi bước người phụ trách chạy
thử và duyệt mới cho đi tiếp.

---

## 2. Các mảng việc

Tám mảng, theo đúng thứ tự trong `git log`.

### 2.1. Giao diện danh sách khoa, bác sĩ và khung chat — PR #2 (20/08/2026)

**Người thực hiện:** Lộc (`huulocc`) · **Công cụ:** Codex

**Prompt đại diện (tóm tắt, không phải trích nguyên văn):** *"Dựa trên giao diện
Smart Healthcare hiện có, thêm trang danh sách khoa, trang danh sách bác sĩ có
tìm kiếm/lọc, và một chat widget nổi dùng React + CSS module; giữ cùng phong cách
với trang chủ."*

**AI sinh ra:** `pages/Departments`, `pages/Doctors`, `AIChatWidget.tsx` và các
CSS module tương ứng; thêm route, gắn widget vào `MainLayout`, và tạo
`data/mockData.ts` để giao diện chạy được trước khi backend sẵn sàng.

**Kiểm tra và sửa thể hiện trong lịch sử repo:** commit đầu chỉ là prototype UI:
chat trả lời bằng `setTimeout`, còn danh sách đọc mock data. Phần chat sau đó được
thay bằng stream thật từ RAG (`65c234c`, `c34a7f6`); danh bạ được thay bằng API
Spring Boot và gỡ các trường đánh giá/phí bị bịa (`1924941`). Các thay đổi tiếp
theo cũng sửa layout và type để qua `npm run build`/ESLint. Vì prompt nguyên văn
không được lưu trong Git, phần trên chủ động ghi là bản tóm tắt thay vì giả làm
trích dẫn phiên làm việc.

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

**Prompt chính (tóm tắt):** *"Xây một RAG baseline tối thiểu, chạy local trên
Ollama, đọc patient leaflets từ PDF, chia chunk, lưu Chroma, truy xuất top-k và
trả lời chỉ từ nguồn. Viết bộ đánh giá trước khi tối ưu; mọi kết quả phải lưu kèm
model, tham số và phiên bản prompt để tái lập. Sau đó thêm Gemini như một backend
có thể đổi bằng cấu hình mà không làm đổi pipeline."*

**AI sinh ra:** `ingest.py` để trích PDF/chunk/embed, `retrieve.py` để kiểm tra
metadata collection và tìm top-k, `generate.py` để dựng prompt/citation,
`evaluate.py` cùng bộ câu hỏi và result JSON, `llm.py` để đổi Ollama/Gemini, và
FastAPI `server.py` dùng bởi widget. Cấu hình nằm ở `config.py`; prompt được tách
ra file có phiên bản để mỗi kết quả chỉ đúng với cấu hình đã ghi.

**Người kiểm tra và sửa:** không chấp nhận pipeline chỉ vì nó chạy được. Mỗi lần
đổi chunking/prompt/model đều chạy lại eval và giữ file kết quả. Hai lỗi im lặng
quan trọng được đo rồi chặn trong code: (1) `nomic-embed-text` thiếu tiền tố
`search_document:` / `search_query:` vẫn trả vector nhưng làm Q14 xếp sai; (2)
index được tạo bởi một embedding model vẫn có thể bị query bằng model khác và trả
điểm nhìn có vẻ hợp lý, nên ingest đóng dấu model/dimension còn retrieve từ chối
khi metadata không khớp. Ngoài ra, bật thinking nâng answer score từ 27/30 lên
29/30 và phục hồi bước gọi xe cấp cứu ở Q23; lỗi stream HTTP 200 nhưng không có
answer được đổi thành lỗi rõ ràng thay vì để UI treo.

Chi tiết, số đo và file kết quả: [`rag/README.md`](rag/README.md),
[`docs/CHATBOT.md`](docs/CHATBOT.md), `rag/eval/results/`.

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

### 2.7. Danh bạ công khai — commit `1924941` (24/10/2026)

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

### 2.8. Chatbot triage, upload và evaluation guardrails — PR #13, #15 (26/10/2026)

**Người thực hiện:** Lộc (`huulocc`) · **Công cụ:** Codex

**Prompt chính (tóm tắt):** *"Bổ sung tool B/C của mục 4.1 để chatbot nhận triệu
chứng, gợi ý khoa/bác sĩ/lịch phù hợp; cho phép PDF/TXT làm ngữ cảnh; sau đó tạo
bộ evaluate đúng với các tính năng thật của project và thêm guardrail."*

**AI sinh ra:** ba tool chỉ-đọc trong `rag/clinic_tools.py`, structured output
`TriageDecision`, hai endpoint upload, parser/chunker file, prompt có phiên bản,
guardrail secret/redaction, 25 ca live trong `rag/eval/chatbot_cases.json`, runner
`rag/evaluate_chatbot.py`, test Python/Java và tài liệu chạy eval.

**Người kiểm tra và sửa:** luồng tool kiểm mọi department/doctor/source id với
dữ liệu Spring Boot thay vì tin id do model trả; bearer token chỉ được chuyển tới
Spring, không vào prompt. Upload giới hạn loại file, 5 MB, 20 trang và 24.000 ký
tự; nội dung chỉ tồn tại trong request. Telemetry từ Python sang Spring dùng
shared secret và redaction. Trước khi merge đã chạy 36 test Python, test telemetry
Java, frontend build và lint mục tiêu. Bộ 25 ca đã được validate cấu trúc nhưng
chưa được tính pass rate live vì ba service/model chưa cùng chạy; tài liệu không
biến việc validate thành kết quả đánh giá.

---

## 3. Những trường hợp code AI sinh ra bị sai

Đề yêu cầu ít nhất 2. Dưới đây có 14, chia theo mảng việc: 3 ở mục 3.1, 1 ở 3.2, 3 ở 3.3, 4 ở 3.4 và 3 ở 3.5.

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

### 3.5. RAG cho chatbot — Huy

Hai lỗi dưới đây có cùng một tính chất, và đó là lý do chúng đáng kể ra: **cả hai
đều không sinh ra thông báo lỗi nào.** Chương trình chạy, trả về kết quả, điểm số
trông hợp lý — chỉ có câu trả lời là sai.

**Thiếu tiền tố nhiệm vụ của `nomic-embed-text`.** Model này được huấn luyện với
hai tiền tố, `"search_document: "` cho đoạn văn khi index và `"search_query: "`
cho câu hỏi khi truy vấn. Bỏ chúng đi thì không có lỗi, không có cảnh báo, chỉ là
thứ tự xếp hạng bị hỏng — bỏ tiền tố làm câu Q14 nhảy sang **sai section**.
Phát hiện bằng bộ đánh giá, vì nó chấm section đúng chứ không chấm "có trả lời
được hay không". Khắc phục: hai tiền tố thành hằng số trong `config.py` kèm
comment giải thích tại sao bắt buộc, không để thành kinh nghiệm truyền miệng
(`0028bfc`).

**Trộn hai model nhúng khác nhau.** Index dựng bằng model nào thì phải truy vấn
bằng đúng model đó, nhưng không có gì ngăn chuyện đó, và hậu quả thì vô hình:
tìm kiếm trả về sai đoạn mà điểm cosine vẫn nằm trong khoảng trông bình thường.
Lỗi này lộ ra khi thêm Gemini — vì lúc đó phần nhúng *có thể* bị đổi sang nhà
cung cấp khác. Khắc phục: `ingest.py` **đóng dấu** collection bằng tên model đã
dựng nó (`embed_model: nomic-embed-text`), và `retrieve.py` **dừng hẳn** khi phát
hiện lệch thay vì trả về kết quả sai (`68241ba`).

Một lỗi thứ ba cùng loại, không nằm trong `rag/`: AI đề xuất cấu hình Vite proxy
một khoá `/api` duy nhất, trong khi nhánh chat cần `/api/chat` đi sang cổng 8000.
Vite khớp khoá **theo thứ tự khai báo**, nên gộp lại thì Spring Boot nuốt luôn
request chat và chatbot hỏng **không một tiếng báo**. Ghi lại kèm cách giải quyết
— giữ cả hai khoá, khoá cụ thể hơn đặt trước — trong `0a7d7f1`, trước khi merge
để người gộp nhánh không phải tự phát hiện lại.

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

- [x] Mục 2.1 — giao diện danh bạ và khung chat
- [x] Mục 2.3 — RAG
- [x] Mảng phát sinh ngày 26/10/2026 đã được ghi ở mục 2.8
