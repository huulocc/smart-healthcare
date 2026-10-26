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

## Nhóm

| Thành viên | Module | Phần việc khác |
|---|---|---|
| **Huy** | authen, doctor | slides; mục AI_USAGE cho phần RAG |
| **Lộc** | RAG | phần AI design trong báo cáo; ghi chú AI usage cho doctor details + page |
| **Dũng** | admin, booking | sơ đồ kiến trúc; tổng hợp tài liệu |

## Code của mỗi module nằm ở đâu

Đường dẫn tính từ thư mục gốc của repo. Phần backend đã lược bỏ tiền tố chung
`backend/src/main/java/com/example/healthcare/backend/`; phần frontend lược bỏ
`frontend/src/`.

| Module | Chủ | Backend | Frontend | Test |
|---|---|---|---|---|
| **authen** | Huy | `auth/**`, `user/**`, `config/SecurityConfig.java` | `pages/Login`, `pages/Register`, `pages/ForgotPassword`, `pages/ResetPassword`, `pages/VerifyEmail`, `pages/Profile`, `pages/ChangePassword`, `context/AuthProvider.tsx`, `components/ProtectedRoute.tsx`, `components/RequireRole.tsx` | `auth/AuthApiTest`, `auth/reset/PasswordResetFlowTest`, `auth/verify/EmailVerificationFlowTest`, `user/UserApiTest` |
| **doctor** | Huy | `doctor/AdminDoctorController`, `doctor/DoctorRequestController`, `doctor/AdminScheduleController` cùng các service của chúng, `doctor/Doctor`, `doctor/DoctorSchedule` | `pages/Admin/AdminDoctors`, `pages/Admin/AdminDoctorRequests`, `pages/Admin/AdminSchedules`, `pages/Doctors`, `pages/DoctorDetails`, `pages/Doctor/**` | `doctor/AdminDoctorApiTest`, `doctor/AdminScheduleApiTest`, `doctor/DoctorRequestApiTest`, `doctor/DoctorRepositoryTest` |
| **admin** | Dũng | `department/**` | `layouts/AdminLayout`, `pages/Admin/AdminDashboard`, `pages/Admin/AdminDepartments` | `department/AdminDepartmentApiTest` |
| **booking** | Dũng | `booking/**` | `pages/Booking`, `pages/Appointments` | `booking/BookingFlowTest`, `booking/AvailabilityEngineTest`, `booking/SqlServerBookingContractTest`, `frontend/tests/booking.test.ts` |
| **RAG** | Lộc | `rag/**` (service Python riêng) | `components/AIChatWidget.tsx`, `services/chatApi.ts` | `rag/eval/eval_questions.yaml` và các lần chạy trong `rag/eval/results/` |

Code dùng chung thì không thuộc về riêng ai: `common/**`, `components/admin/**`,
`hooks/useAsync.ts` và `api/client.ts` là thứ mọi người đều đụng vào. Câu hỏi về
mấy file này thuộc về người sửa chúng gần nhất.

### Trạng thái dữ liệu của các trang bác sĩ

`pages/Doctors`, `pages/DoctorDetails` và `pages/Doctor/**` (cổng dành cho bác
sĩ) thuộc module doctor theo chủ đề. Tính đến 2026-10-24:

| Trang | Nguồn dữ liệu |
|---|---|
| `pages/Doctors` | `/api/public/doctors` + `/api/public/departments` — thật, không cần đăng nhập |
| `pages/DoctorDetails` | `/api/public/doctors/{id}` — thật; phần lịch trống gọi `/api/booking` nên chỉ hiện khi đã đăng nhập |
| `pages/Doctor/DoctorWorkspace` | `/api/doctor/appointments` — thật, qua `AppointmentContext` |
| `pages/Doctor/DoctorSchedule` | lịch hẹn thật; nhưng `setAvailability` mới chỉ ghi vào bộ nhớ, chưa gọi `/api/doctor/availability-exceptions` |
| `pages/Doctor/DoctorProfile` | **chưa có API** — xem bên dưới |

Hai phần chưa hoàn thành của module này, người trình bày cần biết:

- **`DoctorProfile` không có endpoint.** Nó ghi `about` / `languages` /
  `expertise` / `image` vào state cục bộ với điều kiện cứng `doctor.id === 1`.
  Backend chỉ có `PUT /api/admin/doctors/{id}` dành cho admin, và DTO của nó
  không mang bốn trường đó. Cần thêm endpoint mới thì trang này mới nối được.
- **`DoctorSchedule` ghi lịch nghỉ vào bộ nhớ.** Endpoint đã có sẵn
  (`addDoctorAvailabilityException`, `deleteDoctorAvailabilityException`), chỉ
  là trang chưa gọi, nên tắt trình duyệt là mất.

## Hệ quả: chủ module phải hiểu hết module, không chỉ phần mình viết

Theo nguyên tắc ở đầu file, mỗi người phải nắm **toàn bộ** module mình đứng tên —
cả backend lẫn frontend, cả phần đã xong lẫn phần còn dở — bất kể ai đã gõ.

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
