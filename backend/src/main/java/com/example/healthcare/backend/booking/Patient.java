package com.example.healthcare.backend.booking;

import java.time.Instant;
import com.example.healthcare.backend.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity @Table(name = "patients") @Getter @Setter @NoArgsConstructor
public class Patient {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true) private User user;
    @Column(nullable = false, unique = true, length = 16) private String patientCode;
    @Column(nullable = false, length = 20) private String status = "ACTIVE";
    @CreationTimestamp @Column(nullable = false, updatable = false) private Instant createdAt;
    @UpdateTimestamp @Column(nullable = false) private Instant updatedAt;
}
