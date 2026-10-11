package com.example.healthcare.backend.auth.google;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.example.healthcare.backend.auth.AuthService;
import com.example.healthcare.backend.auth.dto.LoginResponse;
import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.common.Tokens;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * "Continue with Google". The browser receives an ID token from Google and posts it here.
 * We hand that token back to Google to be decoded, which also proves its signature,
 * instead of pulling in an extra library to do it ourselves.
 */
@Slf4j
@Service
public class GoogleAuthService {

	private static final String TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
	private static final String FAILED_MESSAGE = "Google sign-in failed. Please try again.";

	private final RestClient restClient;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final AuthService authService;
	private final String clientId;

	public GoogleAuthService(
			UserRepository userRepository,
			PasswordEncoder passwordEncoder,
			AuthService authService,
			@Value("${app.google.client-id:}") String clientId) {
		this.restClient = RestClient.create();
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.authService = authService;
		this.clientId = clientId;
	}

	public boolean isEnabled() {
		return !clientId.isBlank();
	}

	@Transactional
	public LoginResponse login(String credential, boolean rememberMe) {
		if (!isEnabled()) {
			throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Google sign-in is not set up on this server yet.");
		}

		GoogleTokenInfo info = fetchTokenInfo(credential);
		// Without the aud check, a token issued for somebody else's app would be accepted here.
		if (info == null || !clientId.equals(info.aud()) || !info.isEmailVerified() || info.email() == null) {
			throw new ApiException(HttpStatus.UNAUTHORIZED, FAILED_MESSAGE);
		}

		String email = Emails.normalize(info.email());
		User user = userRepository.findByEmail(email).orElseGet(() -> createAccount(info, email));
		// Google has already proven the address belongs to them, so skip our own email check.
		if (!user.isEmailVerified()) {
			user.setEmailVerified(true);
		}

		return authService.issueLogin(user, rememberMe);
	}

	private GoogleTokenInfo fetchTokenInfo(String credential) {
		try {
			return restClient.get()
					.uri(TOKEN_INFO_URL + "?id_token={token}", credential)
					.retrieve()
					.body(GoogleTokenInfo.class);
		} catch (RestClientException ex) {
			// Expired, tampered with, or Google is unreachable. The user only sees "please try again".
			log.warn("Could not verify a Google ID token", ex);
			throw new ApiException(HttpStatus.UNAUTHORIZED, FAILED_MESSAGE);
		}
	}

	private User createAccount(GoogleTokenInfo info, String email) {
		User user = new User();
		user.setFullName(info.name() == null || info.name().isBlank() ? email : info.name());
		user.setEmail(email);
		// Google does not give us a phone number; the user fills it in on the profile page.
		user.setPhone("");
		// No password was ever chosen, so this hash matches nothing. "Forgot password" sets a real one.
		user.setPasswordHash(passwordEncoder.encode(Tokens.newRawToken()));
		user.setRole(Role.PATIENT);
		user.setRequestedRole(Role.PATIENT);
		user.setEmailVerified(true);
		return userRepository.save(user);
	}
}
