package com.example.healthcare.backend.booking;

import java.time.*;
import com.example.healthcare.backend.doctor.Doctor;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity @Table(name = "appointments") @Getter @Setter @NoArgsConstructor
public class Appointment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 20) private String appointmentCode;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;
    // Retain the existing nullable FK; new bookings use live schedule validation instead.
    private Long scheduleId;
    @Column(nullable = false) private LocalDate appointmentDate;
    @Column(nullable = false) private LocalTime startTime;
    @Column(nullable = false) private LocalTime endTime;
    @Column(nullable = false, length = 500) private String reason;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AppointmentStatus status;
    @Column(length = 500) private String notes;
    @Column(length = 255) private String cancellationReason;
    // Nullable only for appointments created before the additive migration.
    @Column(length = 10) private String bookingFor;
    @Column(length = 100) private String attendeeName;
    @Column(length = 254) private String attendeeEmail;
    @Column(length = 20) private String attendeePhone;
    private LocalDate attendeeDob;
    private Instant consentAt;
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;
}
