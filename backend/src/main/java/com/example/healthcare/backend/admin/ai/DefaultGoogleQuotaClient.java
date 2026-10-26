package com.example.healthcare.backend.admin.ai;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DefaultGoogleQuotaClient implements GoogleQuotaClient {

    private final HttpClient httpClient;

    @org.springframework.beans.factory.annotation.Autowired
    public DefaultGoogleQuotaClient(GoogleCloudProperties properties) {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build());
    }

    public DefaultGoogleQuotaClient(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public GoogleAiUsageDto.QuotaMetrics fetchQuotaMetrics(
            String projectId,
            Optional<String> accessToken
    ) {
        if (projectId == null || projectId.trim().isEmpty()) {
            return unconfiguredQuota("CONFIGURATION_REQUIRED");
        }

        if (accessToken.isEmpty() || accessToken.get().trim().isEmpty()) {
            return unconfiguredQuota("CREDENTIALS_MISSING");
        }

        String token = accessToken.get();

        try {
            // Query Service Usage consumerQuotaMetrics for generativelanguage.googleapis.com
            String serviceUsageUrl = "https://serviceusage.googleapis.com/v1beta1/projects/" +
                    URLEncoder.encode(projectId, StandardCharsets.UTF_8) +
                    "/services/generativelanguage.googleapis.com/consumerQuotaMetrics?view=FULL";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(serviceUsageUrl))
                    .timeout(Duration.ofSeconds(8))
                    .header("Authorization", "Bearer " + token)
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401 || resp.statusCode() == 403) {
                log.warn("Google Cloud Quotas API permission denied (HTTP {}): {}", resp.statusCode(), resp.body());
                return unconfiguredQuota("PERMISSION_DENIED");
            }

            if (resp.statusCode() == 408 || resp.statusCode() == 504) {
                log.warn("Google Cloud Quotas API timed out (HTTP {})", resp.statusCode());
                return unconfiguredQuota("TEMPORARILY_UNAVAILABLE");
            }

            if (resp.statusCode() != 200) {
                log.warn("Google Cloud Quotas API returned HTTP {}: {}", resp.statusCode(), resp.body());
                return unconfiguredQuota("UNAVAILABLE");
            }

            return parseQuotaResponse(resp.body());

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("Google Cloud Quotas request interrupted: {}", e.getMessage());
            return unconfiguredQuota("TEMPORARILY_UNAVAILABLE");
        } catch (Exception e) {
            log.error("Failed to fetch Google Cloud quotas: {}", e.getMessage());
            return unconfiguredQuota("UNAVAILABLE");
        }
    }

    public GoogleAiUsageDto.QuotaMetrics parseQuotaResponse(String json) {
        Map<String, Object> root = SimpleJson.parseObject(json);
        List<Object> metrics = SimpleJson.getList(root, "metrics");
        List<Object> quotaInfos = SimpleJson.getList(root, "quotaInfos");

        List<GoogleAiUsageDto.QuotaLimitInfo> modelQuotas = new ArrayList<>();

        // Parser Path 1: Service Usage consumerQuotaMetrics
        if (!metrics.isEmpty()) {
            for (Object mObj : metrics) {
                if (mObj instanceof Map<?, ?> mMapRaw) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> mMap = (Map<String, Object>) mMapRaw;
                    String metricName = SimpleJson.getString(mMap, "metric", "");
                    String displayName = SimpleJson.getString(mMap, "displayName", "");
                    List<Object> consumerLimits = SimpleJson.getList(mMap, "consumerQuotaLimits");

                    for (Object limitObj : consumerLimits) {
                        if (limitObj instanceof Map<?, ?> limitMapRaw) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> limitMap = (Map<String, Object>) limitMapRaw;
                            String unit = SimpleJson.getString(limitMap, "unit", "");
                            List<Object> buckets = SimpleJson.getList(limitMap, "quotaBuckets");

                            for (Object bucketObj : buckets) {
                                if (bucketObj instanceof Map<?, ?> bucketMapRaw) {
                                    @SuppressWarnings("unchecked")
                                    Map<String, Object> bucketMap = (Map<String, Object>) bucketMapRaw;
                                    Long effectiveLimit = SimpleJson.getLong(bucketMap, "effectiveLimit", -1L);
                                    if (effectiveLimit < 0) {
                                        effectiveLimit = null;
                                    }

                                    Map<String, Object> rawDims = SimpleJson.getMap(bucketMap, "dimensions");
                                    Map<String, String> dimensions = new LinkedHashMap<>();
                                    for (Map.Entry<String, Object> e : rawDims.entrySet()) {
                                        if (e.getValue() != null) {
                                            dimensions.put(e.getKey(), e.getValue().toString());
                                        }
                                    }

                                    String model = dimensions.get("model");
                                    String period = unit.contains("/min") || metricName.contains("minute") ? "1m" : "1d";
                                    String metricCategory;

                                    if (unit.contains("token") || metricName.contains("token")) {
                                        metricCategory = "Tokens Per Minute (TPM)";
                                    } else if (unit.contains("/d") || unit.contains("/day") || metricName.contains("day")) {
                                        metricCategory = "Requests Per Day (RPD)";
                                    } else {
                                        metricCategory = "Requests Per Minute (RPM)";
                                    }

                                    String title = metricCategory + (model != null && !model.isBlank() ? " [" + model + "]" : "");

                                    modelQuotas.add(new GoogleAiUsageDto.QuotaLimitInfo(
                                            title,
                                            metricName,
                                            effectiveLimit,
                                            unit,
                                            period,
                                            null, // Quota API provides limits; usage is separate
                                            effectiveLimit != null ? "AVAILABLE" : "UNAVAILABLE",
                                            dimensions
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        } else if (!quotaInfos.isEmpty()) {
            // Parser Path 2: Cloud Quotas API quotaInfos
            for (Object qiObj : quotaInfos) {
                if (qiObj instanceof Map<?, ?> qiMapRaw) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> qiMap = (Map<String, Object>) qiMapRaw;
                    String metric = SimpleJson.getString(qiMap, "metric", "");
                    String displayName = SimpleJson.getString(qiMap, "quotaDisplayName", "");
                    List<Object> dimsInfos = SimpleJson.getList(qiMap, "dimensionsInfos");

                    for (Object diObj : dimsInfos) {
                        if (diObj instanceof Map<?, ?> diMapRaw) {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> diMap = (Map<String, Object>) diMapRaw;
                            Map<String, Object> rawDims = SimpleJson.getMap(diMap, "dimensions");
                            Map<String, String> dimensions = new LinkedHashMap<>();
                            for (Map.Entry<String, Object> e : rawDims.entrySet()) {
                                if (e.getValue() != null) dimensions.put(e.getKey(), e.getValue().toString());
                            }

                            Map<String, Object> details = SimpleJson.getMap(diMap, "details");
                            Long val = SimpleJson.getLong(details, "value", null);

                            String model = dimensions.get("model");
                            String title = displayName + (model != null ? " [" + model + "]" : "");

                            modelQuotas.add(new GoogleAiUsageDto.QuotaLimitInfo(
                                    title,
                                    metric,
                                    val,
                                    "1/min",
                                    "1m",
                                    null,
                                    val != null ? "AVAILABLE" : "UNAVAILABLE",
                                    dimensions
                            ));
                        }
                    }
                }
            }
        }

        if (modelQuotas.isEmpty()) {
            return unconfiguredQuota("NO_DATA");
        }

        // Distinct dimension matching for primary RPM, TPM, RPD without model collisions
        GoogleAiUsageDto.QuotaLimitInfo rpmPrimary = findRepresentativeQuota(modelQuotas, "RPM", "rpm", "1/min", "1m");
        GoogleAiUsageDto.QuotaLimitInfo tpmPrimary = findRepresentativeQuota(modelQuotas, "TPM", "tpm", "tokens/min", "1m");
        GoogleAiUsageDto.QuotaLimitInfo rpdPrimary = findRepresentativeQuota(modelQuotas, "RPD", "rpd", "1/day", "1d");

        return new GoogleAiUsageDto.QuotaMetrics(
                rpmPrimary,
                tpmPrimary,
                rpdPrimary,
                modelQuotas,
                0L,
                "Google Cloud Service Usage API",
                "AVAILABLE"
        );
    }

    private GoogleAiUsageDto.QuotaLimitInfo findRepresentativeQuota(
            List<GoogleAiUsageDto.QuotaLimitInfo> quotas,
            String category,
            String key,
            String defaultUnit,
            String defaultPeriod
    ) {
        // First priority: general/global quota without specific model constraint
        for (GoogleAiUsageDto.QuotaLimitInfo q : quotas) {
            if (q.name().contains(category) && (q.dimensions().isEmpty() || !q.dimensions().containsKey("model"))) {
                return q;
            }
        }
        // Second priority: popular models (flash before pro)
        for (GoogleAiUsageDto.QuotaLimitInfo q : quotas) {
            if (q.name().contains(category) && q.name().contains("flash")) {
                return q;
            }
        }
        // Third priority: any quota in category
        for (GoogleAiUsageDto.QuotaLimitInfo q : quotas) {
            if (q.name().contains(category)) {
                return q;
            }
        }

        return new GoogleAiUsageDto.QuotaLimitInfo(
                category,
                key,
                null,
                defaultUnit,
                defaultPeriod,
                null,
                "UNAVAILABLE",
                Collections.emptyMap()
        );
    }

    private GoogleAiUsageDto.QuotaMetrics unconfiguredQuota(String status) {
        GoogleAiUsageDto.QuotaLimitInfo unavailable = new GoogleAiUsageDto.QuotaLimitInfo(
                "—", "—", null, "—", "—", null, status, Collections.emptyMap()
        );
        return new GoogleAiUsageDto.QuotaMetrics(
                unavailable,
                unavailable,
                unavailable,
                Collections.emptyList(),
                0L,
                "Google Cloud Quotas API",
                status
        );
    }
}
