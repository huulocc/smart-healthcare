package com.example.healthcare.backend.admin.ai;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DefaultGoogleMonitoringClient implements GoogleMonitoringClient {

    private final GoogleCloudProperties properties;
    private final HttpClient httpClient;
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ZoneId PACIFIC_ZONE = ZoneId.of("America/Los_Angeles");

    @org.springframework.beans.factory.annotation.Autowired
    public DefaultGoogleMonitoringClient(GoogleCloudProperties properties) {
        this(properties, HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build());
    }

    public DefaultGoogleMonitoringClient(GoogleCloudProperties properties, HttpClient httpClient) {
        this.properties = properties;
        this.httpClient = httpClient;
    }

    @Override
    public GoogleAiUsageDto.ApiUsageMetrics fetchApiUsageMetrics(
            String projectId,
            Instant from,
            Instant to,
            Optional<String> accessToken
    ) {
        if (projectId == null || projectId.trim().isEmpty()) {
            return unconfiguredMetrics("CONFIGURATION_REQUIRED");
        }

        if (accessToken.isEmpty() || accessToken.get().trim().isEmpty()) {
            return unconfiguredMetrics("CREDENTIALS_MISSING");
        }

        Instant endTime = to != null ? to : Instant.now();
        Instant startTime = from != null ? from : endTime.minus(Duration.ofDays(30));

        String token = accessToken.get();

        try {
            // 1. Fetch Request Counts grouped by response_code_class
            String requestCountFilter = "metric.type=\"serviceruntime.googleapis.com/api/request_count\" " +
                    "AND resource.type=\"consumed_api\" " +
                    "AND resource.labels.service=\"generativelanguage.googleapis.com\"";

            String reqUrl = properties.getApiBaseUrl() + "/v3/projects/" + URLEncoder.encode(projectId, StandardCharsets.UTF_8) + "/timeSeries?" +
                    "filter=" + URLEncoder.encode(requestCountFilter, StandardCharsets.UTF_8) +
                    "&interval.startTime=" + URLEncoder.encode(startTime.toString(), StandardCharsets.UTF_8) +
                    "&interval.endTime=" + URLEncoder.encode(endTime.toString(), StandardCharsets.UTF_8) +
                    "&aggregation.alignmentPeriod=86400s" +
                    "&aggregation.perSeriesAligner=ALIGN_SUM" +
                    "&aggregation.crossSeriesReducer=REDUCE_SUM" +
                    "&aggregation.groupByFields=metric.labels.response_code_class";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(reqUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401 || resp.statusCode() == 403) {
                log.warn("Google Cloud Monitoring API permission denied (HTTP {}): {}", resp.statusCode(), resp.body());
                return unconfiguredMetrics("PERMISSION_DENIED");
            }

            if (resp.statusCode() == 408 || resp.statusCode() == 504) {
                log.warn("Google Cloud Monitoring API timed out (HTTP {})", resp.statusCode());
                return unconfiguredMetrics("TEMPORARILY_UNAVAILABLE");
            }

            if (resp.statusCode() != 200) {
                log.warn("Google Cloud Monitoring API returned HTTP {}: {}", resp.statusCode(), resp.body());
                return unconfiguredMetrics("UNAVAILABLE");
            }

            // 2. Fetch Latency Metric with DISTRIBUTION support
            LatencyResult latencyResult = fetchLatencyMetrics(projectId, startTime, endTime, token);

            // Parse response
            return parseMetricsResponse(resp.body(), latencyResult);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Google Cloud Monitoring request interrupted: {}", e.getMessage());
            return unconfiguredMetrics("TEMPORARILY_UNAVAILABLE");
        } catch (Exception e) {
            log.error("Failed to fetch Google Cloud Monitoring metrics: {}", e.getMessage());
            return unconfiguredMetrics("UNAVAILABLE");
        }
    }

    public record LatencyResult(
            Double overallAvgLatencyMs,
            Map<String, Double> dailyAvgLatencyMs,
            String status // "AVAILABLE", "NO_DATA", "PERMISSION_DENIED", "UNAVAILABLE"
    ) {}

    public LatencyResult fetchLatencyMetrics(String projectId, Instant startTime, Instant endTime, String token) {
        try {
            String latencyFilter = "metric.type=\"serviceruntime.googleapis.com/api/request_latencies\" " +
                    "AND resource.type=\"consumed_api\" " +
                    "AND resource.labels.service=\"generativelanguage.googleapis.com\"";

            String latencyUrl = properties.getApiBaseUrl() + "/v3/projects/" + URLEncoder.encode(projectId, StandardCharsets.UTF_8) + "/timeSeries?" +
                    "filter=" + URLEncoder.encode(latencyFilter, StandardCharsets.UTF_8) +
                    "&interval.startTime=" + URLEncoder.encode(startTime.toString(), StandardCharsets.UTF_8) +
                    "&interval.endTime=" + URLEncoder.encode(endTime.toString(), StandardCharsets.UTF_8) +
                    "&aggregation.alignmentPeriod=86400s" +
                    "&aggregation.perSeriesAligner=ALIGN_DELTA";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(latencyUrl))
                    .timeout(Duration.ofSeconds(6))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() == 401 || resp.statusCode() == 403) {
                return new LatencyResult(null, Collections.emptyMap(), "PERMISSION_DENIED");
            }
            if (resp.statusCode() != 200) {
                return new LatencyResult(null, Collections.emptyMap(), "UNAVAILABLE");
            }

            return parseDistributionLatency(resp.body());

        } catch (Exception e) {
            log.debug("Latency metric retrieval skipped or failed: {}", e.getMessage());
            return new LatencyResult(null, Collections.emptyMap(), "UNAVAILABLE");
        }
    }

    public LatencyResult parseDistributionLatency(String json) {
        Map<String, Object> root = SimpleJson.parseObject(json);
        List<Object> series = SimpleJson.getList(root, "timeSeries");
        if (series.isEmpty()) {
            return new LatencyResult(null, Collections.emptyMap(), "NO_DATA");
        }

        double totalWeightedLatencyMs = 0.0;
        long totalObservations = 0;

        Map<String, Double> dailyWeightedMs = new TreeMap<>();
        Map<String, Long> dailyCounts = new TreeMap<>();

        for (Object tsObj : series) {
            if (tsObj instanceof Map<?, ?> tsMapRaw) {
                @SuppressWarnings("unchecked")
                Map<String, Object> tsMap = (Map<String, Object>) tsMapRaw;
                List<Object> points = SimpleJson.getList(tsMap, "points");

                for (Object ptObj : points) {
                    if (ptObj instanceof Map<?, ?> ptMapRaw) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ptMap = (Map<String, Object>) ptMapRaw;
                        Map<String, Object> valMap = SimpleJson.getMap(ptMap, "value");

                        String dateStr = "";
                        Map<String, Object> intervalMap = SimpleJson.getMap(ptMap, "interval");
                        String endTimeStr = SimpleJson.getString(intervalMap, "endTime", "");
                        if (!endTimeStr.isEmpty()) {
                            try {
                                dateStr = Instant.parse(endTimeStr).atZone(ZoneOffset.UTC).format(DF);
                            } catch (Exception ignored) {}
                        }

                        // Case A: DISTRIBUTION type metric (Standard for serviceruntime request_latencies)
                        Map<String, Object> distMap = SimpleJson.getMap(valMap, "distributionValue");
                        if (!distMap.isEmpty()) {
                            long count = SimpleJson.getLong(distMap, "count", 0L);
                            double meanSec = SimpleJson.getDouble(distMap, "mean", 0.0);
                            if (count > 0 && meanSec > 0.0) {
                                double sampleMs = meanSec * 1000.0;
                                totalWeightedLatencyMs += (sampleMs * count);
                                totalObservations += count;

                                if (!dateStr.isEmpty()) {
                                    dailyWeightedMs.merge(dateStr, sampleMs * count, Double::sum);
                                    dailyCounts.merge(dateStr, count, Long::sum);
                                }
                            }
                        } else {
                            // Case B: Scalar doubleValue or int64Value (fallback)
                            Double dSec = SimpleJson.getDouble(valMap, "doubleValue", null);
                            if (dSec == null || dSec <= 0.0) {
                                Long iVal = SimpleJson.getLong(valMap, "int64Value", null);
                                if (iVal != null) dSec = iVal.doubleValue();
                            }
                            if (dSec != null && dSec > 0.0) {
                                double sampleMs = dSec * 1000.0;
                                totalWeightedLatencyMs += sampleMs;
                                totalObservations += 1;

                                if (!dateStr.isEmpty()) {
                                    dailyWeightedMs.merge(dateStr, sampleMs, Double::sum);
                                    dailyCounts.merge(dateStr, 1L, Long::sum);
                                }
                            }
                        }
                    }
                }
            }
        }

        if (totalObservations == 0) {
            return new LatencyResult(null, Collections.emptyMap(), "NO_DATA");
        }

        Double overallAvg = Math.round((totalWeightedLatencyMs / totalObservations) * 10.0) / 10.0;

        Map<String, Double> dailyAverages = new TreeMap<>();
        for (Map.Entry<String, Double> entry : dailyWeightedMs.entrySet()) {
            long count = dailyCounts.getOrDefault(entry.getKey(), 1L);
            if (count > 0) {
                dailyAverages.put(entry.getKey(), Math.round((entry.getValue() / count) * 10.0) / 10.0);
            }
        }

        return new LatencyResult(overallAvg, dailyAverages, "AVAILABLE");
    }

    public GoogleAiUsageDto.ApiUsageMetrics parseMetricsResponse(String json, LatencyResult latencyResult) {
        return parseMetricsResponse(json, latencyResult, Instant.now());
    }

    public GoogleAiUsageDto.ApiUsageMetrics parseMetricsResponse(String json, LatencyResult latencyResult, Instant referenceNow) {
        long totalRequests = 0;
        long successCount = 0;
        long errorCount = 0;
        long quotaExceededCount = 0;
        long todayRequestsCount = 0;

        ZonedDateTime nowPacific = (referenceNow != null ? referenceNow : Instant.now()).atZone(PACIFIC_ZONE);
        Instant quotaDayStart = nowPacific.truncatedTo(ChronoUnit.DAYS).toInstant();
        Instant quotaDayEnd = nowPacific.truncatedTo(ChronoUnit.DAYS).plusDays(1).toInstant();

        Map<String, Long> dailyTotal = new TreeMap<>();
        Map<String, Long> dailyErrors = new TreeMap<>();

        Map<String, Object> root = SimpleJson.parseObject(json);
        List<Object> timeSeries = SimpleJson.getList(root, "timeSeries");

        boolean hasPoints = false;

        for (Object tsObj : timeSeries) {
            if (tsObj instanceof Map<?, ?> tsMapRaw) {
                @SuppressWarnings("unchecked")
                Map<String, Object> tsMap = (Map<String, Object>) tsMapRaw;
                Map<String, Object> metricMap = SimpleJson.getMap(tsMap, "metric");
                Map<String, Object> labelsMap = SimpleJson.getMap(metricMap, "labels");
                String codeClass = SimpleJson.getString(labelsMap, "response_code_class", "");

                boolean is2xx = "2xx".equalsIgnoreCase(codeClass);
                boolean is4xx = "4xx".equalsIgnoreCase(codeClass);
                boolean is5xx = "5xx".equalsIgnoreCase(codeClass);

                List<Object> points = SimpleJson.getList(tsMap, "points");
                for (Object ptObj : points) {
                    if (ptObj instanceof Map<?, ?> ptMapRaw) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> ptMap = (Map<String, Object>) ptMapRaw;
                        Map<String, Object> valMap = SimpleJson.getMap(ptMap, "value");
                        long count = SimpleJson.getLong(valMap, "int64Value", 0L);
                        hasPoints = true;

                        Map<String, Object> intervalMap = SimpleJson.getMap(ptMap, "interval");
                        String endTimeStr = SimpleJson.getString(intervalMap, "endTime", "");
                        String dateStr = "";
                        if (!endTimeStr.isEmpty()) {
                            try {
                                Instant ptEnd = Instant.parse(endTimeStr);
                                dateStr = ptEnd.atZone(ZoneOffset.UTC).format(DF);
                                if (!ptEnd.isBefore(quotaDayStart) && ptEnd.isBefore(quotaDayEnd)) {
                                    todayRequestsCount += count;
                                }
                            } catch (Exception ignored) {}
                        }

                        totalRequests += count;
                        if (is2xx) {
                            successCount += count;
                        } else if (is4xx || is5xx) {
                            errorCount += count;
                            if (!dateStr.isEmpty()) {
                                dailyErrors.merge(dateStr, count, Long::sum);
                            }
                        }

                        if (!dateStr.isEmpty()) {
                            dailyTotal.merge(dateStr, count, Long::sum);
                        }
                    }
                }
            }
        }

        String requestsStatus;
        Long usedToday;
        if (!hasPoints && timeSeries.isEmpty()) {
            requestsStatus = "NO_DATA";
            usedToday = 0L;
        } else {
            requestsStatus = "AVAILABLE";
            usedToday = todayRequestsCount;
        }

        List<GoogleAiUsageDto.TrendPoint> trends = new ArrayList<>();
        for (Map.Entry<String, Long> entry : dailyTotal.entrySet()) {
            long dTotal = entry.getValue();
            long dErr = dailyErrors.getOrDefault(entry.getKey(), 0L);
            Double dayLat = latencyResult.dailyAvgLatencyMs().get(entry.getKey());
            if (dayLat == null) {
                dayLat = latencyResult.overallAvgLatencyMs();
            }
            trends.add(new GoogleAiUsageDto.TrendPoint(
                    entry.getKey(),
                    dTotal,
                    dayLat,
                    dErr
            ));
        }

        String latencyStatus = latencyResult.status();
        if ("NO_DATA".equals(latencyStatus) && totalRequests > 0) {
            latencyStatus = "UNAVAILABLE";
        }

        return new GoogleAiUsageDto.ApiUsageMetrics(
                totalRequests,
                successCount,
                errorCount,
                quotaExceededCount,
                latencyResult.overallAvgLatencyMs(),
                null, // inputTokens unsupported in serviceruntime
                null, // outputTokens unsupported in serviceruntime
                null, // totalTokens unsupported in serviceruntime
                requestsStatus,
                "UNSUPPORTED",
                latencyStatus,
                trends,
                usedToday
        );
    }

    private GoogleAiUsageDto.ApiUsageMetrics unconfiguredMetrics(String status) {
        return new GoogleAiUsageDto.ApiUsageMetrics(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                status,
                "UNSUPPORTED",
                status,
                Collections.emptyList()
        );
    }
}
