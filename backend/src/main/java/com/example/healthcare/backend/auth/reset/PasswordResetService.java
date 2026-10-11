package com.example.healthcare.backend.auth.reset;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.common.Tokens;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;

@Service
public class PasswordResetService {

	public static final Duration TOKEN_LIFETIME = Duration.ofMinutes(15);

	private final UserRepository userRepository;
	private final PasswordResetTokenRepository tokenRepository;
	private final PasswordResetMailer mailer;
	private final PasswordEncoder passwordEncoder;
	private final String frontendUrl;

	public PasswordResetService(
			UserRepository userRepository,
			PasswordResetTokenRepository tokenRepository,
			PasswordResetMailer mailer,
			PasswordEncoder passwordEncoder,
			@Value("${app.frontend-url}") String frontendUrl) {
		this.userRepository = userRepository;
		this.tokenRepository = tokenRepository;
		this.mailer = mailer;
		this.passwordEncoder = passwordEncoder;
		this.frontendUrl = frontendUrl;
	}

	@Transactional
	public void requestReset(String email) {
		Optional<User> found = userRepository.findByEmail(Emails.normalize(email));
		if (found.isEmpty()) {
			// Answer exactly like a registered email so the API does not reveal who has an account.
			return;
		}

		User user = found.get();
		Instant now = Instant.now();
		tokenRepository.invalidateUnusedTokens(user, now);

		String rawToken = Tokens.newRawToken();
		PasswordResetToken token = new PasswordResetToken();
		token.setUser(user);
		token.setTokenHash(Tokens.hash(rawToken));
		token.setExpiresAt(now.plus(TOKEN_LIFETIME));
		tokenRepository.save(token);

		mailer.sendResetLink(user, frontendUrl + "/reset-password?token=" + rawToken);
	}

	@Transactional
	public void resetPassword(String rawToken, String newPassword) {
		Instant now = Instant.now();
		PasswordResetToken token = tokenRepository.findByTokenHash(Tokens.hash(rawToken))
				.filter(found -> found.isUsable(now))
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
						"This reset link is invalid or has expired. Please request a new one."));

		User user = token.getUser();
		user.setPasswordHash(passwordEncoder.encode(newPassword));
		// Opening this link proves the address belongs to them, so the account counts as activated.
		user.setEmailVerified(true);
		token.setUsedAt(now);
	}
}
