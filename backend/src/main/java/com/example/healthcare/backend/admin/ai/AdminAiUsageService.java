package com.example.healthcare.backend.admin.ai;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.PageResponse;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminAiUsageService {

    private final AiUsageEventRepository repository;
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    public record AiUsageEventDto(
            Long id,
            String requestId,
            String traceId,
            String feature,
            Instant timestamp,
            String provider,
            String model,
            int promptTokens,
            int completionTokens,
            int totalTokens,
            long latencyMs,
            BigDecimal estimatedCost,
            BigDecimal estimatedCostUsd,
            boolean isCostEstimated,
            String status,
            String errorCode,
            String errorType,
            String errorMessage
    ) {
        public static AiUsageEventDto from(AiUsageEvent e) {
            return new AiUsageEventDto(
                    e.getId(),
                    e.getRequestId(),
                    e.getRequestId(),
                    e.getFeature() != null ? e.getFeature() : "CHAT",
                    e.getTimestamp(),
                    e.getProvider(),
                    e.getModel(),
                    e.getPromptTokens(),
                    e.getCompletionTokens(),
                    e.getTotalTokens(),
                    e.getLatencyMs(),
                    e.getEstimatedCost(),
                    e.getEstimatedCost(),
                    e.isCostEstimated(),
                    e.getStatus(),
                    e.getErrorCode(),
                    e.getErrorCode(),
                    e.getErrorMessage()
            );
        }
    }

    public record TrendPoint(String date, long requests, double avgLatencyMs, BigDecimal cost) {}

    public record ModelStat(String model, long requests, BigDecimal cost, double avgLatencyMs, long tokens) {}

    public record ProviderStat(String provider, long requests, BigDecimal cost) {}

    public record ErrorStat(String errorCode, long count) {}

    public record AiUsageStatsResponse(
            long totalRequests,
            BigDecimal totalCost,
            BigDecimal actualReportedCost,
            BigDecimal estimatedCost,
            double avgLatencyMs,
            long successCount,
            long failedCount,
            long refusedCount,
            long timeoutCount,
            double failureRatePercent,
            double refusalRatePercent,
            long totalPromptTokens,
            long totalCompletionTokens,
            long totalTokens,
            double avgTokensPerRequest,
            List<TrendPoint> trends,
            List<ModelStat> modelBreakdown,
            List<ProviderStat> providerBreakdown,
            List<ErrorStat> errorBreakdown
    ) {}

    public record RecordTelemetryRequest(
            String requestId,
            String traceId,
            String feature,
            String provider,
            String model,
            Integer promptTokens,
            Integer completionTokens,
            Long latencyMs,
            String status,
            String errorCode,
            String errorType,
            String errorMessage
    ) {}

    @Transactional(readOnly = true)
    public PageResponse<AiUsageEventDto> listEvents(String status, Instant from, Instant to, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), 100));
        Page<AiUsageEvent> p;

        if (from != null && to != null) {
            p = repository.findByTimestampBetweenOrderByTimestampDesc(from, to, pageable);
        } else if (status != null && !status.isBlank()) {
            p = repository.findByStatusOrderByTimestampDesc(status.trim().toUpperCase(), pageable);
        } else {
            p = repository.findAllByOrderByTimestampDesc(pageable);
        }

        return PageResponse.from(p, AiUsageEventDto::from);
    }

    @Transactional(readOnly = true)
    public AiUsageStatsResponse getStats(Instant from, Instant to) {
        Instant startTime = from != null ? from : Instant.now().minus(30, ChronoUnit.DAYS);
        Instant endTime = to != null ? to : Instant.now();

        List<AiUsageEvent> events = repository.findByTimestampBetweenOrderByTimestampAsc(startTime, endTime);

        long totalRequests = events.size();
        BigDecimal totalCost = BigDecimal.ZERO;
        BigDecimal actualCost = BigDecimal.ZERO;
        BigDecimal estimatedCost = BigDecimal.ZERO;
        long totalLatency = 0;
        long successCount = 0;
        long failedCount = 0;
        long refusedCount = 0;
        long timeoutCount = 0;
        long totalPromptTokens = 0;
        long totalCompletionTokens = 0;
        long totalTokens = 0;

        Map<String, List<AiUsageEvent>> byDate = new LinkedHashMap<>();
        DateTimeFormatter df = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        for (AiUsageEvent e : events) {
            totalCost = totalCost.add(e.getEstimatedCost() != null ? e.getEstimatedCost() : BigDecimal.ZERO);
            if (!e.isCostEstimated()) {
                actualCost = actualCost.add(e.getEstimatedCost() != null ? e.getEstimatedCost() : BigDecimal.ZERO);
            } else {
                estimatedCost = estimatedCost.add(e.getEstimatedCost() != null ? e.getEstimatedCost() : BigDecimal.ZERO);
            }
            totalLatency += e.getLatencyMs();
            totalPromptTokens += e.getPromptTokens();
            totalCompletionTokens += e.getCompletionTokens();
            totalTokens += e.getTotalTokens();

            String status = e.getStatus() != null ? e.getStatus().toUpperCase() : "SUCCESS";
            switch (status) {
                case "SUCCESS" -> successCount++;
                case "FAILED" -> failedCount++;
                case "REFUSED" -> refusedCount++;
                case "TIMEOUT" -> timeoutCount++;
                default -> successCount++;
            }

            LocalDate ld = e.getTimestamp().atZone(VN_ZONE).toLocalDate();
            String dateStr = ld.format(df);
            byDate.computeIfAbsent(dateStr, k -> new ArrayList<>()).add(e);
        }

        double avgLatency = totalRequests > 0 ? (double) totalLatency / totalRequests : 0.0;
        double failureRate = totalRequests > 0 ? ((double) (failedCount + timeoutCount) / totalRequests) * 100.0 : 0.0;
        double refusalRate = totalRequests > 0 ? ((double) refusedCount / totalRequests) * 100.0 : 0.0;
        double avgTokens = totalRequests > 0 ? (double) totalTokens / totalRequests : 0.0;

        List<TrendPoint> trends = new ArrayList<>();
        for (Map.Entry<String, List<AiUsageEvent>> entry : byDate.entrySet()) {
            List<AiUsageEvent> dayEvents = entry.getValue();
            long dayReqs = dayEvents.size();
            long dayLatencySum = dayEvents.stream().mapToLong(AiUsageEvent::getLatencyMs).sum();
            BigDecimal dayCost = dayEvents.stream()
                    .map(AiUsageEvent::getEstimatedCost)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            trends.add(new TrendPoint(
                    entry.getKey(),
                    dayReqs,
                    dayReqs > 0 ? (double) dayLatencySum / dayReqs : 0.0,
                    dayCost
            ));
        }

        List<Object[]> rawModels = repository.statsByModelBetween(startTime, endTime);
        List<ModelStat> modelStats = new ArrayList<>();
        for (Object[] r : rawModels) {
            String model = (String) r[0];
            long count = ((Number) r[1]).longValue();
            BigDecimal cost = r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO;
            double lat = r[3] != null ? ((Number) r[3]).doubleValue() : 0.0;
            long tok = r[4] != null ? ((Number) r[4]).longValue() : 0;
            modelStats.add(new ModelStat(model, count, cost, lat, tok));
        }

        List<Object[]> rawProviders = repository.statsByProviderBetween(startTime, endTime);
        List<ProviderStat> providerStats = new ArrayList<>();
        for (Object[] r : rawProviders) {
            String prov = (String) r[0];
            long count = ((Number) r[1]).longValue();
            BigDecimal cost = r[2] != null ? (BigDecimal) r[2] : BigDecimal.ZERO;
            providerStats.add(new ProviderStat(prov, count, cost));
        }

        List<Object[]> rawErrors = repository.errorBreakdownBetween(startTime, endTime);
        List<ErrorStat> errorStats = new ArrayList<>();
        for (Object[] r : rawErrors) {
            String code = (String) r[0];
            long count = ((Number) r[1]).longValue();
            errorStats.add(new ErrorStat(code, count));
        }

        return new AiUsageStatsResponse(
                totalRequests,
                totalCost,
                actualCost,
                estimatedCost,
                Math.round(avgLatency * 10.0) / 10.0,
                successCount,
                failedCount,
                refusedCount,
                timeoutCount,
                Math.round(failureRate * 10.0) / 10.0,
                Math.round(refusalRate * 10.0) / 10.0,
                totalPromptTokens,
                totalCompletionTokens,
                totalTokens,
                Math.round(avgTokens * 10.0) / 10.0,
                trends,
                modelStats,
                providerStats,
                errorStats
        );
    }

    @Transactional
    public AiUsageEventDto recordEvent(RecordTelemetryRequest req) {
        if (req == null || req.model() == null || req.model().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Model is required");
        }

        String rawReqId = req.requestId() != null && !req.requestId().isBlank()
                ? req.requestId().trim()
                : (req.traceId() != null && !req.traceId().isBlank() ? req.traceId().trim() : null);

        if (rawReqId != null) {
            Optional<AiUsageEvent> existing = repository.findByRequestId(rawReqId);
            if (existing.isPresent()) {
                return AiUsageEventDto.from(existing.get());
            }
        }

        String reqId = rawReqId != null
                ? rawReqId
                : "REQ-AI-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();

        int pt = req.promptTokens() != null ? Math.max(0, req.promptTokens()) : 0;
        int ct = req.completionTokens() != null ? Math.max(0, req.completionTokens()) : 0;
        int tot = pt + ct;
        long lat = req.latencyMs() != null ? Math.max(0, req.latencyMs()) : 0;
        String provider = req.provider() != null && !req.provider().isBlank() ? req.provider().trim().toUpperCase() : "GOOGLE";
        String model = req.model().trim();

        // Calculate model-specific pricing per million tokens
        BigDecimal cost;
        boolean isEstimated = true;
        if ("OLLAMA".equalsIgnoreCase(provider)) {
            cost = BigDecimal.ZERO;
            isEstimated = false; // Local hosting is 0 API cost
        } else if (model.contains("gemini-2.5-pro") || model.contains("gemini-1.5-pro")) {
            // $1.25/M prompt, $5.00/M completion
            BigDecimal pCost = BigDecimal.valueOf(pt).multiply(BigDecimal.valueOf(1.25)).divide(BigDecimal.valueOf(1000000), 8, RoundingMode.HALF_UP);
            BigDecimal cCost = BigDecimal.valueOf(ct).multiply(BigDecimal.valueOf(5.00)).divide(BigDecimal.valueOf(1000000), 8, RoundingMode.HALF_UP);
            cost = pCost.add(cCost).setScale(6, RoundingMode.HALF_UP);
        } else if (model.contains("gemini-2.5-flash") || model.contains("gemini-1.5-flash")) {
            // $0.075/M prompt, $0.30/M completion
            BigDecimal pCost = BigDecimal.valueOf(pt).multiply(BigDecimal.valueOf(0.075)).divide(BigDecimal.valueOf(1000000), 8, RoundingMode.HALF_UP);
            BigDecimal cCost = BigDecimal.valueOf(ct).multiply(BigDecimal.valueOf(0.30)).divide(BigDecimal.valueOf(1000000), 8, RoundingMode.HALF_UP);
            cost = pCost.add(cCost).setScale(6, RoundingMode.HALF_UP);
        } else {
            // Default rate: $0.15 per million tokens
            cost = BigDecimal.valueOf(tot).multiply(BigDecimal.valueOf(0.15)).divide(BigDecimal.valueOf(1000000), 6, RoundingMode.HALF_UP);
        }

        String status = req.status() != null && !req.status().isBlank() ? req.status().trim().toUpperCase() : "SUCCESS";
        String feature = req.feature() != null && !req.feature().isBlank() ? req.feature().trim().toUpperCase() : "CHAT";
        String errCode = req.errorCode() != null && !req.errorCode().isBlank() ? req.errorCode().trim()
                : (req.errorType() != null && !req.errorType().isBlank() ? req.errorType().trim() : null);

        AiUsageEvent event = new AiUsageEvent();
        event.setRequestId(reqId);
        event.setTimestamp(Instant.now());
        event.setFeature(feature);
        event.setProvider(provider);
        event.setModel(model);
        event.setPromptTokens(pt);
        event.setCompletionTokens(ct);
        event.setTotalTokens(tot);
        event.setLatencyMs(lat);
        event.setEstimatedCost(cost);
        event.setCostEstimated(isEstimated);
        event.setStatus(status);
        event.setErrorCode(errCode);
        event.setErrorMessage(req.errorMessage());

        return AiUsageEventDto.from(repository.save(event));
    }
}
