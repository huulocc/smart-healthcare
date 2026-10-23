package com.example.healthcare.backend.booking;

import java.time.*;
import com.example.healthcare.backend.doctor.ShiftType;
import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "doctor_availability_exceptions") @Getter @Setter @NoArgsConstructor
public class AvailabilityException {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false) private Long doctorId;
    @Column(nullable = false) private LocalDate exceptionDate;
    @Column(nullable = false) private LocalTime startTime;
    @Column(nullable = false) private LocalTime endTime;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private ShiftType shiftType;
    @Column(nullable = false) private Long actorUserId;
    @Column(nullable = false) private Instant createdAt;
}
