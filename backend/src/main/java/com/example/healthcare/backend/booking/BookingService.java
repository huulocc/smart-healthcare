package com.example.healthcare.backend.booking;

import static com.example.healthcare.backend.booking.BookingDtos.*;
import static com.example.healthcare.backend.booking.AvailabilityEngine.ZONE;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;
import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.common.*;
import com.example.healthcare.backend.doctor.*;
import com.example.healthcare.backend.user.*;
import jakarta.persistence.*;
import jakarta.persistence.criteria.Predicate;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class BookingService {
    private final AppointmentRepository appointments;
    private final PatientRepository patients;
    private final AppointmentHistoryRepository histories;
    private final BookingRequestKeyRepository keys;
    private final AvailabilityExceptionRepository exceptions;
    private final DoctorRepository doctors;
    private final DoctorScheduleRepository schedules;
    private final UserRepository users;
    private final EntityManager em;
    private final Clock bookingClock;
    private final Validator validator;

    private LocalDate today() { return LocalDate.ofInstant(bookingClock.instant(), ZONE); }
    private LocalDateTime now() { return LocalDateTime.ofInstant(bookingClock.instant(), ZONE); }
    private static ApiException error(HttpStatus status, String message) { return new ApiException(status, message); }
    private static ApiException conflict(String message) { return error(HttpStatus.CONFLICT, message); }
    private User actor(AuthenticatedUser principal, Role... allowed) {
        if (principal == null) throw error(HttpStatus.UNAUTHORIZED, "Please log in");
        User user = users.findById(principal.id()).orElseThrow(() -> error(HttpStatus.UNAUTHORIZED, "Account unavailable"));
        if (!user.isEmailVerified()) throw error(HttpStatus.FORBIDDEN, "Account is not activated");
        // Check current database role as well as the signed token; revoked roles cannot retain access.
        if (principal.role() != user.getRole() || Arrays.stream(allowed).noneMatch(r -> r == user.getRole()))
            throw error(HttpStatus.FORBIDDEN, "This operation is not allowed for your account");
        return user;
    }
    private void validate(Object request) {
        if (request == null || !validator.validate(request).isEmpty())
            throw error(HttpStatus.BAD_REQUEST, "Invalid booking details");
    }
    private Doctor doctor(Long id) {
        return doctors.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Doctor not found"));
    }
    private Doctor lockDoctor(Long id) {
        Doctor result = doctor(id);
        em.refresh(result, LockModeType.PESSIMISTIC_WRITE, Map.of("jakarta.persistence.lock.timeout", 10000));
        return result;
    }
    private User lockOwner(Long id) {
        User owner = users.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Booking owner unavailable"));
        em.refresh(owner, LockModeType.PESSIMISTIC_WRITE, Map.of("jakarta.persistence.lock.timeout", 10000));
        return owner;
    }
    private boolean bookable(Doctor d) {
        return d.getStatus() == DoctorStatus.ACTIVE && d.getUser().getRole() == Role.DOCTOR
            && d.getAvailability() != Availability.ON_LEAVE && d.getAvailability() != Availability.OFF_DUTY;
    }
    private void range(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isBefore(today()) || to.isBefore(from) || to.isAfter(today().plusDays(29)))
            throw error(HttpStatus.BAD_REQUEST, "Choose dates within today and the next 29 days (30 calendar days)");
    }
    public static DoctorInfo doctorInfo(Doctor d) {
        return new DoctorInfo(d.getId(), d.getDoctorCode(), d.getUser().getFullName(), d.getSpecialty(),
            d.getExperienceYears(), d.getAvatarUrl(), d.getDepartment() == null ? null : d.getDepartment().getId(),
            d.getDepartment() == null ? null : d.getDepartment().getName(), d.getStatus().name(), d.getAvailability().name());
    }
    @Transactional(readOnly = true)
    public PageResponse<DoctorInfo> doctorList(AuthenticatedUser principal, Long departmentId, String search, int page, int size) {
        actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN);
        return PageResponse.from(doctors.search(departmentId, null, null, DoctorStatus.ACTIVE,
            Strings.trimToNull(search), PageResponse.request(page, size, Sort.by("user.fullName", "id"))), BookingService::doctorInfo);
    }
    @Transactional(readOnly = true)
    public DoctorInfo doctorDetails(AuthenticatedUser principal, Long id) {
        actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN);
        return doctorInfo(doctor(id));
    }
    private List<AvailabilityEngine.Interval> intervals(Long doctorId, LocalDate date,
            List<DoctorSchedule> week, List<AvailabilityException> overrides) {
        List<AvailabilityEngine.Interval> result = new ArrayList<>();
        week.stream().filter(s -> s.getDayOfWeek() == date.getDayOfWeek()).forEach(s ->
            result.add(new AvailabilityEngine.Interval(s.getStartTime(), s.getEndTime(), s.getShiftType())));
        overrides.stream().filter(s -> s.getExceptionDate().equals(date)).forEach(s ->
            result.add(new AvailabilityEngine.Interval(s.getStartTime(), s.getEndTime(), s.getShiftType())));
        return result;
    }
    private List<Slot> available(Doctor d, LocalDate from, LocalDate to, Long exclude) {
        if (!bookable(d)) return List.of();
        List<DoctorSchedule> week = schedules.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(d.getId());
        List<AvailabilityException> overrides = exceptions.findByDoctorIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(d.getId(), from, to);
        Map<LocalDate, List<Appointment>> busy = appointments.findByDoctorIdAndAppointmentDateBetween(d.getId(), from, to)
            .stream().collect(Collectors.groupingBy(Appointment::getAppointmentDate));
        List<Slot> result = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1))
            result.addAll(AvailabilityEngine.slots(date, intervals(d.getId(), date, week, overrides),
                busy.getOrDefault(date, List.of()), exclude, bookingClock));
        return result;
    }
    @Transactional(readOnly = true)
    public AvailabilityResponse availability(AuthenticatedUser principal, Long id, LocalDate from, LocalDate to) {
        actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN);
        from = from == null ? today() : from;
        to = to == null ? today().plusDays(29) : to;
        range(from, to);
        Doctor d = doctor(id);
        return new AvailabilityResponse(doctorInfo(d), ZONE.getId(), from, to, available(d, from, to, null));
    }
    private void requireSlot(Doctor d, LocalDate date, LocalTime start, Long exclude) {
        range(date, date);
        if (start == null || start.getSecond() != 0 || start.getNano() != 0 || start.getMinute() % 30 != 0)
            throw error(HttpStatus.BAD_REQUEST, "Start time must be on a 30-minute boundary");
        if (available(d, date, date, exclude).stream().noneMatch(s -> s.startTime().equals(start)))
            throw conflict("This slot is unavailable. Choose another time");
    }
    private void patientConflict(Patient patient, LocalDate date, LocalTime start, Long exclude) {
        if (appointments.findByPatientIdAndAppointmentDate(patient.getId(), date).stream()
                .anyMatch(a -> !Objects.equals(a.getId(), exclude) && a.getStatus().reservesSlot()
                    && AvailabilityEngine.overlaps(start, start.plusMinutes(30), a.getStartTime(), a.getEndTime())))
            throw conflict("Your account already has an appointment during this time");
    }
    private static String hash(CreateRequest r) {
        // Length-prefix every field so separator characters in names/reasons cannot collide.
        StringBuilder canonical = new StringBuilder();
        for (Object part : List.of(r.doctorId(), r.date(), r.startTime(), r.bookingFor(), r.patientName().trim(),
                r.email().trim().toLowerCase(Locale.ROOT), r.phone(), r.dob(), r.reason().trim(), r.consent())) {
            String s = part.toString(); canonical.append(s.length()).append(':').append(s);
        }
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.toString().getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    @Transactional
    public Confirmation create(AuthenticatedUser principal, String key, CreateRequest r) {
        User user = actor(principal, Role.PATIENT); validate(r);
        if (key == null || !key.matches("[A-Za-z0-9_-]{8,80}"))
            throw error(HttpStatus.BAD_REQUEST, "Idempotency-Key must contain 8-80 letters, digits, underscores or hyphens");
        if (r.patientName().trim().length() < 2 || r.reason().trim().isEmpty() || r.dob().isAfter(today())
                || r.dob().isBefore(today().minusYears(130)))
            throw error(HttpStatus.BAD_REQUEST, "Invalid patient name, reason or date of birth");
        // Global order for every appointment mutation: doctor -> booking owner's user -> appointment.
        Doctor d = lockDoctor(r.doctorId()); user = lockOwner(user.getId());
        String requestHash = hash(r);
        Optional<BookingRequestKey> previous = keys.findByUserIdAndRequestKey(user.getId(), key);
        if (previous.isPresent()) {
            if (!previous.get().getRequestHash().equals(requestHash)) throw conflict("Idempotency-Key was used with different details");
            return confirmation(find(previous.get().getAppointmentId()));
        }
        Patient patient = patients.findByUserId(user.getId()).orElse(null);
        if (patient == null) {
            patient = new Patient(); patient.setUser(user);
            patient.setPatientCode("PT-" + Long.toUnsignedString(user.getId(), 36).toUpperCase(Locale.ROOT));
            patient = patients.saveAndFlush(patient);
        }
        if (!"ACTIVE".equals(patient.getStatus())) throw error(HttpStatus.FORBIDDEN, "Patient record is inactive");
        requireSlot(d, r.date(), r.startTime(), null); patientConflict(patient, r.date(), r.startTime(), null);
        Appointment a = new Appointment(); a.setAppointmentCode("AP-" + UUID.randomUUID().toString().replace("-", "").substring(0, 17));
        a.setPatient(patient); a.setDoctor(d); a.setAppointmentDate(r.date()); a.setStartTime(r.startTime());
        a.setEndTime(r.startTime().plusMinutes(30)); a.setStatus(AppointmentStatus.CONFIRMED);
        a.setBookingFor(r.bookingFor()); a.setAttendeeName(r.patientName().trim());
        a.setAttendeeEmail(r.email().trim().toLowerCase(Locale.ROOT)); a.setAttendeePhone(r.phone());
        a.setAttendeeDob(r.dob()); a.setReason(r.reason().trim()); a.setConsentAt(bookingClock.instant());
        a = appointments.saveAndFlush(a); history(a, user.getId(), "CREATED");
        BookingRequestKey record = new BookingRequestKey(); record.setUserId(user.getId()); record.setRequestKey(key);
        record.setRequestHash(requestHash); record.setAppointmentId(a.getId()); keys.saveAndFlush(record);
        return confirmation(a);
    }
    private Appointment find(Long id) {
        return appointments.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Appointment not found"));
    }
    private void own(User user, Appointment a) {
        boolean permitted = user.getRole() == Role.ADMIN
            || (user.getRole() == Role.PATIENT && a.getPatient().getUser().getId().equals(user.getId()))
            || (user.getRole() == Role.DOCTOR && a.getDoctor().getUser().getId().equals(user.getId()));
        // Deliberately indistinguishable from an absent resource.
        if (!permitted) throw error(HttpStatus.NOT_FOUND, "Appointment not found");
    }
    private Appointment mutable(User user, Long id) {
        Appointment a = find(id); own(user, a);
        lockDoctor(a.getDoctor().getId()); lockOwner(a.getPatient().getUser().getId());
        em.refresh(a, LockModeType.PESSIMISTIC_WRITE, Map.of("jakarta.persistence.lock.timeout", 10000));
        own(user, a); return a;
    }
    @Transactional(readOnly = true)
    public Confirmation details(AuthenticatedUser principal, Long id) {
        User user = actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN);
        Appointment a = find(id); own(user, a); return confirmation(a);
    }
    @Transactional(readOnly = true)
    public PageResponse<History> historyList(AuthenticatedUser principal, Long id, int page, int size) {
        User user = actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN); own(user, find(id));
        return PageResponse.from(histories.findByAppointmentId(id, PageResponse.request(page, size, Sort.by("id"))), h ->
            new History(h.getId(), h.getActorUserId(), h.getAction(), h.getAppointmentDate(), h.getStartTime(),
                h.getEndTime(), h.getStatus(), h.getNotes(), h.getCancellationReason(), h.getOccurredAt()));
    }
    @Transactional(readOnly = true)
    public PageResponse<Confirmation> list(AuthenticatedUser principal, AppointmentStatus status, LocalDate from,
            LocalDate to, View view, Long patientId, Long doctorId, Long departmentId, String search, int page, int size) {
        User user = actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN);
        if (from != null && to != null && to.isBefore(from)) throw error(HttpStatus.BAD_REQUEST, "Invalid date range");
        if (search != null && search.length() > 100) throw error(HttpStatus.BAD_REQUEST, "Search is too long");
        LocalDateTime current = now();
        Specification<Appointment> spec = (root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (user.getRole() == Role.PATIENT) filters.add(cb.equal(root.get("patient").get("user").get("id"), user.getId()));
            if (user.getRole() == Role.DOCTOR) filters.add(cb.equal(root.get("doctor").get("user").get("id"), user.getId()));
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            if (from != null) filters.add(cb.greaterThanOrEqualTo(root.get("appointmentDate"), from));
            if (to != null) filters.add(cb.lessThanOrEqualTo(root.get("appointmentDate"), to));
            if (patientId != null) filters.add(cb.equal(root.get("patient").get("id"), patientId));
            if (doctorId != null) filters.add(cb.equal(root.get("doctor").get("id"), doctorId));
            if (departmentId != null) filters.add(cb.equal(root.get("doctor").get("department").get("id"), departmentId));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase(Locale.ROOT).replace("!", "!!").replace("%", "!%")
                    .replace("_", "!_").replace("[", "![") + "%";
                filters.add(cb.or(cb.like(cb.lower(root.get("appointmentCode")), pattern, '!'),
                    cb.like(cb.lower(root.get("attendeeName")), pattern, '!'),
                    cb.like(cb.lower(root.get("patient").get("user").get("fullName")), pattern, '!')));
            }
            Predicate future = cb.or(cb.greaterThan(root.get("appointmentDate"), current.toLocalDate()),
                cb.and(cb.equal(root.get("appointmentDate"), current.toLocalDate()),
                    // A typed TIME literal avoids the SQL Server JDBC driver's legacy
                    // sendTimeAsDatetime binding default (TIME > DATETIME is illegal).
                    cb.greaterThan(root.<LocalTime>get("startTime"), cb.literal(current.toLocalTime()))));
            Predicate upcoming = cb.and(root.get("status").in(AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED), future);
            upcoming = cb.or(upcoming, cb.equal(root.get("status"), AppointmentStatus.IN_PROGRESS));
            if (view == View.UPCOMING) filters.add(upcoming);
            if (view == View.HISTORY) filters.add(cb.not(upcoming));
            return cb.and(filters.toArray(Predicate[]::new));
        };
        return PageResponse.from(appointments.findAll(spec, PageResponse.request(page, size,
            Sort.by("appointmentDate", "startTime", "id"))), this::confirmation);
    }
    @Transactional
    public Confirmation cancel(AuthenticatedUser principal, Long id, CancelRequest request) {
        User user = actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN); validate(request);
        Appointment a = mutable(user, id);
        if (!(a.getStatus() == AppointmentStatus.PENDING || a.getStatus() == AppointmentStatus.CONFIRMED)
                || !a.getAppointmentDate().atTime(a.getStartTime()).isAfter(now()))
            throw conflict("Only future pending or confirmed appointments can be cancelled");
        history(a, user.getId(), "BEFORE_CANCEL"); a.setStatus(AppointmentStatus.CANCELLED);
        a.setCancellationReason(request.reason().trim()); return changed(a, user.getId(), "CANCELLED");
    }
    @Transactional
    public Confirmation reschedule(AuthenticatedUser principal, Long id, RescheduleRequest request) {
        User user = actor(principal, Role.PATIENT, Role.DOCTOR, Role.ADMIN); validate(request);
        Appointment a = mutable(user, id);
        if (a.getStatus() != AppointmentStatus.CONFIRMED || !a.getAppointmentDate().atTime(a.getStartTime()).isAfter(now()))
            throw conflict("Only future confirmed appointments can be rescheduled");
        requireSlot(a.getDoctor(), request.date(), request.startTime(), a.getId());
        patientConflict(a.getPatient(), request.date(), request.startTime(), a.getId());
        if (a.getAppointmentDate().equals(request.date()) && a.getStartTime().equals(request.startTime())) return confirmation(a);
        history(a, user.getId(), "BEFORE_RESCHEDULE"); a.setAppointmentDate(request.date());
        a.setStartTime(request.startTime()); a.setEndTime(request.startTime().plusMinutes(30));
        // Legacy schedule_id may point at a weekly row. It is not an occupancy/reservation key.
        a.setScheduleId(null);
        return changed(a, user.getId(), "RESCHEDULED");
    }
    @Transactional
    public Confirmation transition(AuthenticatedUser principal, Long id, StatusRequest request) {
        User user = actor(principal, Role.DOCTOR, Role.ADMIN); validate(request);
        if (request.status() == AppointmentStatus.CANCELLED)
            throw error(HttpStatus.BAD_REQUEST, "Use the cancellation endpoint and provide a reason");
        Appointment a = mutable(user, id);
        if (!a.getStatus().canTransitionTo(request.status())) throw conflict("Illegal appointment status transition");
        LocalDateTime start = a.getAppointmentDate().atTime(a.getStartTime());
        LocalDateTime end = a.getAppointmentDate().atTime(a.getEndTime());
        if (request.status() == AppointmentStatus.IN_PROGRESS && (now().isBefore(start) || !now().isBefore(end)))
            throw conflict("Consultations can start only during the scheduled interval");
        if (request.status() == AppointmentStatus.NO_SHOW && now().isBefore(end))
            throw conflict("No-show can be recorded only after the scheduled interval");
        history(a, user.getId(), "BEFORE_STATUS"); a.setStatus(request.status());
        if (request.notes() != null) a.setNotes(request.notes().trim());
        return changed(a, user.getId(), request.status().name());
    }
    @Transactional
    public Confirmation notes(AuthenticatedUser principal, Long id, NotesRequest request) {
        User user = actor(principal, Role.DOCTOR, Role.ADMIN); validate(request); Appointment a = mutable(user, id);
        if (a.getStatus() != AppointmentStatus.IN_PROGRESS && a.getStatus() != AppointmentStatus.COMPLETED)
            throw conflict("Consultation notes require an in-progress or completed appointment");
        history(a, user.getId(), "BEFORE_NOTES"); a.setNotes(request.notes().trim()); return changed(a, user.getId(), "NOTES_UPDATED");
    }
    @Transactional(readOnly = true)
    public Map<AppointmentStatus, Long> statistics(AuthenticatedUser principal) {
        actor(principal, Role.ADMIN); Map<AppointmentStatus, Long> result = new EnumMap<>(AppointmentStatus.class);
        for (AppointmentStatus status : AppointmentStatus.values()) result.put(status, 0L);
        appointments.statusCounts().forEach(row -> result.put((AppointmentStatus) row[0], (Long) row[1])); return result;
    }
    private Doctor assigned(User user, Long doctorId) {
        Doctor d = doctorId == null ? doctors.findByUserId(user.getId())
            .orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Doctor profile not found")) : doctor(doctorId);
        if (user.getRole() != Role.ADMIN && !d.getUser().getId().equals(user.getId()))
            throw error(HttpStatus.NOT_FOUND, "Doctor profile not found");
        return d;
    }
    @Transactional(readOnly = true)
    public List<ExceptionResponse> exceptionList(AuthenticatedUser principal, Long doctorId, LocalDate from, LocalDate to) {
        User user = actor(principal, Role.DOCTOR, Role.ADMIN); Doctor d = assigned(user, doctorId);
        from = from == null ? today() : from; to = to == null ? today().plusDays(29) : to; range(from, to);
        return exceptions.findByDoctorIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(d.getId(), from, to)
            .stream().map(BookingService::exceptionResponse).toList();
    }
    @Transactional
    public ExceptionResponse addException(AuthenticatedUser principal, Long doctorId, ExceptionRequest r) {
        User user = actor(principal, Role.DOCTOR, Role.ADMIN); validate(r);
        Doctor d = lockDoctor(assigned(user, doctorId).getId()); range(r.date(), r.date());
        if (!r.endTime().isAfter(r.startTime()) || !r.date().atTime(r.startTime()).isAfter(now()))
            throw error(HttpStatus.BAD_REQUEST, "Exception must be a future interval within one day");
        AvailabilityException e = new AvailabilityException(); e.setDoctorId(d.getId()); e.setExceptionDate(r.date());
        e.setStartTime(r.startTime()); e.setEndTime(r.endTime()); e.setShiftType(r.shiftType());
        e.setActorUserId(user.getId()); e.setCreatedAt(bookingClock.instant()); exceptions.saveAndFlush(e);
        validateSchedule(d.getId()); return exceptionResponse(e);
    }
    @Transactional
    public void deleteException(AuthenticatedUser principal, Long id) {
        User user = actor(principal, Role.DOCTOR, Role.ADMIN);
        AvailabilityException e = exceptions.findById(id).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Exception not found"));
        assigned(user, e.getDoctorId()); lockDoctor(e.getDoctorId());
        em.refresh(e, LockModeType.PESSIMISTIC_WRITE);
        exceptions.delete(e); exceptions.flush(); validateSchedule(e.getDoctorId());
    }
    /** Used by the additive adapter around the existing weekly schedule service. */
    @Transactional
    public void lockSchedule(Long doctorId) { lockDoctor(doctorId); }
    @Transactional
    public void refreshSchedule(Long slotId) {
        DoctorSchedule slot = schedules.findById(slotId).orElseThrow(() -> error(HttpStatus.NOT_FOUND, "Schedule slot not found"));
        // The adapter resolves doctor_id before waiting for its lock. Discard that
        // pre-lock snapshot before an existing service evaluates the old weekday.
        try { em.refresh(slot); }
        catch (EntityNotFoundException ex) { throw error(HttpStatus.NOT_FOUND, "Schedule slot not found"); }
    }
    @Transactional
    public void validateSchedule(Long doctorId) {
        em.flush();
        List<Appointment> future = appointments.findByDoctorIdAndAppointmentDateGreaterThanEqual(doctorId, today());
        LocalDate lastDate = future.stream().map(Appointment::getAppointmentDate).max(LocalDate::compareTo).orElse(today());
        List<DoctorSchedule> week = schedules.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctorId);
        List<AvailabilityException> overrides = exceptions.findByDoctorIdAndExceptionDateBetweenOrderByExceptionDateAscStartTimeAsc(
            doctorId, today(), lastDate);
        for (Appointment a : future) {
            if (a.getStatus().mutable() && a.getAppointmentDate().atTime(a.getEndTime()).isAfter(now())
                    && !AvailabilityEngine.covered(a.getStartTime(), a.getEndTime(), intervals(doctorId, a.getAppointmentDate(), week, overrides)))
                throw conflict("Schedule change conflicts with an existing appointment. Cancel or reschedule it first");
        }
    }
    @Transactional
    public void validateDoctorState(Long doctorId) {
        em.flush();
        if (!bookable(doctor(doctorId)) && appointments.findByDoctorIdAndAppointmentDateGreaterThanEqual(doctorId, today()).stream()
                .anyMatch(a -> a.getStatus().mutable() && a.getAppointmentDate().atTime(a.getEndTime()).isAfter(now())))
            throw conflict("Doctor has scheduled appointments. Cancel or reschedule them before making the doctor unavailable");
    }
    private static ExceptionResponse exceptionResponse(AvailabilityException e) {
        return new ExceptionResponse(e.getId(), e.getDoctorId(), e.getExceptionDate(), e.getStartTime(), e.getEndTime(),
            e.getShiftType(), e.getCreatedAt());
    }
    private Confirmation changed(Appointment a, Long actorId, String action) {
        appointments.flush(); history(a, actorId, action); return confirmation(a);
    }
    private void history(Appointment a, Long actorId, String action) {
        AppointmentHistory h = new AppointmentHistory(); h.setAppointmentId(a.getId()); h.setActorUserId(actorId);
        h.setAction(action); h.setAppointmentDate(a.getAppointmentDate()); h.setStartTime(a.getStartTime());
        h.setEndTime(a.getEndTime()); h.setStatus(a.getStatus()); h.setNotes(a.getNotes());
        h.setCancellationReason(a.getCancellationReason()); h.setOccurredAt(bookingClock.instant()); histories.save(h);
    }
    private Confirmation confirmation(Appointment a) {
        User owner = a.getPatient().getUser();
        return new Confirmation(a.getId(), a.getAppointmentCode(), a.getPatient().getId(), doctorInfo(a.getDoctor()),
            a.getAppointmentDate(), a.getStartTime(), a.getEndTime(), a.getAppointmentDate().atTime(a.getStartTime()).atZone(ZONE).toOffsetDateTime(),
            a.getAppointmentDate().atTime(a.getEndTime()).atZone(ZONE).toOffsetDateTime(), a.getStatus(),
            a.getBookingFor(), a.getAttendeeName() == null ? owner.getFullName() : a.getAttendeeName(),
            a.getAttendeeEmail() == null ? owner.getEmail() : a.getAttendeeEmail(),
            a.getAttendeePhone() == null ? owner.getPhone() : a.getAttendeePhone(),
            a.getAttendeeDob() == null ? owner.getDob() : a.getAttendeeDob(), a.getReason(), a.getConsentAt(),
            a.getNotes(), a.getCancellationReason(), a.getCreatedAt(), a.getUpdatedAt(), "NO_PAYMENT_COLLECTED");
    }
}
