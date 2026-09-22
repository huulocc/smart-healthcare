package com.example.healthcare.backend.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.example.healthcare.backend.common.Emails;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Creates the first admin account.
 *
 * Nobody can sign up as an admin: AuthService.register() rejects role=ADMIN on purpose, so
 * without this there is no way to get one. The credentials come from ADMIN_EMAIL and
 * ADMIN_PASSWORD in backend/.env rather than from a seed migration, because a BCrypt hash
 * committed to git is a permanent public credential with no revocation path -- and a demo
 * admin password falls to a wordlist in seconds however slow the hash is. It also has to
 * be Java rather than SQL for a plain mechanical reason: hashing needs the PasswordEncoder.
 *
 * Runs on every start-up and does nothing once an admin exists, so it can never quietly
 * reset an admin password that was changed through the app, and it cannot be used to
 * escalate by editing .env afterwards.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AdminAccountBootstrap implements ApplicationRunner {

	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;

	@Value("${app.admin.email:}")
	private String email;

	@Value("${app.admin.password:}")
	private String password;

	@Value("${app.admin.full-name:System Administrator}")
	private String fullName;

	@Value("${app.admin.phone:0000000000}")
	private String phone;

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		// Blank is the normal case for a teammate's first run, so it is not a warning.
		if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
			log.info("No ADMIN_EMAIL/ADMIN_PASSWORD set, skipping admin bootstrap");
			return;
		}
		if (password.length() < 8) {
			log.error("ADMIN_PASSWORD is shorter than 8 characters, not creating the admin account");
			return;
		}

		if (userRepository.existsByRole(Role.ADMIN)) {
			return;
		}

		String normalised = Emails.normalize(email);
		if (userRepository.existsByEmail(normalised)) {
			// Never promote an existing row: that would turn a patient into an admin by
			// editing a config file.
			log.warn("ADMIN_EMAIL {} already belongs to a non-admin account, not creating the admin account", normalised);
			return;
		}

		User admin = new User();
		admin.setFullName(fullName);
		admin.setEmail(normalised);
		admin.setPhone(phone);
		admin.setPasswordHash(passwordEncoder.encode(password));
		admin.setRole(Role.ADMIN);
		// An admin is created, not requested, and there is no mailbox to activate.
		admin.setRequestedRole(null);
		admin.setEmailVerified(true);

		userRepository.save(admin);
		log.info("Created the bootstrap admin account {}", normalised);
	}
}
