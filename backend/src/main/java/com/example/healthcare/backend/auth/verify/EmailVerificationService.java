package com.example.healthcare.backend.auth.verify;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.common.Emails;
import com.example.healthcare.backend.common.Tokens;
import com.example.healthcare.backend.user.User;
import com.example.healthcare.backend.user.UserRepository;

@Service
public class EmailVerificationService {

	public static final Duration TOKEN_LIFETIME = Duration.ofHours(24);

	private final UserRepository userRepository;
	private final EmailVerificationTokenRepository tokenRepository;
	private final EmailVerificationMailer mailer;
	private final String frontendUrl;

	public EmailVerificationService(
			UserRepository userRepository,
			EmailVerificationTokenRepository tokenRepository,
			EmailVerificationMailer mailer,
			@Value("${app.frontend-url}") String frontendUrl) {
		this.userRepository = userRepository;
		this.tokenRepository = tokenRepository;
		this.mailer = mailer;
		this.frontendUrl = frontendUrl;
	}

	/** Called right after sign-up, and again when the user asks for a new link. */
	@Transactional
	public void sendVerificationLink(User user) {
		Instant now = Instant.now();
		tokenRepository.invalidateUnusedTokens(user, now);

		String rawToken = Tokens.newRawToken();
		EmailVerificationToken token = new EmailVerificationToken();
		token.setUser(user);
		token.setTokenHash(Tokens.hash(rawToken));
		token.setExpiresAt(now.plus(TOKEN_LIFETIME));
		tokenRepository.save(token);

		mailer.sendVerificationLink(user, frontendUrl + "/verify-email?token=" + rawToken);
	}

	@Transactional
	public void verify(String rawToken) {
		Instant now = Instant.now();
		EmailVerificationToken token = tokenRepository.findByTokenHash(Tokens.hash(rawToken))
				.filter(found -> found.isUsable(now))
				.orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST,
						"This activation link is invalid or has expired. Please ask for a new one."));

		token.getUser().setEmailVerified(true);
		token.setUsedAt(now);
	}

	@Transactional
	public void resend(String email) {
		Optional<User> found = userRepository.findByEmail(Emails.normalize(email));
		// Unknown address or an account that is already active: answer the same way, so the API
		// never reveals who has an account.
		found.filter(user -> !user.isEmailVerified()).ifPresent(this::sendVerificationLink);
	}
}
