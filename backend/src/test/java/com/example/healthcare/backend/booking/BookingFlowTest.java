package com.example.healthcare.backend.booking;

import static com.example.healthcare.backend.booking.BookingDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import com.example.healthcare.backend.auth.*;
import com.example.healthcare.backend.auth.jwt.JwtService;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.doctor.*;
import com.example.healthcare.backend.doctor.dto.ScheduleSlotRequest;
import com.example.healthcare.backend.support.ApiTestSupport;
import com.example.healthcare.backend.user.*;
import com.example.healthcare.backend.user.Role;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

@Import(BookingFlowTest.TimeConfiguration.class)
public class BookingFlowTest extends ApiTestSupport {
    @TestConfiguration static class TimeConfiguration {
        @Bean @Primary MutableClock testBookingClock() { return new MutableClock(); }
    }
    static class MutableClock extends Clock {
        final AtomicReference<Instant> time = new AtomicReference<>();
        public ZoneId getZone() { return AvailabilityEngine.ZONE; }
        public Clock withZone(ZoneId zone) { return Clock.fixed(instant(), zone); }
        public Instant instant() { return time.get(); }
    }
    @Autowired BookingService service;
    @Autowired DoctorRepository doctors;
    @Autowired DoctorScheduleRepository schedules;
    @Autowired PatientRepository patients;
    @Autowired AppointmentRepository appointments;
    @Autowired BookingRequestKeyRepository keys;
    @Autowired AvailabilityExceptionRepository exceptions;
    @Autowired AppointmentHistoryRepository histories;
    @Autowired JwtService jwt;
    @Autowired MutableClock clock;
    @Autowired AdminScheduleService weekly;
    @Autowired AdminDoctorService adminDoctors;
    @Autowired PlatformTransactionManager transactions;
    private User patientUser, doctorUser, admin;
    private Doctor doctor;
    private LocalDate date;
    private String token;
    private User account(Role role) {
        User u = new User(); u.setFullName("Booking Test " + role); u.setEmail(uniqueEmail()); u.setPhone("0901234567");
        u.setPasswordHash(passwordEncoder.encode(PASSWORD)); u.setRole(role); u.setEmailVerified(true);
        return userRepository.saveAndFlush(u);
    }
    @BeforeEach void setup() {
        clock.time.set(Instant.parse("2026-10-21T01:00:00Z")); date = LocalDate.of(2026, 10, 22);
        patientUser = account(Role.PATIENT); doctorUser = account(Role.DOCTOR); admin = account(Role.ADMIN);
        token = jwt.generateToken(patientUser, false);
        doctor = new Doctor(); doctor.setUser(doctorUser); doctor.setDoctorCode("DR-" + Long.toString(doctorUser.getId(), 36));
        doctor = doctors.saveAndFlush(doctor);
        shift("08:00", "18:00", ShiftType.WORK); shift("12:00", "13:00", ShiftType.BREAK);
    }
    private DoctorSchedule shift(String start, String end, ShiftType type) {
        DoctorSchedule s = new DoctorSchedule(); s.setDoctor(doctor); s.setDayOfWeek(date.getDayOfWeek());
        s.setStartTime(LocalTime.parse(start)); s.setEndTime(LocalTime.parse(end)); s.setShiftType(type); return schedules.saveAndFlush(s);
    }
    private AuthenticatedUser principal(User u) { return new AuthenticatedUser(u.getId(), u.getEmail(), u.getRole()); }
    private CreateRequest request(String start) {
        return new CreateRequest(doctor.getId(), date, LocalTime.parse(start), "someone", "Nguyễn Test", "attendee@example.com",
            "0901234567", LocalDate.of(2000, 1, 2), "Consultation", true);
    }
    private String json(String start) {
        return """
            {"doctorId":%d,"date":"%s","startTime":"%s","bookingFor":"someone","patientName":"Nguyễn Test",
            "email":"attendee@example.com","phone":"0901234567","dob":"2000-01-02","reason":"Consultation","consent":true}
            """.formatted(doctor.getId(), date, start);
    }
    private String key() { return UUID.randomUUID().toString(); }
    private Confirmation book(String start) { return service.create(principal(patientUser), key(), request(start)); }
    private void assertStatus(int status, org.junit.jupiter.api.function.Executable action) {
        ApiException error = assertThrows(ApiException.class, action); assertEquals(status, error.getStatus().value());
    }
    @Test void loginAvailabilityCreateRetrieveAndPersistAttendee() throws Exception {
        String loginToken = tokenOf(login(patientUser.getEmail(), PASSWORD));
        get("/api/booking/doctors/" + doctor.getId() + "/availability?from=" + date + "&to=" + date, loginToken)
            .andExpect(status().isOk()).andExpect(jsonPath("$.timezone").value("Asia/Ho_Chi_Minh"))
            .andExpect(jsonPath("$.slots.length()").value(18));
        String body = mockMvc.perform(post("/api/appointments").header("Authorization", "Bearer " + loginToken)
            .header("Idempotency-Key", key()).contentType(MediaType.APPLICATION_JSON).content(json("09:00")))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("CONFIRMED"))
            .andExpect(jsonPath("$.patientName").value("Nguyễn Test"))
            .andExpect(jsonPath("$.paymentPolicy").value("NO_PAYMENT_COLLECTED")).andReturn().getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();
        assertTrue(patients.findByUserId(patientUser.getId()).isPresent());
        assertEquals("someone", appointments.findById(id).orElseThrow().getBookingFor());
        get("/api/appointments/" + id, loginToken).andExpect(status().isOk()).andExpect(jsonPath("$.dob").value("2000-01-02"))
            .andExpect(jsonPath("$.patientName").value("Nguyễn Test"));
        get("/api/appointments?view=UPCOMING", loginToken).andExpect(jsonPath("$.totalElements").value(1));
        get("/api/appointments/" + id + "/history", loginToken).andExpect(jsonPath("$.content[0].action").value("CREATED"));
    }
    @Test void cancelledSlotCanBeRebookedAndHistoryIsPreserved() {
        Confirmation first = book("09:00");
        service.cancel(principal(patientUser), first.id(), new CancelRequest("Cannot attend"));
        Confirmation second = book("09:00"); assertNotEquals(first.id(), second.id());
        assertEquals(AppointmentStatus.CANCELLED, service.details(principal(patientUser), first.id()).status());
        assertEquals(3, service.historyList(principal(patientUser), first.id(), 0, 100).totalElements());
    }
    @Test void rescheduleReleasesOldSlotAndRollsBackUnavailableDestination() {
        Confirmation a = book("09:00");
        assertStatus(409, () -> service.reschedule(principal(patientUser), a.id(), new RescheduleRequest(date, LocalTime.NOON)));
        assertEquals(LocalTime.of(9, 0), service.details(principal(patientUser), a.id()).startTime());
        service.reschedule(principal(patientUser), a.id(), new RescheduleRequest(date, LocalTime.of(10, 0)));
        assertNotNull(book("09:00"));
        assertStatus(409, () -> book("10:00"));
        assertEquals(3, service.historyList(principal(patientUser), a.id(), 0, 100).totalElements());
    }
    @Test void idempotencyReplaysAndRejectsChangedPayloadEvenAfterCancellation() {
        String k = key(); var first = service.create(principal(patientUser), k, request("09:00"));
        assertEquals(first.id(), service.create(principal(patientUser), k, request("09:00")).id());
        assertStatus(409, () -> service.create(principal(patientUser), k, request("09:30")));
        service.cancel(principal(patientUser), first.id(), new CancelRequest("Changed plans"));
        assertEquals(AppointmentStatus.CANCELLED, service.create(principal(patientUser), k, request("09:00")).status());
    }
    @Test void validationRejectsMalformedMissingConsentFutureDobAndMissingKey() throws Exception {
        for (String invalid : List.of(json("09:00").replace("true", "false"), json("09:00").replace("0901234567", "bad"),
                json("09:00").replace("attendee@example.com", "invalid"), json("09:00").replace("2000-01-02", "2099-01-01"),
                json("09:00").replace("Consultation", " "), json("09:00").replace("Nguyễn Test", " "))) {
            mockMvc.perform(post("/api/appointments").header("Authorization", "Bearer " + token)
                .header("Idempotency-Key", key()).contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest());
        }
        postJson("/api/appointments", json("09:00"), token).andExpect(status().isBadRequest());
        get("/api/appointments?status=UNKNOWN", token).andExpect(status().isBadRequest());
        postJson("/api/appointments", "{broken", token).andExpect(status().isBadRequest());
    }
    @Test void unavailablePastMisalignedWindowAndInactiveDoctorAreRejected() {
        assertStatus(409, () -> book("12:00")); assertStatus(400, () -> book("09:15"));
        date = LocalDate.of(2026, 10, 20); assertStatus(400, () -> book("09:00"));
        date = LocalDate.of(2026, 11, 20); assertStatus(400, () -> book("09:00"));
        date = LocalDate.of(2026, 10, 22); doctor.setStatus(DoctorStatus.INACTIVE); doctors.saveAndFlush(doctor);
        assertStatus(409, () -> book("09:00"));
        assertTrue(service.availability(principal(patientUser), doctor.getId(), date, date).slots().isEmpty());
    }
    @Test void windowUsesVietnamDateAtUtcMidnightBoundaryAndOrdinalThursdayIsThree() {
        assertEquals(3, date.getDayOfWeek().ordinal());
        clock.time.set(Instant.parse("2026-10-21T17:00:00Z"));
        assertStatus(400, () -> service.availability(principal(patientUser), doctor.getId(), date.minusDays(1), date));
        assertFalse(service.availability(principal(patientUser), doctor.getId(), date, date.plusDays(29)).slots().isEmpty());
        assertStatus(400, () -> service.availability(principal(patientUser), doctor.getId(), date, date.plusDays(30)));
    }
    @Test void authenticationRoleOwnershipAndRevokedRoleAreEnforced() throws Exception {
        var a = book("09:00"); User other = account(Role.PATIENT); User wrongDoctor = account(Role.DOCTOR);
        get("/api/appointments", null).andExpect(status().isUnauthorized());
        get("/api/appointments", "invalid.jwt").andExpect(status().isUnauthorized());
        get("/api/appointments/" + a.id(), jwt.generateToken(other, false)).andExpect(status().isNotFound());
        get("/api/doctor/appointments/" + a.id(), jwt.generateToken(wrongDoctor, false)).andExpect(status().isNotFound());
        get("/api/doctor/appointments", token).andExpect(status().isForbidden());
        get("/api/admin/appointments", token).andExpect(status().isForbidden());
        assertStatus(404, () -> service.reschedule(principal(other), a.id(), new RescheduleRequest(date, LocalTime.of(10, 0))));
        assertStatus(403, () -> service.transition(principal(patientUser), a.id(), new StatusRequest(AppointmentStatus.IN_PROGRESS, null)));
        String stale = jwt.generateToken(doctorUser, false); doctorUser.setRole(Role.PATIENT); userRepository.saveAndFlush(doctorUser);
        get("/api/doctor/appointments", stale).andExpect(status().isForbidden());
    }
    @Test void doctorAndAdminCanInspectOnlyAuthorizedAppointmentsAndFilterAndPaginate() throws Exception {
        var a = book("09:00"); book("10:00");
        String doctorToken = jwt.generateToken(doctorUser, false), adminToken = jwt.generateToken(admin, false);
        get("/api/doctor/appointments?from=" + date + "&to=" + date, doctorToken).andExpect(jsonPath("$.totalElements").value(2));
        get("/api/doctor/appointments/" + a.id(), doctorToken).andExpect(status().isOk());
        get("/api/admin/appointments?doctorId=" + doctor.getId() + "&search=Nguyễn&size=1&page=1", adminToken)
            .andExpect(status().isOk()).andExpect(jsonPath("$.content.length()").value(1)).andExpect(jsonPath("$.totalPages").value(2));
        get("/api/admin/appointments?patientId=" + a.patientId(), adminToken).andExpect(jsonPath("$.totalElements").value(2));
        get("/api/admin/appointments/statistics", adminToken).andExpect(status().isOk());
    }
    @Test void lifecycleAllowsStartCompleteNotesAndRejectsEarlyStartAndTerminalChanges() {
        var a = book("09:00");
        assertStatus(409, () -> service.transition(principal(doctorUser), a.id(), new StatusRequest(AppointmentStatus.IN_PROGRESS, null)));
        assertStatus(409, () -> service.transition(principal(doctorUser), a.id(), new StatusRequest(AppointmentStatus.COMPLETED, null)));
        clock.time.set(Instant.parse("2026-10-22T02:00:00Z"));
        assertEquals(AppointmentStatus.IN_PROGRESS, service.transition(principal(doctorUser), a.id(), new StatusRequest(AppointmentStatus.IN_PROGRESS, "Started")).status());
        assertStatus(409, () -> service.cancel(principal(patientUser), a.id(), new CancelRequest("Cancel")));
        assertEquals(AppointmentStatus.COMPLETED, service.transition(principal(doctorUser), a.id(), new StatusRequest(AppointmentStatus.COMPLETED, "Done")).status());
        assertEquals("Follow-up", service.notes(principal(doctorUser), a.id(), new NotesRequest("Follow-up")).notes());
        assertStatus(409, () -> service.transition(principal(admin), a.id(), new StatusRequest(AppointmentStatus.NO_SHOW, null)));
    }
    @Test void noShowRequiresExpiredIntervalAndPastConfirmedCannotBeCancelled() {
        var a = book("09:00");
        assertStatus(409, () -> service.transition(principal(doctorUser), a.id(), new StatusRequest(AppointmentStatus.NO_SHOW, null)));
        clock.time.set(Instant.parse("2026-10-22T03:00:00Z"));
        assertStatus(409, () -> service.cancel(principal(patientUser), a.id(), new CancelRequest("Cancel")));
        assertEquals(AppointmentStatus.NO_SHOW, service.transition(principal(admin), a.id(), new StatusRequest(AppointmentStatus.NO_SHOW, null)).status());
    }
    @Test void exceptionChangesRespectOwnershipBookingsAndRollback() {
        var a = book("09:00");
        assertStatus(409, () -> service.addException(principal(doctorUser), null,
            new ExceptionRequest(date, LocalTime.of(9, 0), LocalTime.of(10, 0), ShiftType.LEAVE)));
        assertEquals(0, service.exceptionList(principal(doctorUser), null, date, date).size());
        var e = service.addException(principal(doctorUser), null,
            new ExceptionRequest(date, LocalTime.of(10, 0), LocalTime.of(11, 0), ShiftType.BREAK));
        assertStatus(409, () -> book("10:00"));
        User other = account(Role.DOCTOR); assertStatus(404, () -> service.deleteException(principal(other), e.id()));
        service.deleteException(principal(doctorUser), e.id()); assertNotNull(book("10:00"));
        assertEquals(AppointmentStatus.CONFIRMED, service.details(principal(patientUser), a.id()).status());
    }
    @Test void extraWorkCanBeAddedAndCannotBeRemovedAfterBooking() {
        var e = service.addException(principal(doctorUser), null,
            new ExceptionRequest(date, LocalTime.of(19, 0), LocalTime.of(20, 0), ShiftType.WORK));
        book("19:00"); assertStatus(409, () -> service.deleteException(principal(doctorUser), e.id()));
        assertEquals(1, service.exceptionList(principal(doctorUser), null, date, date).size());
    }
    @Test void existingWeeklyServiceIsGuardedWithoutChangingItsSource() {
        book("09:00");
        var work = schedules.findByDoctorIdAndDayOfWeek(doctor.getId(), date.getDayOfWeek()).stream()
            .filter(s -> s.getShiftType() == ShiftType.WORK).findFirst().orElseThrow();
        assertStatus(409, () -> weekly.update(work.getId(), new ScheduleSlotRequest(date.getDayOfWeek(),
            LocalTime.of(10, 0), LocalTime.of(18, 0), ShiftType.WORK)));
        assertEquals(LocalTime.of(8, 0), schedules.findById(work.getId()).orElseThrow().getStartTime());
    }
    private List<Object> race(Callable<Object> first, Callable<Object> second) throws Exception {
        try (var pool = Executors.newFixedThreadPool(2)) {
            CountDownLatch ready = new CountDownLatch(2), go = new CountDownLatch(1);
            List<Future<Object>> futures = new ArrayList<>();
            for (var call : List.of(first, second)) futures.add(pool.submit(() -> {
                ready.countDown(); assertTrue(go.await(10, TimeUnit.SECONDS));
                try { return call.call(); } catch (ApiException ex) { return ex.getStatus().value(); }
            }));
            assertTrue(ready.await(10, TimeUnit.SECONDS)); go.countDown();
            List<Object> result = new ArrayList<>(); for (var f : futures) result.add(f.get(25, TimeUnit.SECONDS)); return result;
        }
    }
    @Test void concurrentDifferentOwnersCannotDoubleBook() throws Exception {
        User other = account(Role.PATIENT);
        var result = race(() -> service.create(principal(patientUser), key(), request("09:00")),
            () -> service.create(principal(other), key(), request("09:00")));
        assertEquals(1, result.stream().filter(Confirmation.class::isInstance).count()); assertTrue(result.contains(409));
        assertEquals(1, appointments.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), date, date).size());
    }
    @Test void concurrentSameKeyProducesOneAppointmentAndOnePatient() throws Exception {
        String k = key(); var result = race(() -> service.create(principal(patientUser), k, request("09:00")),
            () -> service.create(principal(patientUser), k, request("09:00")));
        assertTrue(result.stream().allMatch(Confirmation.class::isInstance));
        assertEquals(((Confirmation) result.get(0)).id(), ((Confirmation) result.get(1)).id());
        assertEquals(1, appointments.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), date, date).size());
    }
    @Test void concurrentCancellationAndBookingLeaveAtMostOneLiveReservation() throws Exception {
        var a = book("09:00"); User other = account(Role.PATIENT);
        race(() -> service.cancel(principal(patientUser), a.id(), new CancelRequest("Changed plans")),
            () -> service.create(principal(other), key(), request("09:00")));
        assertEquals(AppointmentStatus.CANCELLED, service.details(principal(patientUser), a.id()).status());
        assertTrue(appointments.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), date, date).stream()
            .filter(x -> x.getStatus().reservesSlot()).count() <= 1);
    }
    @Test void failedBookingCreatesNeitherPatientNorRequestKey() {
        String k = key();
        assertStatus(409, () -> service.create(principal(patientUser), k, request("12:00")));
        assertTrue(patients.findByUserId(patientUser.getId()).isEmpty());
        assertTrue(keys.findByUserIdAndRequestKey(patientUser.getId(), k).isEmpty());
        assertTrue(appointments.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), date, date).isEmpty());
    }
    @Test void doctorCannotBeDeactivatedOrPutOnLeaveWithFutureBookings() {
        book("09:00");
        assertStatus(409, () -> adminDoctors.updateStatus(doctor.getId(), DoctorStatus.INACTIVE));
        assertStatus(409, () -> adminDoctors.updateAvailability(doctor.getId(), Availability.ON_LEAVE));
        assertEquals(DoctorStatus.ACTIVE, doctors.findById(doctor.getId()).orElseThrow().getStatus());
    }
    @Test void concurrentRescheduleAndDestinationBookingCannotDoubleBook() throws Exception {
        var a = book("09:00"); User other = account(Role.PATIENT);
        var outcomes = race(() -> service.reschedule(principal(patientUser), a.id(), new RescheduleRequest(date, LocalTime.of(10, 0))),
            () -> service.create(principal(other), key(), request("10:00")));
        assertEquals(1, outcomes.stream().filter(Confirmation.class::isInstance).count()); assertTrue(outcomes.contains(409));
        assertEquals(1, appointments.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), date, date).stream()
            .filter(a2 -> a2.getStartTime().equals(LocalTime.of(10, 0)) && a2.getStatus().reservesSlot()).count());
    }
    @Test void concurrentScheduleChangeAndBookingRemainConsistent() throws Exception {
        var work = schedules.findByDoctorIdAndDayOfWeek(doctor.getId(), date.getDayOfWeek()).stream()
            .filter(s -> s.getShiftType() == ShiftType.WORK).findFirst().orElseThrow();
        var outcomes = race(() -> weekly.update(work.getId(), new ScheduleSlotRequest(date.getDayOfWeek(),
                LocalTime.of(10, 0), LocalTime.of(18, 0), ShiftType.WORK)),
            () -> service.create(principal(patientUser), key(), request("09:00")));
        assertTrue(outcomes.contains(409));
        boolean booked = outcomes.stream().anyMatch(Confirmation.class::isInstance);
        assertEquals(booked ? LocalTime.of(8, 0) : LocalTime.of(10, 0), schedules.findById(work.getId()).orElseThrow().getStartTime());
    }
    @Test void legacyLongAppointmentPreventsPartialOverlapAndPendingCanBeConfirmed() {
        var a = book("09:00");
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            Appointment legacy = appointments.findById(a.id()).orElseThrow(); legacy.setEndTime(LocalTime.of(10, 0));
            legacy.setStatus(AppointmentStatus.PENDING); appointments.flush();
        });
        assertStatus(409, () -> book("09:30"));
        assertEquals(AppointmentStatus.CONFIRMED, service.transition(principal(admin), a.id(), new StatusRequest(AppointmentStatus.CONFIRMED, null)).status());
    }
    @Test void myselfAndInactivePatientsAndAllDoctorAvailabilityFlagsAreHandled() {
        CreateRequest r = request("09:00");
        var ownRequest = new CreateRequest(r.doctorId(), r.date(), r.startTime(), "myself", r.patientName(), r.email(), r.phone(), r.dob(), r.reason(), r.consent());
        assertEquals("myself", service.create(principal(patientUser), key(), ownRequest).bookingFor());
        Patient p = patients.findByUserId(patientUser.getId()).orElseThrow(); p.setStatus("INACTIVE"); patients.saveAndFlush(p);
        assertStatus(403, () -> book("10:00"));
        for (Availability flag : List.of(Availability.ON_LEAVE, Availability.OFF_DUTY)) {
            doctor.setAvailability(flag); doctors.saveAndFlush(doctor);
            assertTrue(service.availability(principal(patientUser), doctor.getId(), date, date).slots().isEmpty());
        }
        doctor.setAvailability(Availability.IN_CONSULTATION); doctors.saveAndFlush(doctor);
        assertFalse(service.availability(principal(patientUser), doctor.getId(), date, date).slots().isEmpty());
    }
    @Test void patientCannotBookOverlappingAppointmentWithAnotherDoctor() {
        book("09:00"); Doctor original = doctor;
        doctorUser = account(Role.DOCTOR); doctor = new Doctor(); doctor.setUser(doctorUser);
        doctor.setDoctorCode("DR-" + Long.toString(doctorUser.getId(), 36)); doctor = doctors.saveAndFlush(doctor);
        shift("08:00", "18:00", ShiftType.WORK);
        assertStatus(409, () -> book("09:00")); assertNotNull(book("09:30")); doctor = original;
    }
}
