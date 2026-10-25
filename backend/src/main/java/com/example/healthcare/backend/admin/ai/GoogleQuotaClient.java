package com.example.healthcare.backend.admin.ai;

import java.util.Optional;

/**
 * Client for retrieving Gemini API quota limits (RPM, TPM, RPD)
 * from Google Cloud Quotas API or Service Usage API.
 */
public interface GoogleQuotaClient {

    GoogleAiUsageDto.QuotaMetrics fetchQuotaMetrics(
            String projectId,
            Optional<String> accessToken
    );
}
