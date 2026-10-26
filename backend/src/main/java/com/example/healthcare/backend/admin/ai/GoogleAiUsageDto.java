package com.example.healthcare.backend.admin.ai;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Data shapes representing real Google Cloud metrics (Monitoring, Quotas, Billing).
 * Explicitly distinguishes actual values, unsupported metrics, and unavailable states.
 */
public class GoogleAiUsageDto {

    public record ProjectMetadata(
            String projectId,
            boolean authenticated,
            String status, // "AVAILABLE", "CREDENTIALS_MISSING", "CONFIGURATION_REQUIRED", "PERMISSION_DENIED", "TEMPORARILY_UNAVAILABLE", "UNAVAILABLE"
            String statusMessage,
            Instant lastRefreshedAt,
            String reportingPeriod
    ) {}

    public record TrendPoint(
            String date,
            long requests,
            Double avgLatencyMs,
            long errorCount
    ) {}

    public record ApiUsageMetrics(
            Long totalRequests,
            Long successCount,
            Long errorCount,
            Long quotaExceededCount,
            Double avgLatencyMs,
            Long inputTokens,
            Long outputTokens,
            Long totalTokens,
            String requestsStatus, // "AVAILABLE", "NO_DATA", "TEMPORARILY_UNAVAILABLE", "PERMISSION_DENIED", "UNAVAILABLE", "CONFIGURATION_REQUIRED", "CREDENTIALS_MISSING"
            String tokensStatus,   // "UNSUPPORTED", "AVAILABLE", "UNAVAILABLE"
            String latencyStatus,  // "AVAILABLE", "NO_DATA", "TEMPORARILY_UNAVAILABLE", "PERMISSION_DENIED", "UNAVAILABLE"
            List<TrendPoint> trends,
            Long usedToday
    ) {
        public ApiUsageMetrics(Long totalRequests, Long successCount, Long errorCount, Long quotaExceededCount,
                              Double avgLatencyMs, Long inputTokens, Long outputTokens, Long totalTokens,
                              String requestsStatus, String tokensStatus, String latencyStatus,
                              List<TrendPoint> trends) {
            this(totalRequests, successCount, errorCount, quotaExceededCount, avgLatencyMs, inputTokens, outputTokens, totalTokens, requestsStatus, tokensStatus, latencyStatus, trends, null);
        }
    }

    public record QuotaLimitInfo(
            String name,
            String metricKey,
            Long limitValue,
            String unit,
            String period,
            Long currentUsage,
            String status, // "AVAILABLE", "UNAVAILABLE", "UNSUPPORTED", "PERMISSION_DENIED", "NO_DATA"
            Map<String, String> dimensions // e.g. {"model": "gemini-1.5-flash", "region": "global"}
    ) {
        public QuotaLimitInfo(String name, String metricKey, Long limitValue, String unit, String period, Long currentUsage, String status) {
            this(name, metricKey, limitValue, unit, period, currentUsage, status, Collections.emptyMap());
        }
    }

    public record QuotaMetrics(
            QuotaLimitInfo rpm,
            QuotaLimitInfo tpm,
            QuotaLimitInfo rpd,
            List<QuotaLimitInfo> modelQuotas,
            Long quotaExceededEvents,
            String quotaSource,
            String status // "AVAILABLE", "NO_DATA", "UNAVAILABLE", "PERMISSION_DENIED", "CONFIGURATION_REQUIRED", "CREDENTIALS_MISSING"
    ) {
        public QuotaMetrics(QuotaLimitInfo rpm, QuotaLimitInfo tpm, QuotaLimitInfo rpd, Long quotaExceededEvents, String quotaSource, String status) {
            this(rpm, tpm, rpd, Collections.emptyList(), quotaExceededEvents, quotaSource, status);
        }
    }

    public record BillingMetrics(
            BigDecimal actualCost,
            String currency,
            String billingPeriod,
            String billingAccountName,
            boolean isActual,
            String status, // "AVAILABLE", "NOT_CONFIGURED", "NO_DATA", "PERMISSION_DENIED", "TEMPORARILY_UNAVAILABLE", "UNAVAILABLE", "CREDENTIALS_MISSING"
            String statusMessage,
            Instant dataFreshness
    ) {}

    public record DailyUsageMetrics(
            Long usedToday,
            Long dailyLimit,
            Long remainingToday,
            boolean isEstimated,
            boolean isOverLimit,
            String quotaDayStart, // ISO-8601 UTC
            String quotaDayEnd,   // ISO-8601 UTC
            String timezone,       // "America/Los_Angeles"
            String status,         // "AVAILABLE", "PARTIAL", "NO_DATA", "UNAVAILABLE", "CONFIGURATION_REQUIRED", "CREDENTIALS_MISSING"
            String statusMessage,
            String modelFilter
    ) {}

    public record GoogleAiUsageResponse(
            ProjectMetadata project,
            ApiUsageMetrics usage,
            QuotaMetrics quotas,
            BillingMetrics billing,
            DailyUsageMetrics dailyUsage,
            Map<String, String> metricStatus
    ) {
        public GoogleAiUsageResponse(ProjectMetadata project, ApiUsageMetrics usage, QuotaMetrics quotas, BillingMetrics billing, Map<String, String> metricStatus) {
            this(project, usage, quotas, billing, null, metricStatus);
        }
    }
}
