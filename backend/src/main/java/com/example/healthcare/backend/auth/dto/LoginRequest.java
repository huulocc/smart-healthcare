package com.example.healthcare.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
		@NotBlank(message = "Please enter your email")
		@Email(message = "Invalid email address")
		String email,

		@NotBlank(message = "Please enter your password")
		String password,

		// "Keep me logged in for 30 days". Absent in older clients, so it is a Boolean.
		Boolean rememberMe) {

	public boolean isRememberMe() {
		return Boolean.TRUE.equals(rememberMe);
	}
}
