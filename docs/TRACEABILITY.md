# Bảng truy vết

Mục 5.1 của đề: mỗi user story phải truy được về endpoint hoặc component hiện
thực nó, về các file source nó nằm trong đó, và về test giữ nó đứng yên. Mục đích
của bảng này là buổi bảo vệ — bất kỳ story nào cũng có thể bị chọn và phải mở
được code ngay tại chỗ.

Các story nằm ở [`USER_STORIES.md`](USER_STORIES.md). Bảng này cũng nhóm theo
**khối chức năng** chứ không theo người viết; ai đứng tên khối nào nằm ở
[`OWNERSHIP.md`](OWNERSHIP.md).

**Các tiền tố đường dẫn đã được lược bỏ** cho dễ đọc:

- backend: `backend/src/main/java/com/example/healthcare/backend/`
- test backend: `backend/src/test/java/com/example/healthcare/backend/`
- frontend: `frontend/src/`

**Số dòng tính đến ngày 2026-10-23.** Chúng sẽ dịch chuyển. Hãy coi đó là điểm
khởi đầu chứ không phải lời hứa — tên file và tên phương thức mới là thứ thực sự
định danh đoạn code.

---

## authen

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AU-01**<br>Đăng ký và kích hoạt | `POST /api/auth/register`<br>`POST /api/auth/verify-email`<br>`POST /api/auth/resend-verification` | `auth/AuthController.java:36,52,58`<br>`auth/AuthService.java`<br>`auth/verify/EmailVerificationService.java`<br>`auth/verify/EmailVerificationToken.java`<br>`auth/verify/EmailVerificationMailer.java`<br>`common/Emails.java`, `common/Tokens.java`<br>`pages/Register/Register.tsx`<br>`pages/VerifyEmail/VerifyEmail.tsx`<br>`components/ResendVerification.tsx`<br>`schemas/authSchemas.ts`, `api/authApi.ts` | `auth/AuthApiTest`<br>· `registerCreatesPatientWithNormalizedEmailAndNoPassword`<br>· `registerRejectsAnEmailThatIsAlreadyUsedInAnyLetterCase`<br>· `registerReportsEveryInvalidField`<br>· `signingUpAsADoctorOnlyStoresTheRequest`<br>· `adminAccountsCannotBeRequestedAtSignUp`<br>`auth/verify/EmailVerificationFlowTest` (cả 4) |
| **US-AU-02**<br>Đặt lại mật khẩu đã quên | `POST /api/auth/forgot-password`<br>`POST /api/auth/reset-password` | `auth/AuthController.java:64,70`<br>`auth/reset/PasswordResetService.java`<br>`auth/reset/PasswordResetToken.java`<br>`auth/reset/PasswordResetTokenRepository.java`<br>`auth/reset/PasswordResetMailer.java`<br>`pages/ForgotPassword/ForgotPassword.tsx`<br>`pages/ResetPassword/ResetPassword.tsx`<br>`schemas/authSchemas.ts` | `auth/reset/PasswordResetFlowTest`<br>· `resetLinkChangesPasswordAndWorksOnlyOnce`<br>· `unknownEmailGetsTheSameAnswerAndNoEmail`<br>· `newRequestInvalidatesTheOlderLink`<br>· `expiredLinkIsRejected`<br>· `invalidInputIsRejected` |
| **US-AU-03**<br>Đăng nhập, phân quyền theo vai trò | `POST /api/auth/login`<br>`POST /api/auth/google`<br>`GET /api/users/me` | `auth/AuthController.java:42,47`<br>`auth/jwt/JwtService.java`<br>`auth/jwt/JwtAuthenticationFilter.java`<br>`auth/google/GoogleAuthService.java`<br>`config/SecurityConfig.java`<br>`user/UserController.java:27`<br>`pages/Login/Login.tsx`<br>`components/GoogleSignInButton.tsx`<br>`context/AuthProvider.tsx`<br>`components/ProtectedRoute.tsx`, `components/RequireRole.tsx`<br>`api/client.ts` | `auth/AuthApiTest`<br>· `loginReturnsATokenThatOpensTheCurrentUserEndpoint`<br>· `loginGivesTheSameAnswerForWrongPasswordAndUnknownEmail`<br>· `rememberMeMakesTheTokenLastThirtyDaysInsteadOfOneHour`<br>· `googleSignInStaysOffUntilAClientIdIsConfigured`<br>· `protectedEndpointsRejectMissingOrInvalidTokens`<br>`auth/verify/EmailVerificationFlowTest.anAccountCannotLogInUntilTheLinkIsOpened`<br>`doctor/AdminDoctorApiTest.onlyAnAdminGetsIn` |

## doctor

| Story | Endpoint / component | File source | Test |
|---|---|---|---|

| **US-DR-01**<br>Quyết định ai thành bác sĩ | `GET /api/admin/doctor-requests`<br>`POST /api/admin/doctor-requests/{userId}/approve`<br>`POST /api/admin/doctor-requests/{userId}/reject` | `doctor/DoctorRequestController.java:29,36,42`<br>`doctor/DoctorRequestService.java`<br>`doctor/Doctor.java`<br>`doctor/dto/ApproveDoctorRequest.java`<br>`doctor/dto/DoctorRequestResponse.java`<br>`user/User.java` (`requestedRole`)<br>`pages/Admin/AdminDoctorRequests.tsx`<br>`pages/Admin/ApproveDoctorModal.tsx`<br>`api/adminApi.ts`, `schemas/adminSchemas.ts` | `doctor/DoctorRequestApiTest` (cả 10)<br>· `approvingTurnsTheRequestIntoADoctor`<br>· `rejectingMakesThemAnOrdinaryPatient`<br>· `anAccountThatIsNotActivatedCannotBeApproved`<br>· `aRequestCanOnlyBeDecidedOnce`<br>· `theDepartmentMustExistAndBeActive`<br>· `showsTheLongestWaitingFirstAndPages`<br>· `onlyAnAdminDecides` |
| **US-DR-02**<br>Tìm kiếm và quản lý hồ sơ bác sĩ | `GET /api/admin/doctors`<br>`GET /api/admin/doctors/stats`<br>`GET /api/admin/doctors/specialties`<br>`GET /api/admin/doctors/{id}`<br>`PUT /api/admin/doctors/{id}`<br>`PATCH /api/admin/doctors/{id}/availability`<br>`PATCH /api/admin/doctors/{id}/status` | `doctor/AdminDoctorController.java:32–70`<br>`doctor/AdminDoctorService.java`<br>`doctor/DoctorRepository.java`<br>`doctor/Availability.java`, `doctor/DoctorStatus.java`<br>`doctor/dto/UpdateDoctorRequest.java`<br>`doctor/dto/DoctorStatsResponse.java`<br>`pages/Admin/AdminDoctors.tsx`<br>`pages/Admin/DoctorEditModal.tsx`<br>`components/admin/DataTable.tsx`<br>`components/admin/Pagination.tsx`<br>`components/admin/StatTiles.tsx`<br>`schemas/adminSchemas.ts` | `doctor/AdminDoctorApiTest` (18)<br>· `filtersByEachCriterion`, `filtersByAccountStatus`<br>· `pagesThroughMoreRowsThanFitOnOnePage`, `keepsPagingParametersInRange`<br>· `rejectsAnUnknownFilterValue`, `refusesAnOverlongOrUnsafeProfile`<br>· `updatesTheProfileAndMovingDepartmentsEndsTheHeadship`<br>· `cannotMoveADoctorIntoAnInactiveDepartment`<br>· `deactivatingTakesTheDoctorRoleAwayAndActivatingGivesItBack`<br>· `theStatTilesFollowWhatTheAdminDoes`<br>`doctor/DoctorRepositoryTest` (9)<br>· `searchesByEachFilter`, `searchesWithEveryFilterAtOnce`, `countsForTheStatTiles` |
| **US-DR-03**<br>Xếp lịch trực theo tuần | `GET /api/admin/schedules`<br>`GET /api/admin/doctors/{doctorId}/schedules`<br>`POST /api/admin/doctors/{doctorId}/schedules`<br>`PUT /api/admin/schedules/{slotId}`<br>`DELETE /api/admin/schedules/{slotId}` | `doctor/AdminScheduleController.java:34–61`<br>`doctor/AdminScheduleService.java`<br>`doctor/DoctorSchedule.java`<br>`doctor/DoctorScheduleRepository.java`<br>`doctor/ShiftType.java`<br>`doctor/dto/ScheduleSlotRequest.java`<br>`doctor/dto/DoctorWeekResponse.java`<br>`pages/Admin/AdminSchedules.tsx`<br>`pages/Admin/ScheduleSlotModal.tsx` | `doctor/AdminScheduleApiTest` (13)<br>· `addsListsEditsAndDeletesShifts`<br>· `theEndMustComeAfterTheStart`<br>· `twoSlotsCannotStartAtTheSameTime`<br>· `workingShiftsAndLeaveDoNotOverlap`<br>· `aBreakMustSitInsideAWorkingShift`<br>· `changingAWorkingShiftCannotStrandItsBreak`<br>· `editingASlotIsNotAClashWithItself`<br>· `theBoardShowsActiveDoctorsWithTheirWeek`<br>· `anInactiveDoctorsWeekCanOnlyBeCleared`<br>`doctor/DoctorRepositoryTest.returnsTheWeekInCalendarOrder` |
| **US-DR-04**<br>Bác sĩ làm việc với lịch hẹn của mình | `GET /api/doctor/appointments`<br>`GET /api/doctor/appointments/{id}`<br>`GET /api/doctor/appointments/{id}/history`<br>`PATCH /api/doctor/appointments/{id}/status`<br>`PATCH /api/doctor/appointments/{id}/notes` | `booking/BookingController.java`<br>`booking/BookingService.java`<br>`booking/Appointment.java`, `booking/AppointmentHistory.java`<br>`booking/AppointmentStatus.java`<br>`config/SecurityConfig.java` (`/api/doctor/**` → `hasRole("DOCTOR")`)<br>`layouts/DoctorLayout.tsx`<br>`pages/Doctor/DoctorWorkspace.tsx`<br>`pages/Appointments/AppointmentDetails.tsx`<br>`components/RequireRole.tsx`<br>`api/bookingApi.ts` | `doctor/DoctorManagementIntegrationTest`<br>· `doctorEndpointsRejectAnonymous`<br>· `doctorEndpointsRejectPatientRole`<br>· `doctorMeRejectsAdminToken`<br>· `doctorCannotAccessAnotherDoctorsAppointments`<br>· `doctorWithZeroAppointments`<br>`booking/BookingFlowTest`<br>· `doctorAndAdminCanInspectOnlyAuthorizedAppointmentsAndFilterAndPaginate`<br>· `doctorCannotBeDeactivatedOrPutOnLeaveWithFutureBookings`<br>`frontend/tests/doctor.test.ts` (IDOR) |
| **US-DR-05**<br>Bác sĩ tự khai lịch nghỉ và sửa hồ sơ | `GET /api/doctor/me`<br>`PATCH /api/doctor/me/public-profile`<br>`GET /api/doctor/schedules`<br>`GET`/`POST` `/api/doctor/availability-exceptions`<br>`DELETE /api/doctor/availability-exceptions/{id}` | `doctor/DoctorSelfController.java:103,110,132`<br>`booking/BookingAvailabilityController.java`<br>`booking/AvailabilityException.java`<br>`booking/AvailabilityExceptionRepository.java`<br>`doctor/DoctorSchedule.java`<br>`pages/Doctor/DoctorProfile.tsx`<br>`pages/Doctor/DoctorSchedule.tsx` | `doctor/DoctorManagementIntegrationTest`<br>· `doctorMeResolvesCorrectIdentity`<br>· `updateDoctorPublicProfile`<br>· `getDoctorWeeklySchedules`<br>· `manageAvailabilityExceptions` |

## admin

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AD-01**<br>Quản lý danh mục khoa | `GET /api/admin/departments`<br>`GET /api/admin/departments/{id}`<br>`POST /api/admin/departments`<br>`PUT /api/admin/departments/{id}` | `department/AdminDepartmentController.java:31,36,41,48`<br>`department/AdminDepartmentService.java`<br>`department/Department.java` (`codeFor`)<br>`department/DepartmentRepository.java`<br>`department/DepartmentStatus.java`<br>`doctor/Doctor.java` (trưởng khoa)<br>`pages/Admin/AdminDepartments.tsx`<br>`pages/Admin/DepartmentFormModal.tsx`<br>`layouts/AdminLayout.tsx`<br>`api/adminApi.ts`, `schemas/adminSchemas.ts` | `department/AdminDepartmentApiTest` (cả 7)<br>· `createsADepartmentWithACodeFromItsId`<br>· `namesAreUniqueWhateverTheCase`<br>· `validatesTheForm`<br>· `listsDepartmentsWithTheirHeadAndActiveDoctors`<br>· `theHeadMustBeAnActiveDoctorOfThatDepartment`<br>· `retiringADepartmentIsAStatusChange`<br>· `onlyAnAdminGetsIn` |
| **US-AD-02**<br>Giám sát mức dùng và chi phí AI | `POST /api/ai/telemetry`<br>`GET /api/admin/ai-usage/google`<br>`GET /api/admin/ai-usage/statistics`<br>`GET`/`POST` `/api/admin/ai-usage/events` | `admin/ai/AiTelemetryController.java:29`<br>`admin/ai/AdminAiUsageController.java:27,40,53,63`<br>`admin/ai/AdminAiUsageService.java`<br>`admin/ai/GoogleAiUsageService.java`<br>`admin/ai/AiUsageEvent.java`<br>`admin/ai/AiUsageEventRepository.java`<br>`config/SecurityConfig.java:31` (`/api/ai/telemetry` → `permitAll`, chặn bằng secret riêng)<br>`rag/telemetry.py`<br>`pages/Admin/AdminAiUsage.tsx` | `admin/AiTelemetryApiTest` (cả 3)<br>· `rejectsInvalidSecret`<br>· `acceptsValidSecret`<br>· `idempotentOnDuplicateRequestId`<br>`admin/GoogleAiUsageApiTest`<br>· `googleEndpointRejectsAnonymous`<br>· `googleEndpointRejectsPatient`<br>· `googleEndpointAllowsAdmin`<br>· `unconfiguredEnvironmentReportsTransparently`<br>· `endpointReturnsDailyUsageStructure`<br>`admin/AdminFeaturesApiTest.aiTelemetryAndStats`<br>`rag/test_telemetry.py` (cả 6) |

## booking

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-BK-01**<br>Đặt lịch khám với bác sĩ | `GET /api/booking/departments`<br>`GET /api/booking/doctors`<br>`GET /api/booking/doctors/{id}`<br>`GET /api/booking/doctors/{id}/availability`<br>`POST /api/appointments` (header `Idempotency-Key`) | `booking/BookingController.java:30` (`create`)<br>`booking/BookingAvailabilityController.java:17,23,27`<br>`booking/BookingService.java` (`create`, `availability`, `lockDoctor`)<br>`booking/AvailabilityEngine.java`<br>`booking/BookingRequestKey.java`<br>`booking/BookingRequestKeyRepository.java`<br>`booking/Patient.java`, `booking/PatientRepository.java`<br>`booking/BookingClock.java` (lịch Việt Nam)<br>`booking/BookingDtos.java` (`CreateRequest`)<br>`department/BookingDepartmentController.java`<br>`pages/Booking/Booking.tsx`<br>`pages/Booking/BookingResult.tsx`<br>`api/bookingApi.ts`, `schemas/bookingSchemas.ts` | `booking/BookingFlowTest`<br>· `loginAvailabilityCreateRetrieveAndPersistAttendee`<br>· `idempotencyReplaysAndRejectsChangedPayloadEvenAfterCancellation`<br>· `validationRejectsMalformedMissingConsentFutureDobAndMissingKey`<br>· `unavailablePastMisalignedWindowAndInactiveDoctorAreRejected`<br>· `windowUsesVietnamDateAtUtcMidnightBoundaryAndOrdinalThursdayIsThree`<br>· `concurrentDifferentOwnersCannotDoubleBook`<br>· `concurrentSameKeyProducesOneAppointmentAndOnePatient`<br>· `failedBookingCreatesNeitherPatientNorRequestKey`<br>· `patientCannotBookOverlappingAppointmentWithAnotherDoctor`<br>`booking/AvailabilityEngineTest` (cả 6)<br>`booking/SqlServerBookingContractTest`<br>`frontend/tests/booking.test.ts` (8) |
| **US-BK-02**<br>Đổi, huỷ và theo dõi vòng đời ca khám | `GET /api/appointments`<br>`GET /api/appointments/{id}`<br>`GET /api/appointments/{id}/history`<br>`POST /api/appointments/{id}/cancel`<br>`POST /api/appointments/{id}/reschedule`<br>`PATCH /api/appointments/{id}/status`<br>`PATCH /api/appointments/{id}/notes` | `booking/BookingController.java:42,46,51,56,61,66`<br>`booking/BookingService.java` (`cancel`, `reschedule`, `transition`, `notes`, `own`, `mutable`)<br>`booking/Appointment.java`<br>`booking/AppointmentStatus.java` (`mutable()`)<br>`booking/AppointmentHistory.java`<br>`booking/AppointmentHistoryRepository.java`<br>`booking/BookingExceptionHandler.java`<br>`pages/Appointments/Appointments.tsx`<br>`pages/Appointments/AppointmentDetails.tsx`<br>`api/bookingApi.ts` | `booking/BookingFlowTest`<br>· `cancelledSlotCanBeRebookedAndHistoryIsPreserved`<br>· `rescheduleReleasesOldSlotAndRollsBackUnavailableDestination`<br>· `lifecycleAllowsStartCompleteNotesAndRejectsEarlyStartAndTerminalChanges`<br>· `noShowRequiresExpiredIntervalAndPastConfirmedCannotBeCancelled`<br>· `authenticationRoleOwnershipAndRevokedRoleAreEnforced`<br>· `legacyLongAppointmentPreventsPartialOverlapAndPendingCanBeConfirmed`<br>· `concurrentCancellationAndBookingLeaveAtMostOneLiveReservation`<br>· `concurrentRescheduleAndDestinationBookingCannotDoubleBook`<br>`frontend/tests/booking.test.ts` |

## RAG

| Story | Endpoint / component | File source | Test |
|---|---|---|---|
| **US-AI-01**<br>Hỏi đáp có trích nguồn | `POST /api/chat:123`<br>`POST /api/chat/stream:331`<br>`POST /api/chat/upload/stream:424`<br>`GET /api/chat/health:89` | `rag/server.py` (số dòng ở cột trái), `:84` gọi `rejection_for` trước khi chạm tới mô hình<br>`rag/guardrails.py` (`rejection_for`, `neutralize_document_instructions`)<br>`rag/prompts.py` + `rag/prompts/leaflet_system_v2.txt` — **quy tắc "không có trong tài liệu" nằm ở file prompt này**, không còn trong `config.py`<br>`rag/config.py:10,284,285` (`SYSTEM_PROMPT = LEAFLET_SYSTEM` — chỉ là tên gọi lại)<br>`rag/retrieve.py` (`retrieve`, `_check_embed_model`)<br>`rag/generate.py` (`build_context`, `answer_stream`)<br>`rag/ingest.py` (chunking, embed, Chroma)<br>`rag/llm.py` (`embed`, `chat`)<br>`rag/uploaded.py:65` (lọc câu ra lệnh trong file tải lên)<br>`components/AIChatWidget.tsx`<br>`services/chatApi.ts` | `rag/test_guardrails.py` (cả 10)<br>· `test_versioned_prompts_are_loaded`<br>· `test_prompt_injection_is_rejected`<br>· `test_unrelated_requests_are_rejected`<br>· `test_booking_request_is_redirected`<br>· `test_medical_questions_reach_the_model`<br>`rag/test_uploaded.py` (cả 5)<br>`rag/eval/eval_questions.yaml` — 85 câu truy hồi, nhóm `refusal`, `paraphrase`, `patient-voice`<br>`rag/eval/chatbot_cases.json` — 25 case chạy thật qua HTTP, nhóm `leaflet` 7, `boundary` 5, `upload` 3, `upload_boundary` 3<br>`rag/test_evaluate_chatbot.py` (cả 6)<br>`rag/eval/results/*.json`<br>Chạy lại: `python rag/evaluate.py`, và `python rag/evaluate_chatbot.py` (cần dịch vụ chạy thật + `RAG_EVAL_TOKEN`) |
| **US-AI-02**<br>Gợi ý khoa khám từ triệu chứng | `POST /api/chat/triage:208`<br>`POST /api/chat/triage/upload:316`<br>(3 tool đọc ngược về: `GET /api/booking/departments`, `/doctors`, `/doctors/{id}/availability`) | `rag/triage.py:29` (`ToolCall`), `:35` (`TriageDecision`), `:78,85,95` (ba tool), `:116` (`recommend`)<br>`rag/prompts/tool_call_v1.txt`, `tool_tasks_v1.txt`, `triage_v1.txt` — lời nhắc của agent, có đánh số phiên bản<br>`rag/prompts.py` (`TOOL_CALL`, `TOOL_TASKS`, `TRIAGE`)<br>`rag/guardrails.py` (`rejection_for` — chặn cả ở đường triage)<br>`rag/server.py` (số dòng ở cột trái)<br>`rag/errors.py`<br>`booking/BookingAvailabilityController.java` (nguồn dữ liệu của ba tool)<br>`config/SecurityConfig.java` (`/api/booking/**` cần token)<br>`components/AIChatWidget.tsx`<br>`services/chatApi.ts` | `rag/test_triage.py` (cả 7)<br>· `test_three_model_requested_tools_and_validated_result`<br>· `test_invalid_model_json_is_rejected`<br>· `test_rejects_invented_department_before_doctor_search`<br>· `test_rejects_invented_source_in_final_json`<br>· `test_rejects_doctor_outside_selected_department`<br>· `test_emergency_does_not_offer_a_doctor`<br>· `test_no_open_slots_does_not_offer_a_doctor`<br>`rag/eval/chatbot_cases.json` — nhóm `guidance` 5 case và `guidance_safety` 2 case (G06, G07 đòi `urgency = emergency` và **không** gợi ý bác sĩ)<br>`rag/test_evaluate_chatbot.py`<br>· `test_guidance_checks_live_department_and_tools`<br>· `test_boundary_checks_rejected_status_and_detail`<br>Chạy lại: `cd rag && python -m unittest test_triage` |

---

## Cách tự kiểm tra bảng này

Phần hỏi đáp cá nhân của đề hỏi mỗi người về **module của mình và một phần khác
do giảng viên chọn**. Vậy nên trước buổi bảo vệ, mỗi người làm đúng hai lượt:

1. Một story thuộc khối mình đứng tên trong [`OWNERSHIP.md`](OWNERSHIP.md) — mở
   từng file trong dòng đó ra và xác nhận các tiêu chí chấp nhận thực sự nằm ở
   đấy.
2. Một story thuộc khối của người khác — lượt này mới là lượt dễ trượt.

Hai phút một story. Đây đúng là bài tập giảng viên sẽ chạy, nên trượt ở đây thì
rẻ, còn trượt ở đó thì không.

Chạy các test backend nêu trên (PowerShell trên Windows dùng `.\mvnw.cmd test`):

```bash
cd backend && ./mvnw test
```

Chạy các test frontend (không có script `test` gộp, chạy từng bộ):

```bash
cd frontend && npm run test:booking && npm run test:doctor
```

Chạy các test của dịch vụ RAG — ba lớp này không nằm trong Maven:

```bash
cd rag && python -m unittest test_triage test_uploaded test_telemetry
```
