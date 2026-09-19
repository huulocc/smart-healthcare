package com.example.healthcare.backend.auth.dto;

import com.example.healthcare.backend.user.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
		@NotBlank(message = "Please enter your full name")
		@Size(max = 100, message = "Full name must be at most 100 characters")
		String fullName,

		@NotBlank(message = "Please enter your email")
		@Email(message = "Invalid email address")
		String email,

		@NotBlank(message = "Please enter your phone number")
		@Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$", message = "Invalid phone number")
		String phone,

		// BCrypt only uses the first 72 bytes of a password.
		@NotBlank(message = "Please enter a password")
		@Size(min = 6, max = 72, message = "Password must be between 6 and 72 characters")
		String password,

		// PATIENT or DOCTOR; null means PATIENT. A DOCTOR request still needs admin approval.
		Role role) {
}
