package com.example.healthcare.backend.admin.notification;

import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "admin_notifications")
@Getter
@Setter
@NoArgsConstructor
public class AdminNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "nvarchar(max)")
    private String message;

    @Column(nullable = false, length = 30)
    private String type; // APPOINTMENT, DOCTOR_REQUEST, AI_ALERT, SYSTEM, SECURITY

    @Column(nullable = false, length = 20)
    private String severity = "INFO"; // INFO, WARNING, SUCCESS, URGENT

    @Column(name = "is_read", nullable = false)
    private boolean isRead = false;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "link_path", length = 255)
    private String linkPath;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
