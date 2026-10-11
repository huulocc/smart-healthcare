package com.example.healthcare.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
		@NotBlank(message = "The reset link is missing its token")
		String token,

		@NotBlank(message = "Please enter a new password")
		@Size(min = 6, max = 72, message = "New password must be between 6 and 72 characters")
		String newPassword) {
}
