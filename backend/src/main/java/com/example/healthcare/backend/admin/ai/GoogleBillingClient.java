package com.example.healthcare.backend.admin.ai;

import java.time.Instant;
import java.util.Optional;

/**
 * Client for retrieving billed cost metrics from Google Cloud.
 * Uses BigQuery Google Cloud Billing export dataset if configured,
 * or reports NOT_CONFIGURED transparently.
 */
public interface GoogleBillingClient {

    GoogleAiUsageDto.BillingMetrics fetchBillingMetrics(
            GoogleCloudProperties properties,
            Instant from,
            Instant to,
            Optional<String> accessToken
    );
}
