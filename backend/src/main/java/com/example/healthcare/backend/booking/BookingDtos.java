package com.example.healthcare.backend.booking;

import java.time.*;
import java.util.List;
import com.example.healthcare.backend.doctor.ShiftType;
import jakarta.validation.constraints.*;

public final class BookingDtos {
    private BookingDtos() {}
    public record CreateRequest(
        @NotNull @Positive Long doctorId, @NotNull LocalDate date, @NotNull LocalTime startTime,
        @NotBlank @Pattern(regexp = "myself|someone") String bookingFor,
        @NotBlank @Size(min = 2, max = 100) String patientName,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$") String phone,
        @NotNull LocalDate dob, @NotBlank @Size(max = 500) String reason,
        @NotNull @AssertTrue Boolean consent) {}
    public record RescheduleRequest(@NotNull LocalDate date, @NotNull LocalTime startTime) {}
    public record CancelRequest(@NotBlank @Size(max = 255) String reason) {}
    public record StatusRequest(@NotNull AppointmentStatus status, @Size(max = 500) String notes) {}
    public record NotesRequest(@NotNull @Size(max = 500) String notes) {}
    public record ExceptionRequest(@NotNull LocalDate date, @NotNull LocalTime startTime,
        @NotNull LocalTime endTime, @NotNull ShiftType shiftType) {}
    public record DoctorInfo(Long id, String doctorCode, String name, String specialty,
        Integer experienceYears, String avatarUrl, Long departmentId, String departmentName,
        String status, String availability) {}
    public record Slot(LocalDate date, LocalTime startTime, LocalTime endTime, OffsetDateTime startsAt,
        OffsetDateTime endsAt) {}
    public record AvailabilityResponse(DoctorInfo doctor, String timezone, LocalDate from, LocalDate to,
        List<Slot> slots) {}
    public record Confirmation(Long id, String appointmentCode, Long patientId, DoctorInfo doctor,
        LocalDate date, LocalTime startTime, LocalTime endTime, OffsetDateTime startsAt, OffsetDateTime endsAt,
        AppointmentStatus status, String bookingFor, String patientName, String email, String phone,
        LocalDate dob, String reason, Instant consentAt, String notes, String cancellationReason,
        Instant createdAt, Instant updatedAt, String paymentPolicy) {}
    public record History(Long id, Long actorUserId, String action, LocalDate date, LocalTime startTime,
        LocalTime endTime, AppointmentStatus status, String notes, String cancellationReason, Instant occurredAt) {}
    public record ExceptionResponse(Long id, Long doctorId, LocalDate date, LocalTime startTime,
        LocalTime endTime, ShiftType shiftType, Instant createdAt) {}
    public enum View { ALL, UPCOMING, HISTORY }
}
