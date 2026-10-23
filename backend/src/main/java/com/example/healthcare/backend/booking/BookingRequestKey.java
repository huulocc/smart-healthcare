package com.example.healthcare.backend.booking;

import jakarta.persistence.*;
import lombok.*;

@Entity @Table(name = "booking_request_keys", uniqueConstraints = @UniqueConstraint(
    name = "uk_booking_request_owner_key", columnNames = {"user_id", "request_key"}))
@Getter @Setter @NoArgsConstructor
public class BookingRequestKey {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "user_id", nullable = false) private Long userId;
    @Column(name = "request_key", nullable = false, length = 80) private String requestKey;
    @Column(nullable = false, length = 64) private String requestHash;
    @Column(nullable = false) private Long appointmentId;
}
