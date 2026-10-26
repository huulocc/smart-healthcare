package com.example.healthcare.backend.admin.ai;

import java.math.BigDecimal;
import java.time.Instant;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "ai_usage_events")
@Getter
@Setter
@NoArgsConstructor
public class AiUsageEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_id", nullable = false, unique = true, length = 64)
    private String requestId;

    @CreationTimestamp
    @Column(name = "timestamp", nullable = false)
    private Instant timestamp;

    @Column(nullable = false, length = 50)
    private String provider; // GOOGLE, OLLAMA, OPENAI

    @Column(nullable = false, length = 50)
    private String model;

    @Column(name = "prompt_tokens", nullable = false)
    private int promptTokens = 0;

    @Column(name = "completion_tokens", nullable = false)
    private int completionTokens = 0;

    @Column(name = "total_tokens", nullable = false)
    private int totalTokens = 0;

    @Column(name = "latency_ms", nullable = false)
    private long latencyMs = 0;

    @Column(name = "estimated_cost", nullable = false, precision = 12, scale = 6)
    private BigDecimal estimatedCost = BigDecimal.ZERO;

    @Column(name = "is_cost_estimated", nullable = false)
    private boolean isCostEstimated = true;

    @Column(nullable = false, length = 20)
    private String status; // SUCCESS, FAILED, REFUSED, TIMEOUT

    @Column(name = "error_code", length = 50)
    private String errorCode;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @Column(name = "feature", nullable = false, length = 50)
    private String feature = "CHAT";
}
