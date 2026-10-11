package com.example.healthcare.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequest(
		@NotBlank(message = "Please enter your email")
		@Email(message = "Invalid email address")
		String email) {
}
