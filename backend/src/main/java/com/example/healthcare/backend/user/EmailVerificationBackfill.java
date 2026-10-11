package com.example.healthcare.backend.user;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Email verification was added after people already had accounts. Their rows have
 * email_verified = NULL, which would lock them out, so they are treated as already verified.
 * Runs once per start-up and does nothing after the first time.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailVerificationBackfill implements ApplicationRunner {

	private final UserRepository userRepository;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		int updated = userRepository.markExistingAccountsVerified();
		if (updated > 0) {
			log.info("Marked {} account(s) created before email verification as verified", updated);
		}
	}
}
