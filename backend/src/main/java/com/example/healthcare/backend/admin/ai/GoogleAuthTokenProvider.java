package com.example.healthcare.backend.admin.ai;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;

/**
 * Generates and caches Google Cloud OAuth2 Bearer access tokens
 * using Service Account JSON credentials (RFC 7523), Google Application Default Credentials (ADC),
 * or directly supplied tokens.
 */
@Component
@Slf4j
public class GoogleAuthTokenProvider {

    private final GoogleCloudProperties properties;
    private final HttpClient httpClient;

    private static final String GOOGLE_OAUTH_SCOPES = 
            "https://www.googleapis.com/auth/monitoring.read " +
            "https://www.googleapis.com/auth/cloud-platform.read-only " +
            "https://www.googleapis.com/auth/service.management.readonly";

    // In-memory token cache: token, expiresAt
    private volatile CachedToken cachedToken = null;

    public record CachedToken(String accessToken, Instant expiresAt) {
        public boolean isValid() {
            return accessToken != null && expiresAt != null && Instant.now().isBefore(expiresAt.minusSeconds(300));
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    public GoogleAuthTokenProvider(GoogleCloudProperties properties) {
        this(properties, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build());
    }

    public GoogleAuthTokenProvider(GoogleCloudProperties properties, HttpClient httpClient) {
        this.properties = properties;
        this.httpClient = httpClient;
    }

    public void clearCache() {
        this.cachedToken = null;
    }

    /**
     * Obtains an OAuth2 access token for Google Cloud APIs.
     * Returns Optional.empty() if credentials are not configured or invalid.
     */
    public synchronized Optional<String> getAccessToken() {
        // 1. Direct access token override (useful in tests or container environments)
        if (properties.hasDirectAccessToken()) {
            return Optional.of(properties.getOauthAccessToken().trim());
        }

        // 2. Return cached token if still fresh
        if (cachedToken != null && cachedToken.isValid()) {
            return Optional.of(cachedToken.accessToken());
        }

        // 3. Resolve credential file: properties -> GOOGLE_APPLICATION_CREDENTIALS -> standard gcloud ADC
        File credsFile = resolveCredentialsFile();
        if (credsFile == null || !credsFile.exists() || !credsFile.canRead()) {
            log.debug("No valid Google Cloud credentials file resolved");
            return Optional.empty();
        }

        try {
            String jsonContent = Files.readString(credsFile.toPath(), StandardCharsets.UTF_8);
            Map<String, Object> jsonMap = SimpleJson.parseObject(jsonContent);

            String type = SimpleJson.getString(jsonMap, "type", "service_account");

            if ("authorized_user".equalsIgnoreCase(type)) {
                // User ADC from `gcloud auth application-default login`
                return refreshAuthorizedUserToken(jsonMap);
            } else {
                // Service Account credentials
                return exchangeServiceAccountJwt(jsonContent, jsonMap);
            }

        } catch (Exception exc) {
            log.error("Failed to acquire Google Cloud OAuth2 token: {}", exc.getMessage());
            return Optional.empty();
        }
    }

    private File resolveCredentialsFile() {
        if (properties.hasServiceAccountCredentials()) {
            return new File(properties.getCredentialsPath());
        }

        String envCredentials = System.getenv("GOOGLE_APPLICATION_CREDENTIALS");
        if (envCredentials != null && !envCredentials.isBlank()) {
            return new File(envCredentials.trim());
        }

        // Check standard gcloud ADC file
        String appData = System.getenv("APPDATA");
        if (appData != null && !appData.isBlank()) {
            File winAdc = new File(appData, "gcloud/application_default_credentials.json");
            if (winAdc.exists() && winAdc.canRead()) {
                return winAdc;
            }
        }

        String userHome = System.getProperty("user.home");
        if (userHome != null && !userHome.isBlank()) {
            File unixAdc = new File(userHome, ".config/gcloud/application_default_credentials.json");
            if (unixAdc.exists() && unixAdc.canRead()) {
                return unixAdc;
            }
        }

        return null;
    }

    private Optional<String> exchangeServiceAccountJwt(String rawJson, Map<String, Object> jsonMap) throws Exception {
        String clientEmail = SimpleJson.getString(jsonMap, "client_email", null);
        String privateKeyPem = SimpleJson.getString(jsonMap, "private_key", null);

        if (clientEmail == null || privateKeyPem == null) {
            // Fallback pattern extraction if pem formatting has complex linebreaks
            clientEmail = extractJsonField(rawJson, "client_email");
            privateKeyPem = extractJsonField(rawJson, "private_key");
        }

        if (clientEmail == null || privateKeyPem == null) {
            log.warn("Invalid Service Account JSON: missing client_email or private_key");
            return Optional.empty();
        }

        PrivateKey privateKey = parsePrivateKey(privateKeyPem);
        String signedJwt = buildSignedJwt(clientEmail, properties.getOauthTokenUrl(), privateKey);

        String requestBody = "grant_type=" + URLEncoder.encode("urn:ietf:params:oauth:grant-type:jwt-bearer", StandardCharsets.UTF_8)
                + "&assertion=" + URLEncoder.encode(signedJwt, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOauthTokenUrl()))
                .timeout(Duration.ofSeconds(6))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            Map<String, Object> respMap = SimpleJson.parseObject(response.body());
            String token = SimpleJson.getString(respMap, "access_token", null);
            long expiresIn = SimpleJson.getLong(respMap, "expires_in", 3600L);

            if (token != null) {
                this.cachedToken = new CachedToken(token, Instant.now().plusSeconds(expiresIn));
                log.info("Successfully refreshed Google Cloud OAuth2 token (Service Account), expires in {}s", expiresIn);
                return Optional.of(token);
            }
        }

        log.error("Google OAuth token exchange failed with HTTP {}: {}", response.statusCode(), response.body());
        return Optional.empty();
    }

    private Optional<String> refreshAuthorizedUserToken(Map<String, Object> jsonMap) throws Exception {
        String clientId = SimpleJson.getString(jsonMap, "client_id", null);
        String clientSecret = SimpleJson.getString(jsonMap, "client_secret", null);
        String refreshToken = SimpleJson.getString(jsonMap, "refresh_token", null);

        if (clientId == null || clientSecret == null || refreshToken == null) {
            log.warn("Invalid authorized_user ADC JSON: missing client_id, client_secret, or refresh_token");
            return Optional.empty();
        }

        String requestBody = "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8)
                + "&grant_type=refresh_token";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(properties.getOauthTokenUrl()))
                .timeout(Duration.ofSeconds(6))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() == 200) {
            Map<String, Object> respMap = SimpleJson.parseObject(response.body());
            String token = SimpleJson.getString(respMap, "access_token", null);
            long expiresIn = SimpleJson.getLong(respMap, "expires_in", 3600L);

            if (token != null) {
                this.cachedToken = new CachedToken(token, Instant.now().plusSeconds(expiresIn));
                log.info("Successfully refreshed Google Cloud OAuth2 token (ADC User), expires in {}s", expiresIn);
                return Optional.of(token);
            }
        }

        log.error("Google ADC user token refresh failed with HTTP {}: {}", response.statusCode(), response.body());
        return Optional.empty();
    }

    private PrivateKey parsePrivateKey(String pemKey) throws Exception {
        String cleanKey = pemKey
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replace("\\n", "")
                .replaceAll("\\s+", "");

        byte[] keyBytes = Base64.getDecoder().decode(cleanKey);
        PKCS8EncodedKeySpec spec = new PKCS8EncodedKeySpec(keyBytes);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return kf.generatePrivate(spec);
    }

    private String buildSignedJwt(String clientEmail, String tokenUrl, PrivateKey privateKey) {
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(clientEmail)
                .subject(clientEmail)
                .audience().add(tokenUrl).and()
                .claim("scope", GOOGLE_OAUTH_SCOPES)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(3600)))
                .signWith(privateKey, Jwts.SIG.RS256)
                .compact();
    }

    private String extractJsonField(String json, String field) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*\"?([^\"\\n\\r,}]+)\"?");
        Matcher matcher = pattern.matcher(json);
        if (matcher.find()) {
            return matcher.group(1).trim().replace("\\n", "\n");
        }
        return null;
    }
}
