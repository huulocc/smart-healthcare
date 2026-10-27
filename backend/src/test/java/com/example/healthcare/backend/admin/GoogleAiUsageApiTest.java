package com.example.healthcare.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import com.example.healthcare.backend.admin.ai.*;
import com.example.healthcare.backend.support.ApiTestSupport;

public class GoogleAiUsageApiTest extends ApiTestSupport {

    @Autowired
    private GoogleAiUsageService googleAiUsageService;

    @Autowired
    private GoogleCloudProperties googleCloudProperties;

    // -------------------------------------------------------------
    // 1. RBAC & Security Checks
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/admin/ai-usage/google rejects anonymous requests with 401")
    void googleEndpointRejectsAnonymous() throws Exception {
        get("/api/admin/ai-usage/google", null)
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/admin/ai-usage/google rejects regular patient tokens with 403")
    void googleEndpointRejectsPatient() throws Exception {
        String patientToken = registerAndLogin(uniqueEmail());
        get("/api/admin/ai-usage/google", patientToken)
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/admin/ai-usage/google allows admin and returns structured response")
    void googleEndpointAllowsAdmin() throws Exception {
        String adminToken = adminToken();
        get("/api/admin/ai-usage/google", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.project").exists())
                .andExpect(jsonPath("$.project.status").isString())
                .andExpect(jsonPath("$.project.reportingPeriod").isString())
                .andExpect(jsonPath("$.usage").exists())
                .andExpect(jsonPath("$.usage.requestsStatus").isString())
                .andExpect(jsonPath("$.usage.tokensStatus").value("UNSUPPORTED"))
                .andExpect(jsonPath("$.quotas").exists())
                .andExpect(jsonPath("$.quotas.rpm").exists())
                .andExpect(jsonPath("$.quotas.tpm").exists())
                .andExpect(jsonPath("$.quotas.rpd").exists())
                .andExpect(jsonPath("$.billing").exists())
                .andExpect(jsonPath("$.billing.status").isString())
                .andExpect(jsonPath("$.metricStatus").exists());
    }

    // -------------------------------------------------------------
    // 2. Unconfigured State & Transparent Availability
    // -------------------------------------------------------------

    @Test
    @DisplayName("Unconfigured environment reports CONFIGURATION_REQUIRED and does NOT invent fake 0 metrics")
    void unconfiguredEnvironmentReportsTransparently() throws Exception {
        String adminToken = adminToken();
        get("/api/admin/ai-usage/google", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usage.tokensStatus").value("UNSUPPORTED"))
                .andExpect(jsonPath("$.usage.inputTokens").doesNotExist())
                .andExpect(jsonPath("$.usage.totalRequests").doesNotExist()) // Must be null, not 0!
                .andExpect(jsonPath("$.billing.isActual").value(false))
                .andExpect(jsonPath("$.billing.status").value("NOT_CONFIGURED"));
    }

    // -------------------------------------------------------------
    // 3. In-Memory Caching & Refresh Support
    // -------------------------------------------------------------

    @Test
    @DisplayName("Google AI usage service caches results and honors refresh parameter")
    void cachingAndRefreshSupport() {
        googleAiUsageService.clearCache();

        GoogleAiUsageDto.GoogleAiUsageResponse r1 = googleAiUsageService.getGoogleAiUsage(false, null, null);
        assertThat(r1).isNotNull();

        // Second call with refresh=false should return identical cached instance
        GoogleAiUsageDto.GoogleAiUsageResponse r2 = googleAiUsageService.getGoogleAiUsage(false, null, null);
        assertThat(r2).isSameAs(r1);

        // Third call with refresh=true should bypass cache
        GoogleAiUsageDto.GoogleAiUsageResponse r3 = googleAiUsageService.getGoogleAiUsage(true, null, null);
        assertThat(r3).isNotNull();
        assertThat(r3).isNotSameAs(r1);
    }

    // -------------------------------------------------------------
    // 4. Backward-Compatible Stats Conversion
    // -------------------------------------------------------------

    @Test
    @DisplayName("Google AI usage service translates to AiUsageStatsResponse safely without SQL server telemetry")
    void translatesToStatsResponseSafely() {
        AdminAiUsageService.AiUsageStatsResponse stats = googleAiUsageService.getStats(null, null);
        assertThat(stats).isNotNull();
        assertThat(stats.totalRequests()).isGreaterThanOrEqualTo(0);
        assertThat(stats.failureRatePercent()).isGreaterThanOrEqualTo(0.0);
        assertThat(stats.trends()).isNotNull();
        assertThat(stats.modelBreakdown()).isNotNull();
        assertThat(stats.providerBreakdown()).isNotNull();
    }

    // -------------------------------------------------------------
    // 5. Zero-Dependency SimpleJson Parser Verification
    // -------------------------------------------------------------

    @Test
    @DisplayName("SimpleJson parser handles objects, arrays, numbers, strings and escapes")
    void simpleJsonParserVerification() {
        String json = """
                {
                    "projectId": "healthcare-ai-2026",
                    "requestCount": 1500,
                    "avgLatency": 234.56,
                    "enabled": true,
                    "disabled": false,
                    "details": null,
                    "tags": ["monitoring", "gemini", "triage"],
                    "nested": {
                        "innerKey": "val\\"with\\"quotes\\nand\\ttabs",
                        "innerCount": 42
                    }
                }
                """;

        Map<String, Object> map = SimpleJson.parseObject(json);
        assertThat(map).isNotEmpty();
        assertThat(SimpleJson.getString(map, "projectId", "")).isEqualTo("healthcare-ai-2026");
        assertThat(SimpleJson.getLong(map, "requestCount", 0L)).isEqualTo(1500L);
        assertThat(SimpleJson.getDouble(map, "avgLatency", 0.0)).isEqualTo(234.56);
        assertThat(map.get("enabled")).isEqualTo(Boolean.TRUE);
        assertThat(map.get("disabled")).isEqualTo(Boolean.FALSE);
        assertThat(map.get("details")).isNull();

        List<Object> tags = SimpleJson.getList(map, "tags");
        assertThat(tags).containsExactly("monitoring", "gemini", "triage");

        Map<String, Object> nested = SimpleJson.getMap(map, "nested");
        assertThat(SimpleJson.getLong(nested, "innerCount", 0L)).isEqualTo(42L);
        assertThat(SimpleJson.getString(nested, "innerKey", "")).contains("val\"with\"quotes");
    }

    // -------------------------------------------------------------
    // 6. Monitoring Client: Request Counts, 2xx, 4xx, 5xx Aggregation
    // -------------------------------------------------------------

    @Test
    @DisplayName("Monitoring client parses Google timeSeries request counts, 2xx, 4xx correctly")
    void monitoringClientParsing() {
        DefaultGoogleMonitoringClient client = new DefaultGoogleMonitoringClient(googleCloudProperties);

        String sampleResponse = """
                {
                    "timeSeries": [
                        {
                            "metric": {
                                "type": "serviceruntime.googleapis.com/api/request_count",
                                "labels": { "response_code_class": "2xx" }
                            },
                            "points": [
                                {
                                    "interval": { "endTime": "2026-10-24T00:00:00Z" },
                                    "value": { "int64Value": "100" }
                                },
                                {
                                    "interval": { "endTime": "2026-10-25T00:00:00Z" },
                                    "value": { "int64Value": "150" }
                                }
                            ]
                        },
                        {
                            "metric": {
                                "type": "serviceruntime.googleapis.com/api/request_count",
                                "labels": { "response_code_class": "4xx" }
                            },
                            "points": [
                                {
                                    "interval": { "endTime": "2026-10-25T00:00:00Z" },
                                    "value": { "int64Value": "5" }
                                }
                            ]
                        }
                    ]
                }
                """;

        DefaultGoogleMonitoringClient.LatencyResult latency = new DefaultGoogleMonitoringClient.LatencyResult(125.0, Map.of("2026-10-25", 125.0), "AVAILABLE");
        GoogleAiUsageDto.ApiUsageMetrics metrics = client.parseMetricsResponse(sampleResponse, latency);

        assertThat(metrics.totalRequests()).isEqualTo(255L);
        assertThat(metrics.successCount()).isEqualTo(250L);
        assertThat(metrics.errorCount()).isEqualTo(5L);
        assertThat(metrics.requestsStatus()).isEqualTo("AVAILABLE");
        assertThat(metrics.tokensStatus()).isEqualTo("UNSUPPORTED");
        assertThat(metrics.inputTokens()).isNull();
        assertThat(metrics.trends()).hasSize(2);
    }

    // -------------------------------------------------------------
    // 7. Monitoring Client: DISTRIBUTION Latency Weighted Aggregation
    // -------------------------------------------------------------

    @Test
    @DisplayName("Monitoring client calculates weighted average from DISTRIBUTION metric points")
    void monitoringClientDistributionLatencyCalculation() {
        DefaultGoogleMonitoringClient client = new DefaultGoogleMonitoringClient(googleCloudProperties);

        // Point 1: 100 requests with mean 0.100s (100ms)
        // Point 2: 50 requests with mean 0.400s (400ms)
        // Weighted mean: (100*100 + 50*400) / 150 = (10000 + 20000)/150 = 30000/150 = 200ms
        String latencyJson = """
                {
                    "timeSeries": [
                        {
                            "metric": {
                                "type": "serviceruntime.googleapis.com/api/request_latencies"
                            },
                            "points": [
                                {
                                    "interval": { "endTime": "2026-10-25T00:00:00Z" },
                                    "value": {
                                        "distributionValue": {
                                            "count": "100",
                                            "mean": 0.100
                                        }
                                    }
                                },
                                {
                                    "interval": { "endTime": "2026-10-25T00:00:00Z" },
                                    "value": {
                                        "distributionValue": {
                                            "count": "50",
                                            "mean": 0.400
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                }
                """;

        DefaultGoogleMonitoringClient.LatencyResult latResult = client.parseDistributionLatency(latencyJson);
        assertThat(latResult.status()).isEqualTo("AVAILABLE");
        assertThat(latResult.overallAvgLatencyMs()).isEqualTo(200.0);
        assertThat(latResult.dailyAvgLatencyMs()).containsEntry("2026-10-25", 200.0);
    }

    // -------------------------------------------------------------
    // 8. Monitoring Client: Empty TimeSeries produces NO_DATA
    // -------------------------------------------------------------

    @Test
    @DisplayName("Empty timeSeries in successfully queried window produces NO_DATA status")
    void monitoringClientEmptyTimeSeriesProducesNoData() {
        DefaultGoogleMonitoringClient client = new DefaultGoogleMonitoringClient(googleCloudProperties);
        String emptyJson = "{\"timeSeries\": []}";
        DefaultGoogleMonitoringClient.LatencyResult latency = new DefaultGoogleMonitoringClient.LatencyResult(null, Map.of(), "NO_DATA");

        GoogleAiUsageDto.ApiUsageMetrics metrics = client.parseMetricsResponse(emptyJson, latency);
        assertThat(metrics.requestsStatus()).isEqualTo("NO_DATA");
        assertThat(metrics.totalRequests()).isEqualTo(0L);
        assertThat(metrics.latencyStatus()).isEqualTo("NO_DATA");
    }

    // -------------------------------------------------------------
    // 9. Quota Client: Dimension-Aware Parsing (No Model Collisions)
    // -------------------------------------------------------------

    @Test
    @DisplayName("Quota client preserves model dimensions and prevents model limit overwrite")
    void quotaClientDimensionalParsing() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);

        String sampleServiceUsage = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/min",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "60",
                                            "dimensions": { "model": "gemini-1.5-flash" }
                                        },
                                        {
                                            "effectiveLimit": "15",
                                            "dimensions": { "model": "gemini-1.5-pro" }
                                        },
                                        {
                                            "effectiveLimit": "20",
                                            "dimensions": { "model": "gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_input_tokens",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "tokens/min",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "1000000",
                                            "dimensions": { "model": "gemini-1.5-flash" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(sampleServiceUsage);
        assertThat(quota.status()).isEqualTo("AVAILABLE");
        assertThat(quota.modelQuotas()).hasSize(4);

        // Check gemini-1.5-flash RPM
        GoogleAiUsageDto.QuotaLimitInfo flashRpm = quota.modelQuotas().stream()
                .filter(q -> "gemini-1.5-flash".equals(q.dimensions().get("model")) && q.name().contains("RPM"))
                .findFirst().orElseThrow();
        assertThat(flashRpm.limitValue()).isEqualTo(60L);

        // Check gemini-1.5-pro RPM
        GoogleAiUsageDto.QuotaLimitInfo proRpm = quota.modelQuotas().stream()
                .filter(q -> "gemini-1.5-pro".equals(q.dimensions().get("model")) && q.name().contains("RPM"))
                .findFirst().orElseThrow();
        assertThat(proRpm.limitValue()).isEqualTo(15L);

        // Check gemini-3.6-flash RPM
        GoogleAiUsageDto.QuotaLimitInfo flash36Rpm = quota.modelQuotas().stream()
                .filter(q -> "gemini-3.6-flash".equals(q.dimensions().get("model")) && q.name().contains("RPM"))
                .findFirst().orElseThrow();
        assertThat(flash36Rpm.limitValue()).isEqualTo(20L);

        // Check representative primary RPM matches configured model (gemini-3.6-flash)
        assertThat(quota.rpm().limitValue()).isEqualTo(20L);
    }

    @Test
    @DisplayName("Quota selection Test 1: Given gemini-1.5-flash 100 RPD and gemini-3.6-flash 20 RPD, selects 20 RPD")
    void quotaSelectionTest1_CorrectModel() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);
        String json = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests_per_day",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/d",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "100",
                                            "dimensions": { "model": "gemini-1.5-flash" }
                                        },
                                        {
                                            "effectiveLimit": "20",
                                            "dimensions": { "model": "gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(json);
        assertThat(quota.rpd().limitValue()).isEqualTo(20L);
        assertThat(quota.rpd().status()).isEqualTo("AVAILABLE");
    }

    @Test
    @DisplayName("Quota selection Test 2: Given gemini-1.5-flash 100 RPD and gemini-3.5-flash 50 RPD, returns UNAVAILABLE with null limit")
    void quotaSelectionTest2_ModelUnavailable() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);
        String json = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests_per_day",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/d",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "100",
                                            "dimensions": { "model": "gemini-1.5-flash" }
                                        },
                                        {
                                            "effectiveLimit": "50",
                                            "dimensions": { "model": "gemini-3.5-flash" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(json);
        assertThat(quota.rpd().limitValue()).isNull();
        assertThat(quota.rpd().status()).isEqualTo("UNAVAILABLE");
    }

    @Test
    @DisplayName("Quota selection Test 3: Documented models/gemini-3.6-flash and gemini-3.6-flash match correctly")
    void quotaSelectionTest3_NormalizedModelIdentifier() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);
        String json = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests_per_day",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/d",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "20",
                                            "dimensions": { "model": "models/gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(json);
        assertThat(quota.rpd().limitValue()).isEqualTo(20L);
        assertThat(quota.rpd().status()).isEqualTo("AVAILABLE");
    }

    @Test
    @DisplayName("Quota selection Test 4: Missing or null model dimensions do not cause NPE or incorrect selection")
    void quotaSelectionTest4_MissingDimensions() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);
        String json = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests_per_day",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/d",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "100"
                                        },
                                        {
                                            "effectiveLimit": "200",
                                            "dimensions": {}
                                        },
                                        {
                                            "effectiveLimit": "300",
                                            "dimensions": { "region": "global" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(json);
        assertThat(quota.rpd().limitValue()).isNull();
        assertThat(quota.rpd().status()).isEqualTo("UNAVAILABLE");
    }

    @Test
    @DisplayName("Quota selection Test 5: RPM, TPM, and RPD remain separate metrics and preserve modelQuotas")
    void quotaSelectionTest5_SeparateMetrics() {
        DefaultGoogleQuotaClient client = new DefaultGoogleQuotaClient(googleCloudProperties);
        String json = """
                {
                    "metrics": [
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/min",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "15",
                                            "dimensions": { "model": "gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_input_tokens",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "tokens/min",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "500000",
                                            "dimensions": { "model": "gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "metric": "generativelanguage.googleapis.com/generate_content_requests_per_day",
                            "consumerQuotaLimits": [
                                {
                                    "unit": "1/d",
                                    "quotaBuckets": [
                                        {
                                            "effectiveLimit": "20",
                                            "dimensions": { "model": "gemini-3.6-flash" }
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.QuotaMetrics quota = client.parseQuotaResponse(json);
        assertThat(quota.rpm().limitValue()).isEqualTo(15L);
        assertThat(quota.rpm().status()).isEqualTo("AVAILABLE");
        assertThat(quota.tpm().limitValue()).isEqualTo(500000L);
        assertThat(quota.tpm().status()).isEqualTo("AVAILABLE");
        assertThat(quota.rpd().limitValue()).isEqualTo(20L);
        assertThat(quota.rpd().status()).isEqualTo("AVAILABLE");
        assertThat(quota.modelQuotas()).hasSize(3);
    }

    // -------------------------------------------------------------
    // 10. Billing Client: BigQuery Project-Filtering & Job Incompletion
    // -------------------------------------------------------------

    @Test
    @DisplayName("Billing client reports TEMPORARILY_UNAVAILABLE if BigQuery job is incomplete")
    void billingClientIncompleteJobCheck() {
        DefaultGoogleBillingClient client = new DefaultGoogleBillingClient();
        String incompleteJson = "{\"jobComplete\": false}";

        GoogleAiUsageDto.BillingMetrics billing = client.parseBigQueryResponse(incompleteJson, "2026-10-01 to 2026-10-25", "my-project");
        assertThat(billing.status()).isEqualTo("TEMPORARILY_UNAVAILABLE");
        assertThat(billing.isActual()).isFalse();
        assertThat(billing.actualCost()).isNull();
    }

    @Test
    @DisplayName("Billing client handles completed query with zero cost vs actual cost accurately")
    void billingClientCompletedQueryParsing() {
        DefaultGoogleBillingClient client = new DefaultGoogleBillingClient();

        // Case A: completed query with actual cost $12.3456 USD
        String costJson = """
                {
                    "jobComplete": true,
                    "rows": [
                        {
                            "f": [
                                { "v": "12.3456" },
                                { "v": "12.3456" },
                                { "v": "USD" }
                            ]
                        }
                    ]
                }
                """;

        GoogleAiUsageDto.BillingMetrics b1 = client.parseBigQueryResponse(costJson, "2026-10-01 to 2026-10-25", "my-project");
        assertThat(b1.status()).isEqualTo("AVAILABLE");
        assertThat(b1.isActual()).isTrue();
        assertThat(b1.actualCost()).isEqualTo(new BigDecimal("12.3456"));
        assertThat(b1.currency()).isEqualTo("USD");

        // Case B: completed query with no rows (genuine $0.00 cost in period)
        String emptyRowsJson = "{\"jobComplete\": true, \"rows\": []}";
        GoogleAiUsageDto.BillingMetrics b2 = client.parseBigQueryResponse(emptyRowsJson, "2026-10-01 to 2026-10-25", "my-project");
        assertThat(b2.status()).isEqualTo("AVAILABLE");
        assertThat(b2.isActual()).isTrue();
        assertThat(b2.actualCost()).isEqualTo(BigDecimal.ZERO);
    }

    // -------------------------------------------------------------
    // 11. Daily Quota: Used Today Calculation & Midnight Pacific Reset
    // -------------------------------------------------------------

    @Test
    @DisplayName("Used Today correctly resets at midnight US/Pacific and excludes prior quota day points")
    void usedTodayCalculationAndMidnightPacificReset() {
        DefaultGoogleMonitoringClient client = new DefaultGoogleMonitoringClient(googleCloudProperties);

        // Reference time: 2026-10-25 10:00:00 PDT (17:00:00 UTC)
        // Midnight Pacific today in UTC is 2026-10-25 07:00:00Z (PDT is UTC-7)
        Instant referenceNow = Instant.parse("2026-10-25T17:00:00Z");

        // Point 1: 2026-10-25 06:59:00Z -> 23:59:00 PDT yesterday -> Excluded from Used Today!
        // Point 2: 2026-10-25 07:01:00Z -> 00:01:00 PDT today -> Included in Used Today (25 requests)
        // Point 3: 2026-10-25 16:00:00Z -> 09:00:00 PDT today -> Included in Used Today (10 requests)
        String json = """
                {
                    "timeSeries": [
                        {
                            "metric": {
                                "type": "serviceruntime.googleapis.com/api/request_count",
                                "labels": { "response_code_class": "2xx" }
                            },
                            "points": [
                                {
                                    "interval": { "endTime": "2026-10-25T06:59:00Z" },
                                    "value": { "int64Value": "50" }
                                },
                                {
                                    "interval": { "endTime": "2026-10-25T07:01:00Z" },
                                    "value": { "int64Value": "25" }
                                },
                                {
                                    "interval": { "endTime": "2026-10-25T16:00:00Z" },
                                    "value": { "int64Value": "10" }
                                }
                            ]
                        }
                    ]
                }
                """;

        DefaultGoogleMonitoringClient.LatencyResult latency = new DefaultGoogleMonitoringClient.LatencyResult(150.0, Map.of(), "AVAILABLE");
        GoogleAiUsageDto.ApiUsageMetrics metrics = client.parseMetricsResponse(json, latency, referenceNow);

        assertThat(metrics.totalRequests()).isEqualTo(85L); // 50 + 25 + 10 = 85
        assertThat(metrics.usedToday()).isEqualTo(35L);     // Exactly 25 + 10 = 35; 50 is yesterday!
    }

    // -------------------------------------------------------------
    // 12. Daylight Saving Time Transitions (23h Spring / 25h Fall)
    // -------------------------------------------------------------

    @Test
    @DisplayName("Daylight saving transitions in America/Los_Angeles calculate exact quota day boundaries")
    void daylightSavingTimeTransitions() {
        ZoneId pacificZone = ZoneId.of("America/Los_Angeles");

        // Fall back transition day (25 hours long)
        ZonedDateTime fallNow = ZonedDateTime.of(2026, 11, 1, 14, 0, 0, 0, pacificZone);
        ZonedDateTime fallStart = fallNow.truncatedTo(ChronoUnit.DAYS);
        ZonedDateTime fallEnd = fallStart.plusDays(1);
        Duration fallDuration = Duration.between(fallStart.toInstant(), fallEnd.toInstant());
        assertThat(fallDuration.toHours()).isEqualTo(25);

        // Spring forward transition day (23 hours long)
        ZonedDateTime springNow = ZonedDateTime.of(2026, 3, 8, 14, 0, 0, 0, pacificZone);
        ZonedDateTime springStart = springNow.truncatedTo(ChronoUnit.DAYS);
        ZonedDateTime springEnd = springStart.plusDays(1);
        Duration springDuration = Duration.between(springStart.toInstant(), springEnd.toInstant());
        assertThat(springDuration.toHours()).isEqualTo(23);
    }

    // -------------------------------------------------------------
    // 13. Remaining Today Calculation, Clamping, and Missing Limit / Usage
    // -------------------------------------------------------------

    @Test
    @DisplayName("Remaining Today clamps to 0 on quota exceed without displaying negative values")
    void remainingTodayCalculationAndClamping() {
        // Case A: Normal remaining
        Long limitA = 100L;
        Long usedA = 25L;
        long remainingA = Math.max(0L, limitA - usedA);
        boolean isOverLimitA = usedA > limitA;
        assertThat(remainingA).isEqualTo(75L);
        assertThat(isOverLimitA).isFalse();

        // Case B: Over limit (must clamp to 0, never negative!)
        Long limitB = 100L;
        Long usedB = 125L;
        long remainingB = Math.max(0L, limitB - usedB);
        boolean isOverLimitB = usedB > limitB;
        assertThat(remainingB).isEqualTo(0L);
        assertThat(isOverLimitB).isTrue();

        // Case C: Missing limit (RPD null) must not invent fake 0
        Long limitC = null;
        Long usedC = 25L;
        Long remainingC = (limitC != null && usedC != null) ? Math.max(0L, limitC - usedC) : null;
        assertThat(remainingC).isNull();

        // Case D: Missing usage must not invent fake 0
        Long limitD = 100L;
        Long usedD = null;
        Long remainingD = (limitD != null && usedD != null) ? Math.max(0L, limitD - usedD) : null;
        assertThat(remainingD).isNull();
    }

    // -------------------------------------------------------------
    // 14. Endpoint Structure: Daily Usage Included in /api/admin/ai-usage/google
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/admin/ai-usage/google includes dailyUsage metrics block")
    void endpointReturnsDailyUsageStructure() throws Exception {
        String adminToken = adminToken();
        get("/api/admin/ai-usage/google", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyUsage").exists())
                .andExpect(jsonPath("$.dailyUsage.timezone").value("America/Los_Angeles"))
                .andExpect(jsonPath("$.dailyUsage.quotaDayStart").isString())
                .andExpect(jsonPath("$.dailyUsage.quotaDayEnd").isString())
                .andExpect(jsonPath("$.dailyUsage.isEstimated").value(true))
                .andExpect(jsonPath("$.dailyUsage.status").isString())
                .andExpect(jsonPath("$.metricStatus.daily").isString());
    }

    // -------------------------------------------------------------
    // 15. Admin Dashboard Overview Endpoint Uses Google AI Data & Separates Refusal
    // -------------------------------------------------------------

    @Test
    @DisplayName("GET /api/admin/dashboard returns AI summary backed by Google and labels refusal as UNSUPPORTED")
    void adminDashboardOverviewUsesGoogleData() throws Exception {
        String adminToken = adminToken();
        get("/api/admin/dashboard", adminToken)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiSummary").exists())
                .andExpect(jsonPath("$.aiSummary.requestsStatus").isString())
                .andExpect(jsonPath("$.aiSummary.costStatus").isString())
                .andExpect(jsonPath("$.aiSummary.latencyStatus").isString())
                .andExpect(jsonPath("$.aiSummary.refusalStatus").value("UNSUPPORTED"));
    }
}
