package com.example.healthcare.backend.admin.ai;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.*;

import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

@Component
@Slf4j
public class DefaultGoogleBillingClient implements GoogleBillingClient {

    private final HttpClient httpClient;
    private static final DateTimeFormatter DF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @org.springframework.beans.factory.annotation.Autowired
    public DefaultGoogleBillingClient() {
        this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(6)).build());
    }

    public DefaultGoogleBillingClient(HttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public GoogleAiUsageDto.BillingMetrics fetchBillingMetrics(
            GoogleCloudProperties properties,
            Instant from,
            Instant to,
            Optional<String> accessToken
    ) {
        Instant endTime = to != null ? to : Instant.now();
        Instant startTime = from != null ? from : endTime.minus(Duration.ofDays(30));
        String periodStr = startTime.atZone(ZoneOffset.UTC).format(DF) + " to " + endTime.atZone(ZoneOffset.UTC).format(DF);

        if (!properties.isBillingConfigured()) {
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    null,
                    false,
                    "NOT_CONFIGURED",
                    "BigQuery billing export dataset is not configured in application properties (google.cloud.billing-dataset)",
                    null
            );
        }

        if (accessToken.isEmpty() || accessToken.get().trim().isEmpty()) {
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    null,
                    false,
                    "CREDENTIALS_MISSING",
                    "Google Cloud credentials missing for BigQuery billing export query",
                    null
            );
        }

        String targetProjectId = properties.getProjectId() != null ? properties.getProjectId().trim() : "";
        String billingQueryProject = (properties.getBillingProjectId() != null && !properties.getBillingProjectId().isBlank())
                ? properties.getBillingProjectId().trim()
                : targetProjectId;

        String tableFqn = billingQueryProject + "." + properties.getBillingDataset().trim() + "." + properties.getBillingTable().trim();

        try {
            // Safe parameterized query filtering by intended project ID and service description
            String sql = "SELECT SUM(cost) AS total_cost, " +
                    "SUM(cost) + IFNULL(SUM((SELECT SUM(c.amount) FROM UNNEST(credits) c)), 0) AS net_cost, " +
                    "MAX(currency) AS currency " +
                    "FROM `" + tableFqn + "` " +
                    "WHERE (project.id = @projectId OR project.id IS NULL) " +
                    "AND (service.description = 'Generative Language API' OR service.id = 'generativelanguage.googleapis.com') " +
                    "AND usage_start_time >= TIMESTAMP(@startTime) " +
                    "AND usage_end_time <= TIMESTAMP(@endTime)";

            String requestBody = buildBigQueryRequestBody(sql, targetProjectId, startTime.toString(), endTime.toString());

            String url = "https://bigquery.googleapis.com/bigquery/v2/projects/" + billingQueryProject + "/queries";

            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", "Bearer " + accessToken.get())
                    .header("Content-Type", "application/json")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());

            if (resp.statusCode() == 401 || resp.statusCode() == 403) {
                log.warn("BigQuery billing query permission denied (HTTP {}): {}", resp.statusCode(), resp.body());
                return new GoogleAiUsageDto.BillingMetrics(
                        null,
                        "USD",
                        periodStr,
                        billingQueryProject,
                        false,
                        "PERMISSION_DENIED",
                        "BigQuery billing export query permission denied (HTTP " + resp.statusCode() + "). Ensure roles/bigquery.dataViewer and roles/bigquery.jobUser are granted.",
                        null
                );
            }

            if (resp.statusCode() == 408 || resp.statusCode() == 504) {
                return new GoogleAiUsageDto.BillingMetrics(
                        null,
                        "USD",
                        periodStr,
                        billingQueryProject,
                        false,
                        "TEMPORARILY_UNAVAILABLE",
                        "BigQuery query timed out",
                        null
                );
            }

            if (resp.statusCode() != 200) {
                log.warn("BigQuery billing query failed (HTTP {}): {}", resp.statusCode(), resp.body());
                return new GoogleAiUsageDto.BillingMetrics(
                        null,
                        "USD",
                        periodStr,
                        billingQueryProject,
                        false,
                        "UNAVAILABLE",
                        "BigQuery billing query returned HTTP " + resp.statusCode(),
                        null
                );
            }

            return parseBigQueryResponse(resp.body(), periodStr, billingQueryProject);

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.error("BigQuery billing query interrupted: {}", e.getMessage());
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    billingQueryProject,
                    false,
                    "TEMPORARILY_UNAVAILABLE",
                    "BigQuery query interrupted",
                    null
            );
        } catch (Exception e) {
            log.error("Failed to query BigQuery billing export: {}", e.getMessage());
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    billingQueryProject,
                    false,
                    "UNAVAILABLE",
                    "BigQuery error: " + e.getMessage(),
                    null
            );
        }
    }

    public GoogleAiUsageDto.BillingMetrics parseBigQueryResponse(String responseJson, String periodStr, String billingProject) {
        Map<String, Object> root = SimpleJson.parseObject(responseJson);

        // Check job completion
        Object jobCompleteObj = root.get("jobComplete");
        if (Boolean.FALSE.equals(jobCompleteObj)) {
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    billingProject,
                    false,
                    "TEMPORARILY_UNAVAILABLE",
                    "BigQuery billing query job is still in progress",
                    null
            );
        }

        // Check for errorResult
        Map<String, Object> errorResult = SimpleJson.getMap(root, "errorResult");
        if (!errorResult.isEmpty()) {
            String errMessage = SimpleJson.getString(errorResult, "message", "Query execution error in BigQuery");
            return new GoogleAiUsageDto.BillingMetrics(
                    null,
                    "USD",
                    periodStr,
                    billingProject,
                    false,
                    "UNAVAILABLE",
                    "BigQuery execution error: " + errMessage,
                    null
            );
        }

        List<Object> rows = SimpleJson.getList(root, "rows");
        if (!rows.isEmpty() && rows.get(0) instanceof Map<?, ?> rowMapRaw) {
            @SuppressWarnings("unchecked")
            Map<String, Object> rowMap = (Map<String, Object>) rowMapRaw;
            List<Object> fList = SimpleJson.getList(rowMap, "f");
            if (!fList.isEmpty()) {
                Map<String, Object> costCell = fList.get(0) instanceof Map<?, ?> m1 ? (Map<String, Object>) m1 : Collections.emptyMap();
                String costStr = SimpleJson.getString(costCell, "v", null);

                String currencyStr = "USD";
                if (fList.size() >= 3) {
                    Map<String, Object> currCell = fList.get(2) instanceof Map<?, ?> m2 ? (Map<String, Object>) m2 : Collections.emptyMap();
                    currencyStr = SimpleJson.getString(currCell, "v", "USD");
                }

                if (costStr != null && !costStr.equalsIgnoreCase("null")) {
                    BigDecimal cost = new BigDecimal(costStr);
                    return new GoogleAiUsageDto.BillingMetrics(
                            cost,
                            currencyStr != null && !currencyStr.isBlank() ? currencyStr : "USD",
                            periodStr,
                            billingProject,
                            true,
                            "AVAILABLE",
                            "Actual billing metrics retrieved from BigQuery export",
                            Instant.now()
                    );
                }
            }
        }

        // Genuinely 0 records in period
        return new GoogleAiUsageDto.BillingMetrics(
                BigDecimal.ZERO,
                "USD",
                periodStr,
                billingProject,
                true,
                "AVAILABLE",
                "No billed charges recorded for project in this period",
                Instant.now()
        );
    }

    private String buildBigQueryRequestBody(String query, String projectId, String startTime, String endTime) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"query\":\"").append(escapeJson(query)).append("\",");
        sb.append("\"useLegacySql\":false,");
        sb.append("\"parameterMode\":\"NAMED\",");
        sb.append("\"queryParameters\":[");
        sb.append("{\"name\":\"projectId\",\"parameterType\":{\"type\":\"STRING\"},\"parameterValue\":{\"value\":\"").append(escapeJson(projectId)).append("\"}},");
        sb.append("{\"name\":\"startTime\",\"parameterType\":{\"type\":\"STRING\"},\"parameterValue\":{\"value\":\"").append(escapeJson(startTime)).append("\"}},");
        sb.append("{\"name\":\"endTime\",\"parameterType\":{\"type\":\"STRING\"},\"parameterValue\":{\"value\":\"").append(escapeJson(endTime)).append("\"}}");
        sb.append("]");
        sb.append("}");
        return sb.toString();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\b", "\\b")
                .replace("\f", "\\f")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
