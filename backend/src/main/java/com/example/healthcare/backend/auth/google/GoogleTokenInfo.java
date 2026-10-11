package com.example.healthcare.backend.auth.google;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * The part of Google's tokeninfo answer we care about.
 * Google checks the signature and the expiry before answering, so the only thing
 * left for us to check is that the token was issued for our own app.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record GoogleTokenInfo(
		String aud,
		String sub,
		String email,
		// Google sends this as the string "true", not as a JSON boolean.
		@JsonProperty("email_verified") String emailVerified,
		String name) {

	public boolean isEmailVerified() {
		return "true".equalsIgnoreCase(emailVerified);
	}
}
