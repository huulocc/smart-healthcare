package com.example.healthcare.backend.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

import com.example.healthcare.backend.admin.ai.AiUsageEvent;
import com.example.healthcare.backend.admin.ai.AiUsageEventRepository;
import com.example.healthcare.backend.support.ApiTestSupport;

@TestPropertySource(properties = {
        "app.ai.telemetry-secret=test-secure-telemetry-secret-12345"
})
public class AiTelemetryApiTest extends ApiTestSupport {

    @Autowired
    private AiUsageEventRepository repository;

    private static final String TELEMETRY_SECRET = "test-secure-telemetry-secret-12345";

    @Test
    @DisplayName("Telemetry rejects requests with missing or invalid secret")
    void rejectsInvalidSecret() throws Exception {
        String payload = """
                {
                    "requestId": "REQ-TEST-UNAUTH-01",
                    "model": "gemini-1.5-flash",
                    "provider": "GOOGLE",
                    "promptTokens": 100,
                    "completionTokens": 50,
                    "latencyMs": 350,
                    "status": "SUCCESS"
                }
                """;

        // No secret header -> 401
        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload))
                .andExpect(status().isUnauthorized());

        // Wrong secret header -> 401
        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Telemetry-Secret", "wrong-secret")
                .content(payload))
                .andExpect(status().isUnauthorized());

        // Wrong bearer token -> 401
        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer wrong-bearer")
                .content(payload))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Telemetry accepts valid secret via X-Telemetry-Secret and Bearer token")
    void acceptsValidSecret() throws Exception {
        String reqId1 = "REQ-SEC-" + UUID.randomUUID().toString().substring(0, 8);
        String payload1 = """
                {
                    "requestId": "%s",
                    "feature": "CHAT",
                    "model": "gemini-1.5-flash",
                    "provider": "GOOGLE",
                    "promptTokens": 200,
                    "completionTokens": 100,
                    "latencyMs": 450,
                    "status": "SUCCESS"
                }
                """.formatted(reqId1);

        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Telemetry-Secret", TELEMETRY_SECRET)
                .content(payload1))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestId").value(reqId1))
                .andExpect(jsonPath("$.traceId").value(reqId1))
                .andExpect(jsonPath("$.feature").value("CHAT"))
                .andExpect(jsonPath("$.totalTokens").value(300))
                .andExpect(jsonPath("$.estimatedCostUsd").isNumber());

        String reqId2 = "REQ-SEC-" + UUID.randomUUID().toString().substring(0, 8);
        String payload2 = """
                {
                    "requestId": "%s",
                    "feature": "STREAM",
                    "model": "llama3:8b",
                    "provider": "OLLAMA",
                    "promptTokens": 150,
                    "completionTokens": 75,
                    "latencyMs": 1200,
                    "status": "SUCCESS"
                }
                """.formatted(reqId2);

        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + TELEMETRY_SECRET)
                .content(payload2))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestId").value(reqId2))
                .andExpect(jsonPath("$.feature").value("STREAM"))
                .andExpect(jsonPath("$.estimatedCost").value(0.0))
                .andExpect(jsonPath("$.isCostEstimated").value(false));
    }

    @Test
    @DisplayName("Telemetry ingestion is idempotent on duplicate requestId")
    void idempotentOnDuplicateRequestId() throws Exception {
        String dupId = "REQ-DUP-" + UUID.randomUUID().toString().substring(0, 8);
        String payload = """
                {
                    "requestId": "%s",
                    "feature": "TRIAGE",
                    "model": "gemini-1.5-flash",
                    "provider": "GOOGLE",
                    "promptTokens": 120,
                    "completionTokens": 60,
                    "latencyMs": 510,
                    "status": "SUCCESS"
                }
                """.formatted(dupId);

        // First call creates
        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Telemetry-Secret", TELEMETRY_SECRET)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestId").value(dupId));

        // Second call with duplicate requestId returns existing record without throwing error
        mockMvc.perform(post("/api/ai/telemetry")
                .contentType(MediaType.APPLICATION_JSON)
                .header("X-Telemetry-Secret", TELEMETRY_SECRET)
                .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.requestId").value(dupId));

        long count = repository.findAll().stream().filter(e -> dupId.equals(e.getRequestId())).count();
        assertThat(count).isEqualTo(1);
    }
}
