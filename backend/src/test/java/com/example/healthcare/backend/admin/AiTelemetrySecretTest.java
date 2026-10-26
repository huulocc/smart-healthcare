package com.example.healthcare.backend.admin;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import com.example.healthcare.backend.admin.ai.AiTelemetryController;
import com.example.healthcare.backend.common.ApiException;

class AiTelemetrySecretTest {

    @Test
    void telemetryRejectsRequestsWhenSecretIsNotConfigured() {
        AiTelemetryController controller = new AiTelemetryController(null, "");
        assertThatThrownBy(() -> controller.recordTelemetry(null, null, null))
                .isInstanceOf(ApiException.class)
                .extracting("status")
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }
}
