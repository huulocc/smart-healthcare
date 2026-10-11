package com.example.healthcare.backend.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
		// The ID token that Google Identity Services gives the browser.
		@NotBlank(message = "Missing Google credential")
		String credential,

		Boolean rememberMe) {

	public boolean isRememberMe() {
		return Boolean.TRUE.equals(rememberMe);
	}
}
