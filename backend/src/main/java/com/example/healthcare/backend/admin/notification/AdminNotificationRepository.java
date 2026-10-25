package com.example.healthcare.backend.admin.notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface AdminNotificationRepository extends JpaRepository<AdminNotification, Long> {

    Page<AdminNotification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<AdminNotification> findByIsReadOrderByCreatedAtDesc(boolean isRead, Pageable pageable);

    Page<AdminNotification> findByTypeOrderByCreatedAtDesc(String type, Pageable pageable);

    Page<AdminNotification> findByTypeAndIsReadOrderByCreatedAtDesc(String type, boolean isRead, Pageable pageable);

    long countByIsReadFalse();

    @Modifying
    @Query("UPDATE AdminNotification n SET n.isRead = true, n.readAt = :now WHERE n.isRead = false")
    int markAllAsRead(Instant now);
}
