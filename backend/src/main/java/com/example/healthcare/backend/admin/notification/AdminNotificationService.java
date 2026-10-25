package com.example.healthcare.backend.admin.notification;

import java.time.Instant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminNotificationService {

    private final AdminNotificationRepository repository;

    public record NotificationDto(
            Long id,
            String title,
            String message,
            String type,
            String severity,
            boolean isRead,
            Instant readAt,
            String linkPath,
            Instant createdAt
    ) {
        public static NotificationDto from(AdminNotification n) {
            return new NotificationDto(
                    n.getId(),
                    n.getTitle(),
                    n.getMessage(),
                    n.getType(),
                    n.getSeverity(),
                    n.isRead(),
                    n.getReadAt(),
                    n.getLinkPath(),
                    n.getCreatedAt()
            );
        }
    }

    public record UnreadCountResponse(long count, long unreadCount) {
        public UnreadCountResponse(long count) {
            this(count, count);
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationDto> list(String type, Boolean isRead, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<AdminNotification> p;

        if (type != null && !type.isBlank()) {
            if (isRead != null) {
                p = repository.findByTypeAndIsReadOrderByCreatedAtDesc(type.trim().toUpperCase(), isRead, pageable);
            } else {
                p = repository.findByTypeOrderByCreatedAtDesc(type.trim().toUpperCase(), pageable);
            }
        } else {
            if (isRead != null) {
                p = repository.findByIsReadOrderByCreatedAtDesc(isRead, pageable);
            } else {
                p = repository.findAllByOrderByCreatedAtDesc(pageable);
            }
        }

        return PageResponse.from(p, NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public UnreadCountResponse getUnreadCount() {
        return new UnreadCountResponse(repository.countByIsReadFalse());
    }

    @Transactional
    public NotificationDto setReadStatus(Long id, boolean isRead) {
        AdminNotification notification = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found"));
        notification.setRead(isRead);
        notification.setReadAt(isRead ? Instant.now() : null);
        return NotificationDto.from(repository.save(notification));
    }

    @Transactional
    public int markAllRead() {
        return repository.markAllAsRead(Instant.now());
    }
}
