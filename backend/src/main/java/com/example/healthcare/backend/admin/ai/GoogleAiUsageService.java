package com.example.healthcare.backend.admin.ai;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleAiUsageService {

    private final GoogleCloudProperties properties;
    private final GoogleAuthTokenProvider tokenProvider;
    private final GoogleMonitoringClient monitoringClient;
    private final GoogleQuotaClient quotaClient;
    private final GoogleBillingClient billingClient;

    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private record CachedResponse(GoogleAiUsageDto.GoogleAiUsageResponse response, Instant expiresAt) {
        public boolean isFresh() {
            return expiresAt != null && Instant.now().isBefore(expiresAt);
        }
    }

    private final ConcurrentMap<String, CachedResponse> cache = new ConcurrentHashMap<>();

    /**
     * Clear all cached responses (useful for manual refresh or tests).
     */
    public void clearCache() {
        cache.clear();
    }

    /**
     * Retrieves usage, quota, and billing metrics directly from Google Cloud services.
     * Caches responses in-memory according to google.cloud.cache-ttl-seconds unless refresh is requested.
     */
    public GoogleAiUsageDto.GoogleAiUsageResponse getGoogleAiUsage(boolean refresh, Instant from, Instant to) {
        String cacheKey = (properties.getProjectId() != null ? properties.getProjectId() : "") + ":" +
                (from != null ? from.toString() : "default") + ":" +
                (to != null ? to.toString() : "default");

        if (!refresh) {
            CachedResponse cached = cache.get(cacheKey);
            if (cached != null && cached.isFresh()) {
                log.debug("Returning cached Google AI usage metrics (expires in {}s)",
                        Duration.between(Instant.now(), cached.expiresAt()).getSeconds());
                return cached.response();
            }
        } else {
            cache.remove(cacheKey);
        }

        Instant endTime = to != null ? to : Instant.now();
        Instant startTime = from != null ? from : endTime.minus(Duration.ofDays(30));
        String reportingPeriod = startTime.atZone(ZoneOffset.UTC).format(DF) + " to " + endTime.atZone(ZoneOffset.UTC).format(DF);

        Optional<String> accessToken = tokenProvider.getAccessToken();

        // 1. Fetch Cloud Monitoring metrics
        GoogleAiUsageDto.ApiUsageMetrics usage = monitoringClient.fetchApiUsageMetrics(
                properties.getProjectId(), startTime, endTime, accessToken);

        // 2. Fetch Quota limits
        GoogleAiUsageDto.QuotaMetrics quotas = quotaClient.fetchQuotaMetrics(
                properties.getProjectId(), accessToken);

        // 3. Fetch Billing metrics
        GoogleAiUsageDto.BillingMetrics billing = billingClient.fetchBillingMetrics(
                properties, startTime, endTime, accessToken);

        // Accurate evaluation of overall project status
        String projectStatus;
        String projectMessage;

        if (!properties.isConfigured()) {
            projectStatus = "CONFIGURATION_REQUIRED";
            projectMessage = "Google Cloud project ID is not configured in application properties (google.cloud.project-id)";
        } else if (accessToken.isEmpty()) {
            projectStatus = "CREDENTIALS_MISSING";
            projectMessage = "Google Cloud service account credentials or OAuth token missing or invalid";
        } else if ("PERMISSION_DENIED".equals(usage.requestsStatus()) || "PERMISSION_DENIED".equals(quotas.status())) {
            projectStatus = "PERMISSION_DENIED";
            projectMessage = "Permission denied: Ensure Service Account has roles/monitoring.viewer and roles/serviceusage.serviceUsageViewer";
        } else if ("TEMPORARILY_UNAVAILABLE".equals(usage.requestsStatus()) && "TEMPORARILY_UNAVAILABLE".equals(quotas.status())) {
            projectStatus = "TEMPORARILY_UNAVAILABLE";
            projectMessage = "Google Cloud APIs temporarily unreachable or timed out";
        } else if ("AVAILABLE".equals(usage.requestsStatus()) || "AVAILABLE".equals(quotas.status()) || "AVAILABLE".equals(billing.status())) {
            projectStatus = "AVAILABLE";
            projectMessage = "Connected to Google Cloud APIs for project: " + properties.getProjectId();
        } else if ("NO_DATA".equals(usage.requestsStatus()) && "NO_DATA".equals(quotas.status())) {
            projectStatus = "AVAILABLE";
            projectMessage = "Connected to Google Cloud APIs (no activity found in reporting window)";
        } else {
            projectStatus = "UNAVAILABLE";
            projectMessage = "Unable to retrieve metrics from Google Cloud APIs";
        }

        GoogleAiUsageDto.ProjectMetadata project = new GoogleAiUsageDto.ProjectMetadata(
                properties.getProjectId() != null ? properties.getProjectId() : "",
                accessToken.isPresent(),
                projectStatus,
                projectMessage,
                Instant.now(),
                reportingPeriod
        );

        // Calculate Quota Day Boundaries (US/Pacific midnight-to-midnight)
        ZoneId pacificZone = ZoneId.of("America/Los_Angeles");
        ZonedDateTime nowPacific = ZonedDateTime.now(pacificZone);
        ZonedDateTime startOfQuotaDay = nowPacific.truncatedTo(ChronoUnit.DAYS);
        ZonedDateTime endOfQuotaDay = startOfQuotaDay.plusDays(1);
        Instant quotaDayStart = startOfQuotaDay.toInstant();
        Instant quotaDayEnd = endOfQuotaDay.toInstant();

        Long dailyLimit = (quotas != null && quotas.rpd() != null) ? quotas.rpd().limitValue() : null;
        Long usedToday = (usage != null) ? usage.usedToday() : null;

        Long remainingToday = null;
        boolean isOverLimit = false;
        String dailyStatus;
        String dailyStatusMessage;

        if (usedToday != null && dailyLimit != null) {
            long diff = dailyLimit - usedToday;
            remainingToday = Math.max(0L, diff);
            isOverLimit = usedToday > dailyLimit;
            dailyStatus = "AVAILABLE";
            dailyStatusMessage = isOverLimit ? "Daily quota exceeded" : "Estimated allowance remaining today";
        } else if (usedToday != null) {
            dailyStatus = "PARTIAL";
            dailyStatusMessage = "Usage for today is " + usedToday + ", but daily limit (RPD) is not defined by Google";
        } else if (dailyLimit != null) {
            dailyStatus = "PARTIAL";
            dailyStatusMessage = "Google daily quota limit is " + dailyLimit + ", but daily usage metric is unavailable";
        } else {
            dailyStatus = "CONFIGURATION_REQUIRED".equals(projectStatus) || "CREDENTIALS_MISSING".equals(projectStatus)
                    ? projectStatus : "UNAVAILABLE";
            dailyStatusMessage = "Daily limit and usage metrics are unavailable";
        }

        GoogleAiUsageDto.DailyUsageMetrics dailyUsage = new GoogleAiUsageDto.DailyUsageMetrics(
                usedToday,
                dailyLimit,
                remainingToday,
                true, // isEstimated because Cloud Monitoring metrics have reporting delays
                isOverLimit,
                quotaDayStart.toString(),
                quotaDayEnd.toString(),
                "America/Los_Angeles",
                dailyStatus,
                dailyStatusMessage,
                "gemini"
        );

        Map<String, String> metricStatus = new LinkedHashMap<>();
        metricStatus.put("requests", usage.requestsStatus());
        metricStatus.put("tokens", usage.tokensStatus());
        metricStatus.put("latency", usage.latencyStatus());
        metricStatus.put("quotas", quotas.status());
        metricStatus.put("billing", billing.status());
        metricStatus.put("daily", dailyUsage.status());

        GoogleAiUsageDto.GoogleAiUsageResponse response = new GoogleAiUsageDto.GoogleAiUsageResponse(
                project,
                usage,
                quotas,
                billing,
                dailyUsage,
                metricStatus
        );

        // Cache response with configured TTL
        int ttl = Math.max(10, properties.getCacheTtlSeconds());
        cache.put(cacheKey, new CachedResponse(response, Instant.now().plusSeconds(ttl)));

        return response;
    }

    /**
     * Backwards-compatible translation of Google Cloud metrics into AiUsageStatsResponse.
     * Replaces SQL Server data source completely.
     */
    public AdminAiUsageService.AiUsageStatsResponse getStats(Instant from, Instant to) {
        GoogleAiUsageDto.GoogleAiUsageResponse googleData = getGoogleAiUsage(false, from, to);
        GoogleAiUsageDto.ApiUsageMetrics usage = googleData.usage();
        GoogleAiUsageDto.BillingMetrics billing = googleData.billing();

        long totalRequests = usage.totalRequests() != null ? usage.totalRequests() : 0L;
        long successCount = usage.successCount() != null ? usage.successCount() : 0L;
        long errorCount = usage.errorCount() != null ? usage.errorCount() : 0L;
        double avgLatency = usage.avgLatencyMs() != null ? usage.avgLatencyMs() : 0.0;

        BigDecimal totalCost = billing.actualCost() != null ? billing.actualCost() : BigDecimal.ZERO;
        BigDecimal actualCost = billing.isActual() && billing.actualCost() != null ? billing.actualCost() : BigDecimal.ZERO;
        BigDecimal estimatedCost = BigDecimal.ZERO;

        double failureRate = totalRequests > 0 ? ((double) errorCount / totalRequests) * 100.0 : 0.0;

        List<AdminAiUsageService.TrendPoint> trends = new ArrayList<>();
        if (usage.trends() != null) {
            for (GoogleAiUsageDto.TrendPoint tp : usage.trends()) {
                trends.add(new AdminAiUsageService.TrendPoint(
                        tp.date(),
                        tp.requests(),
                        tp.avgLatencyMs() != null ? tp.avgLatencyMs() : 0.0,
                        BigDecimal.ZERO
                ));
            }
        }

        List<AdminAiUsageService.ProviderStat> providerBreakdown = new ArrayList<>();
        if (totalRequests > 0) {
            providerBreakdown.add(new AdminAiUsageService.ProviderStat("GOOGLE", totalRequests, totalCost));
        }

        List<AdminAiUsageService.ErrorStat> errorBreakdown = new ArrayList<>();
        if (errorCount > 0) {
            errorBreakdown.add(new AdminAiUsageService.ErrorStat("GOOGLE_API_ERROR", errorCount));
        }

        return new AdminAiUsageService.AiUsageStatsResponse(
                totalRequests,
                totalCost,
                actualCost,
                estimatedCost,
                Math.round(avgLatency * 10.0) / 10.0,
                successCount,
                errorCount,
                0L,
                0L,
                Math.round(failureRate * 10.0) / 10.0,
                0.0,
                0L,
                0L,
                0L,
                0.0,
                trends,
                Collections.emptyList(),
                providerBreakdown,
                errorBreakdown
        );
    }
}
