package com.example.healthcare.backend.admin.notification;

import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.admin.notification.AdminNotificationService.NotificationDto;
import com.example.healthcare.backend.admin.notification.AdminNotificationService.UnreadCountResponse;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/notifications")
@RequiredArgsConstructor
public class AdminNotificationController {

    private final AdminNotificationService service;

    @GetMapping
    public PageResponse<NotificationDto> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Boolean isRead,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.list(type, isRead, page, size);
    }

    @GetMapping("/unread-count")
    public UnreadCountResponse unreadCount() {
        return service.getUnreadCount();
    }

    @PatchMapping("/{id}/read")
    public NotificationDto markRead(@PathVariable Long id, @RequestParam(defaultValue = "true") boolean isRead) {
        return service.setReadStatus(id, isRead);
    }

    @PostMapping("/mark-all-read")
    public void markAllRead() {
        service.markAllRead();
    }
}
