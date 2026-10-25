package com.example.healthcare.backend.admin.ai;

import java.time.Instant;
import java.util.Optional;

/**
 * Client for retrieving request count, error count, and latency metrics
 * directly from Google Cloud Monitoring API v3.
 */
public interface GoogleMonitoringClient {

    GoogleAiUsageDto.ApiUsageMetrics fetchApiUsageMetrics(
            String projectId,
            Instant from,
            Instant to,
            Optional<String> accessToken
    );
}
