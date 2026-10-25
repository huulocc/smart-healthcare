package com.example.healthcare.backend.admin.ai;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import lombok.Getter;
import lombok.Setter;

@Component
@ConfigurationProperties(prefix = "google.cloud")
@Getter
@Setter
public class GoogleCloudProperties {

    /** Google Cloud Project ID (e.g., "my-healthcare-app-2026"). */
    private String projectId = "";

    /** File path to Google Cloud Service Account JSON credentials. */
    private String credentialsPath = "";

    /** Directly supplied OAuth2 access token (optional, useful for testing or ephemeral environments). */
    private String oauthAccessToken = "";

    /** Project ID hosting BigQuery billing exports (if different from app project). */
    private String billingProjectId = "";

    /** BigQuery dataset name containing exported Google Cloud billing records. */
    private String billingDataset = "";

    /** BigQuery table name containing exported Google Cloud billing records. */
    private String billingTable = "";

    /** In-memory cache TTL in seconds for Google Cloud API responses to prevent rate limiting. */
    private int cacheTtlSeconds = 120;

    /** Base URL for Google Cloud Monitoring API (default: https://monitoring.googleapis.com). */
    private String apiBaseUrl = "https://monitoring.googleapis.com";

    /** Base URL for Google Cloud Quotas API (default: https://cloudquotas.googleapis.com). */
    private String quotaBaseUrl = "https://cloudquotas.googleapis.com";

    /** Base URL for Google OAuth2 Token exchange (default: https://oauth2.googleapis.com/token). */
    private String oauthTokenUrl = "https://oauth2.googleapis.com/token";

    public boolean isConfigured() {
        return projectId != null && !projectId.trim().isEmpty();
    }

    public boolean hasServiceAccountCredentials() {
        return credentialsPath != null && !credentialsPath.trim().isEmpty();
    }

    public boolean hasDirectAccessToken() {
        return oauthAccessToken != null && !oauthAccessToken.trim().isEmpty();
    }

    public boolean isBillingConfigured() {
        return billingDataset != null && !billingDataset.trim().isEmpty()
                && billingTable != null && !billingTable.trim().isEmpty();
    }
}
