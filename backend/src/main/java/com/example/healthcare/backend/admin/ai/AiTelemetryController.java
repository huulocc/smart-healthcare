package com.example.healthcare.backend.admin.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import com.example.healthcare.backend.admin.ai.AdminAiUsageService.AiUsageEventDto;
import com.example.healthcare.backend.admin.ai.AdminAiUsageService.RecordTelemetryRequest;
import com.example.healthcare.backend.common.ApiException;

/**
 * Endpoint for recording AI telemetry events from client assistants or RAG services.
 * Does not expose consultation text, API keys, or sensitive clinical notes.
 */
@RestController
@RequestMapping("/api/ai")
public class AiTelemetryController {

    private final AdminAiUsageService service;
    private final String configuredSecret;

    public AiTelemetryController(
            AdminAiUsageService service,
            @Value("${app.ai.telemetry-secret:}") String configuredSecret
    ) {
        this.service = service;
        this.configuredSecret = configuredSecret;
    }

    @PostMapping("/telemetry")
    @ResponseStatus(HttpStatus.CREATED)
    public AiUsageEventDto recordTelemetry(
            @RequestHeader(value = "X-Telemetry-Secret", required = false) String secretHeader,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestBody RecordTelemetryRequest request
    ) {
        validateSecret(secretHeader, authHeader);
        return service.recordEvent(request);
    }

    private void validateSecret(String secretHeader, String authHeader) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Telemetry secret is not configured");
        }

        if (secretHeader != null && configuredSecret.equals(secretHeader.trim())) {
            return;
        }

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            if (configuredSecret.equals(token)) {
                return;
            }
        }

        throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid or missing telemetry secret");
    }
}
