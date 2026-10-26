# Bảng truy vết

Mục 5.1 của đề: mỗi user story phải truy được về endpoint hoặc component hiện
thực nó, về các file source nó nằm trong đó, và về test giữ nó đứng yên. Mục đích
của bảng này là buổi bảo vệ — bất kỳ story nào cũng có thể bị chọn và phải mở
được code ngay tại chỗ.

Các story nằm ở [`USER_STORIES.md`](USER_STORIES.md); người sở hữu nằm ở
[`OWNERSHIP.md`](OWNERSHIP.md).

**Các tiền tố đường dẫn đã được lược bỏ** cho dễ đọc:

- backend: `backend/src/main/java/com/example/healthcare/backend/`
- test backend: `backend/src/test/java/com/example/healthcare/backend/`
- frontend: `frontend/src/`

**Số dòng tính đến ngày 2026-10-23.** Chúng sẽ dịch chuyển. Hãy coi đó là điểm
khởi đầu chứ không phải lời hứa — tên file và tên phương thức mới là thứ thực sự
định danh đoạn code.

---

## authen — Huy

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AU-01**<br>Đăng ký và kích hoạt | `POST /api/auth/register`<br>`POST /api/auth/verify-email`<br>`POST /api/auth/resend-verification` | `auth/AuthController.java:36,52,58`<br>`auth/AuthService.java`<br>`auth/verify/EmailVerificationService.java`<br>`auth/verify/EmailVerificationToken.java`<br>`auth/verify/EmailVerificationMailer.java`<br>`common/Emails.java`, `common/Tokens.java`<br>`pages/Register/Register.tsx`<br>`pages/VerifyEmail/VerifyEmail.tsx`<br>`components/ResendVerification.tsx`<br>`schemas/authSchemas.ts`, `api/authApi.ts` | `auth/AuthApiTest`<br>· `registerCreatesPatientWithNormalizedEmailAndNoPassword`<br>· `registerRejectsAnEmailThatIsAlreadyUsedInAnyLetterCase`<br>· `registerReportsEveryInvalidField`<br>· `signingUpAsADoctorOnlyStoresTheRequest`<br>· `adminAccountsCannotBeRequestedAtSignUp`<br>`auth/verify/EmailVerificationFlowTest` (cả 4) |
| **US-AU-02**<br>Đặt lại mật khẩu đã quên | `POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password` | `auth/AuthController.java:64,70`<br>`auth/reset/PasswordResetService.java`<br>`auth/reset/PasswordResetToken.java`<br>`auth/reset/PasswordResetTokenRepository.java`<br>`auth/reset/PasswordResetMailer.java`<br>`pages/ForgotPassword/ForgotPassword.tsx`<br>`pages/ResetPassword/ResetPassword.tsx`<br>`schemas/authSchemas.ts` | `auth/reset/PasswordResetFlowTest`<br>· `resetLinkChangesPasswordAndWorksOnlyOnce`<br>· `unknownEmailGetsTheSameAnswerAndNoEmail`<br>· `newRequestInvalidatesTheOlderLink`<br>· `expiredLinkIsRejected`<br>· `invalidInputIsRejected` |
| **US-AU-03**<br>Đăng nhập, phân quyền theo vai trò | `POST /api/auth/login`<br>`POST /api/auth/google`<br>`GET /api/users/me` | `auth/AuthController.java:42,47`<br>`auth/jwt/JwtService.java`<br>`auth/jwt/JwtAuthenticationFilter.java`<br>`auth/google/GoogleAuthService.java`<br>`config/SecurityConfig.java`<br>`user/UserController.java:27`<br>`pages/Login/Login.tsx`<br>`components/GoogleSignInButton.tsx`<br>`context/AuthProvider.tsx`<br>`components/ProtectedRoute.tsx`, `components/RequireRole.tsx`<br>`api/client.ts` | `auth/AuthApiTest`<br>· `loginReturnsATokenThatOpensTheCurrentUserEndpoint`<br>· `loginGivesTheSameAnswerForWrongPasswordAndUnknownEmail`<br>· `rememberMeMakesTheTokenLastThirtyDaysInsteadOfOneHour`<br>· `googleSignInStaysOffUntilAClientIdIsConfigured`<br>· `protectedEndpointsRejectMissingOrInvalidTokens`<br>`auth/verify/EmailVerificationFlowTest.anAccountCannotLogInUntilTheLinkIsOpened`<br>`doctor/AdminDoctorApiTest.onlyAnAdminGetsIn` |

## doctor — Huy

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-DR-01**<br>Quyết định ai thành bác sĩ | `GET /api/admin/doctor-requests`<br>`POST /api/admin/doctor-requests/{userId}/approve`<br>`POST /api/admin/doctor-requests/{userId}/reject` | `doctor/DoctorRequestController.java:29,36,42`<br>`doctor/DoctorRequestService.java`<br>`doctor/Doctor.java`<br>`doctor/dto/ApproveDoctorRequest.java`<br>`doctor/dto/DoctorRequestResponse.java`<br>`user/User.java` (`requestedRole`)<br>`pages/Admin/AdminDoctorRequests.tsx`<br>`pages/Admin/ApproveDoctorModal.tsx`<br>`api/adminApi.ts`, `schemas/adminSchemas.ts` | `doctor/DoctorRequestApiTest` (cả 10)<br>· `approvingTurnsTheRequestIntoADoctor`<br>· `rejectingMakesThemAnOrdinaryPatient`<br>· `anAccountThatIsNotActivatedCannotBeApproved`<br>· `aRequestCanOnlyBeDecidedOnce`<br>· `theDepartmentMustExistAndBeActive`<br>· `showsTheLongestWaitingFirstAndPages`<br>· `onlyAnAdminDecides` |
| **US-DR-02**<br>Tìm kiếm và quản lý hồ sơ bác sĩ | `GET /api/admin/doctors`<br>`GET /api/admin/doctors/stats`<br>`GET /api/admin/doctors/specialties`<br>`GET /api/admin/doctors/{id}`<br>`PUT /api/admin/doctors/{id}`<br>`PATCH /api/admin/doctors/{id}/availability`<br>`PATCH /api/admin/doctors/{id}/status` | `doctor/AdminDoctorController.java:32–70`<br>`doctor/AdminDoctorService.java`<br>`doctor/DoctorRepository.java`<br>`doctor/Availability.java`, `doctor/DoctorStatus.java`<br>`doctor/dto/UpdateDoctorRequest.java`<br>`doctor/dto/DoctorStatsResponse.java`<br>`pages/Admin/AdminDoctors.tsx`<br>`pages/Admin/DoctorEditModal.tsx`<br>`components/admin/DataTable.tsx`<br>`components/admin/Pagination.tsx`<br>`components/admin/StatTiles.tsx`<br>`schemas/adminSchemas.ts` | `doctor/AdminDoctorApiTest` (18)<br>· `filtersByEachCriterion`, `filtersByAccountStatus`<br>· `pagesThroughMoreRowsThanFitOnOnePage`, `keepsPagingParametersInRange`<br>· `rejectsAnUnknownFilterValue`, `refusesAnOverlongOrUnsafeProfile`<br>· `updatesTheProfileAndMovingDepartmentsEndsTheHeadship`<br>· `cannotMoveADoctorIntoAnInactiveDepartment`<br>· `deactivatingTakesTheDoctorRoleAwayAndActivatingGivesItBack`<br>· `theStatTilesFollowWhatTheAdminDoes`<br>`doctor/DoctorRepositoryTest` (9)<br>· `searchesByEachFilter`, `searchesWithEveryFilterAtOnce`, `countsForTheStatTiles` |
| **US-DR-03**<br>Xếp lịch trực theo tuần | `GET /api/admin/schedules`<br>`GET /api/admin/doctors/{doctorId}/schedules`<br>`POST /api/admin/doctors/{doctorId}/schedules`<br>`PUT /api/admin/schedules/{slotId}`<br>`DELETE /api/admin/schedules/{slotId}` | `doctor/AdminScheduleController.java:34–61`<br>`doctor/AdminScheduleService.java`<br>`doctor/DoctorSchedule.java`<br>`doctor/DoctorScheduleRepository.java`<br>`doctor/ShiftType.java`<br>`doctor/dto/ScheduleSlotRequest.java`<br>`doctor/dto/DoctorWeekResponse.java`<br>`pages/Admin/AdminSchedules.tsx`<br>`pages/Admin/ScheduleSlotModal.tsx` | `doctor/AdminScheduleApiTest` (13)<br>· `addsListsEditsAndDeletesShifts`<br>· `theEndMustComeAfterTheStart`<br>· `twoSlotsCannotStartAtTheSameTime`<br>· `workingShiftsAndLeaveDoNotOverlap`<br>· `aBreakMustSitInsideAWorkingShift`<br>· `changingAWorkingShiftCannotStrandItsBreak`<br>· `editingASlotIsNotAClashWithItself`<br>· `theBoardShowsActiveDoctorsWithTheirWeek`<br>· `anInactiveDoctorsWeekCanOnlyBeCleared`<br>`doctor/DoctorRepositoryTest.returnsTheWeekInCalendarOrder` |

## admin — Dũng

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AD-01** | | | |
| **US-AD-02** | | | |

## booking — Dũng

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-BK-01** | | | |
| **US-BK-02** | | | |
| **US-BK-03** | | | |

## RAG — Lộc

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AI-01** | | | |
| **US-AI-02** | | | |
| **US-AI-03** | | | |

---

## Cách tự kiểm tra bảng này

Trước buổi bảo vệ, mỗi người lấy một story mình **không** viết, mở các file trong
dòng đó ra, và xác nhận các tiêu chí chấp nhận thực sự nằm ở đấy. Hai phút một
story. Đây đúng là bài tập giảng viên sẽ chạy trong phần hỏi đáp cá nhân, nên
trượt ở đây thì rẻ, còn trượt ở đó thì không.

Chạy các test backend nêu trên:

```bash
cd backend && ./mvnw test
```
