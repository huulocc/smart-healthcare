package com.example.healthcare.backend.admin.ai;

import java.time.Instant;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.common.PageResponse;
import com.example.healthcare.backend.admin.ai.AdminAiUsageService.AiUsageEventDto;
import com.example.healthcare.backend.admin.ai.AdminAiUsageService.AiUsageStatsResponse;
import com.example.healthcare.backend.admin.ai.AdminAiUsageService.RecordTelemetryRequest;
import com.example.healthcare.backend.admin.ai.GoogleAiUsageDto.GoogleAiUsageResponse;
import lombok.RequiredArgsConstructor;

/** Admin only: SecurityConfig restricts /api/admin/** to ROLE_ADMIN. */
@RestController
@RequestMapping("/api/admin/ai-usage")
@RequiredArgsConstructor
public class AdminAiUsageController {

    private final AdminAiUsageService service;
    private final GoogleAiUsageService googleService;
    private final GoogleCloudProperties googleProperties;

    /**
     * Official Google Cloud monitoring, quota, and billing telemetry endpoint.
     * The Admin AI Usage dashboard uses this as its authoritative data source.
     */
    @GetMapping("/google")
    public GoogleAiUsageResponse getGoogleUsage(
            @RequestParam(defaultValue = "false") boolean refresh,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return googleService.getGoogleAiUsage(refresh, from, to);
    }

    /**
     * Backward-compatible statistics endpoint.
     * When Google Cloud is configured, metrics are sourced directly from Google Cloud.
     * When unconfigured, falls back to local telemetry for backward compatibility.
     */
    @GetMapping({"/statistics", "/stats"})
    public AiUsageStatsResponse getStats(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        if (googleProperties.isConfigured()) {
            return googleService.getStats(from, to);
        }
        return service.getStats(from, to);
    }

    /**
     * Historical client telemetry audit log.
     */
    @GetMapping("/events")
    public PageResponse<AiUsageEventDto> listEvents(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.listEvents(status, from, to, page, size);
    }

    @PostMapping("/events")
    public AiUsageEventDto recordEvent(@RequestBody RecordTelemetryRequest request) {
        return service.recordEvent(request);
    }
}
