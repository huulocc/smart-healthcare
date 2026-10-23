package com.example.healthcare.backend.booking;

import java.time.*;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "appointment_history") @Getter @Setter @NoArgsConstructor
public class AppointmentHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long appointmentId;
    @Column(nullable = false) private Long actorUserId;
    @Column(nullable = false, length = 30) private String action;
    @Column(nullable = false) private LocalDate appointmentDate;
    @Column(nullable = false) private LocalTime startTime;
    @Column(nullable = false) private LocalTime endTime;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private AppointmentStatus status;
    @Column(length = 500) private String notes;
    @Column(length = 255) private String cancellationReason;
    @Column(nullable = false) private Instant occurredAt;
}
