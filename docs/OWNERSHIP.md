# Phân chia module

Ai trả lời cho phần nào khi vấn đáp, và code của phần đó nằm ở đâu. Đây là yêu
cầu của Mục 5.4 trong đề: mỗi thành viên sở hữu ít nhất một module và là người
đầu tiên trả lời câu hỏi về module đó.

Chốt ngày 2026-10-23. Nếu phân chia thay đổi, sửa ở file này trước — đây là thứ
cả nhóm lẫn giảng viên đọc, không phải trí nhớ của ai về buổi họp.

**Nguyên tắc của nhóm: không quan tâm ai đã làm phần nào.** Ranh giới module được
vạch theo *chủ đề*, không theo tác giả. Ai được phân công module nào thì phải
hoàn thành và hiểu hết module ấy, kể cả những phần do người khác viết. Vì vậy
bảng dưới đây không có cột tác giả — nó là bảng phân công trình bày, và `git log`
không phải căn cứ để đọc nó. Hệ quả nằm ở mục cuối file.

Cụ thể với module doctor: nó gồm **cả hai phía**. Phía admin quản lý bác sĩ
(duyệt, sửa hồ sơ, xếp lịch trực) và phía bác sĩ tự làm việc (lịch hẹn, lịch
nghỉ, hồ sơ công khai) nằm chung một module, vì code của chúng nằm chung trong
package `doctor` và cùng một người đứng ra giải thích.

## Nhóm

| Thành viên | Module | Phần việc khác |
|---|---|---|
| **Huy** | authen, doctor | slides; mục AI_USAGE cho phần RAG |
| **Lộc** | RAG | phần AI design trong báo cáo; ghi chú AI usage cho doctor details + page |
| **Dũng** | admin, booking | sơ đồ kiến trúc; tổng hợp tài liệu |

[`USER_STORIES.md`](USER_STORIES.md) **không chia story theo người** — đề không
yêu cầu thế, và 14 story ở đó mô tả cả sản phẩm. File này mới là chỗ nói ai trả
lời cho khối nào, nên đây là bảng bắc cầu từ người sang story:

| Thành viên | Khối | Story phải trace được |
|---|---|---|
| **Huy** | authen, doctor | US-AU-01…03, US-DR-01…05 |
| **Lộc** | RAG | US-AI-01…02 |
| **Dũng** | admin, booking | US-AD-01…02, US-BK-01…02 |

## Code của mỗi module nằm ở đâu

Đường dẫn tính từ thư mục gốc của repo. Phần backend đã lược bỏ tiền tố chung
`backend/src/main/java/com/example/healthcare/backend/`; phần frontend lược bỏ
`frontend/src/`.

| Module | Chủ | Backend | Frontend | Test |
|---|---|---|---|---|
| **authen** | Huy | `auth/**`, `user/**`, `config/SecurityConfig.java` | `pages/Login`, `pages/Register`, `pages/ForgotPassword`, `pages/ResetPassword`, `pages/VerifyEmail`, `pages/Profile`, `pages/ChangePassword`, `context/AuthProvider.tsx`, `components/ProtectedRoute.tsx`, `components/RequireRole.tsx` | `auth/AuthApiTest`, `auth/reset/PasswordResetFlowTest`, `auth/verify/EmailVerificationFlowTest`, `user/UserApiTest` |
| **doctor** | Huy | `doctor/**` — `AdminDoctorController`, `DoctorRequestController`, `AdminScheduleController`, `DoctorSelfController` cùng các service, `Doctor`, `DoctorSchedule`, `DoctorRepository`; thêm `booking/AvailabilityException` | `pages/Admin/AdminDoctors`, `pages/Admin/AdminDoctorRequests`, `pages/Admin/AdminSchedules`, `pages/Doctors`, `pages/DoctorDetails`, `pages/Doctor/**` | `doctor/AdminDoctorApiTest`, `doctor/AdminScheduleApiTest`, `doctor/DoctorRequestApiTest`, `doctor/DoctorRepositoryTest`, `doctor/DoctorManagementIntegrationTest`, `frontend/tests/doctor.test.ts` |
| **admin** | Dũng | `department/**`, `admin/**` (gồm `admin/ai/**` — telemetry và bảng mức dùng AI) | `layouts/AdminLayout`, `pages/Admin/AdminDashboard`, `pages/Admin/AdminDepartments`, `pages/Admin/AdminAiUsage` | `department/AdminDepartmentApiTest`, `admin/AiTelemetryApiTest`, `admin/GoogleAiUsageApiTest`, `admin/AdminFeaturesApiTest` |
| **booking** | Dũng | `booking/**` | `pages/Booking`, `pages/Appointments` | `booking/BookingFlowTest`, `booking/AvailabilityEngineTest`, `booking/SqlServerBookingContractTest`, `frontend/tests/booking.test.ts` |
| **RAG** | Lộc | `rag/**` (service Python riêng) | `components/AIChatWidget.tsx`, `services/chatApi.ts` | `rag/eval/eval_questions.yaml` và các lần chạy trong `rag/eval/results/` |

Code dùng chung thì không thuộc về riêng ai: `common/**`, `components/admin/**`,
`hooks/useAsync.ts` và `api/client.ts` là thứ mọi người đều đụng vào. Câu hỏi về
mấy file này thuộc về người sửa chúng gần nhất.

### Trạng thái dữ liệu của các trang bác sĩ

`pages/Doctors`, `pages/DoctorDetails` và `pages/Doctor/**` đều thuộc module
doctor: hai trang đầu là cách bệnh nhân tìm bác sĩ, ba trang sau là nơi bác sĩ
làm việc. Tính đến 2026-10-26, **cả năm trang đã chạy trên API thật**:

| Trang | Nguồn dữ liệu |
|---|---|
| `pages/Doctors` | `/api/public/doctors` + `/api/public/departments` — không cần đăng nhập |
| `pages/DoctorDetails` | `/api/public/doctors/{id}`; phần lịch trống gọi `/api/booking` nên chỉ hiện khi đã đăng nhập |
| `pages/Doctor/DoctorWorkspace` | `/api/doctor/appointments` |
| `pages/Doctor/DoctorSchedule` | `/api/doctor/schedules` + `/api/doctor/availability-exceptions` |
| `pages/Doctor/DoctorProfile` | `/api/doctor/me` + `/api/doctor/me/public-profile` |

Hai hạn chế tôi ghi ở bản trước — `DoctorProfile` không có endpoint và
`DoctorSchedule` chỉ ghi lịch nghỉ vào bộ nhớ — **đã được giải quyết** bằng
`DoctorSelfController` ở backend và phần frontend merge vào `main` ngày 26/10.
`DoctorManagementIntegrationTest` với 9 test là bản đặc tả của hai trang này.

## Hệ quả: chủ module phải hiểu hết module, không chỉ phần mình viết

Theo nguyên tắc ở đầu file, mỗi người phải nắm **toàn bộ** module mình đứng tên —
cả backend lẫn frontend, cả phần đã xong lẫn phần còn dở — bất kể ai đã gõ.

Riêng module doctor, người đứng tên phải sẵn sàng cho **cả hai phía**: giám khảo
có thể hỏi về luồng admin duyệt bác sĩ, rồi hỏi tiếp bác sĩ đó đăng nhập vào thì
thấy gì. Hai nửa nối nhau ở chỗ `DoctorRequestService.approve()` đặt
`user.setRole(Role.DOCTOR)` — từ dòng đó trở đi, tài khoản ấy mở được
`/api/doctor/**`.

Cụ thể, với từng module, hãy kiểm tra trước buổi bảo vệ:

- Mở được file ở cột backend **và** cột frontend của module mình.
- Kể được một request đi từ màn hình xuống tới database: component nào gọi hàm
  nào trong `api/`, hàm đó gọi endpoint nào, controller nào nhận, service nào xử
  lý, bảng nào bị ghi.
- Trả lời được "vì sao làm thế này" cho ít nhất một quyết định trong module, kể
  cả khi quyết định đó không phải của mình.

Phần nào mình không viết thì đọc trước, và hỏi thẳng người đã viết. Mục 11 chặn
điểm cá nhân ở 50% điểm nhóm nếu không giải thích nổi module của mình, và lý do
"phần đó bạn khác làm" không gỡ được mức chặn đó.
