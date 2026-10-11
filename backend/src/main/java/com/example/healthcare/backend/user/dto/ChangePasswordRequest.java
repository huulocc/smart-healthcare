package com.example.healthcare.backend.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
		@NotBlank(message = "Please enter your current password")
		String currentPassword,

		@NotBlank(message = "Please enter a new password")
		@Size(min = 6, max = 72, message = "New password must be between 6 and 72 characters")
		String newPassword) {
}
