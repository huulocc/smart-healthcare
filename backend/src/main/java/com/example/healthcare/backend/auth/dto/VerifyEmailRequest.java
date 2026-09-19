package com.example.healthcare.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyEmailRequest(
		@NotBlank(message = "The activation link is missing its token")
		String token) {
}
