package com.example.healthcare.backend.auth.verify;

import org.springframework.stereotype.Component;

import com.example.healthcare.backend.common.Mailer;
import com.example.healthcare.backend.user.User;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class EmailVerificationMailer {

	private final Mailer mailer;

	public void sendVerificationLink(User user, String link) {
		mailer.send(user.getEmail(), "Activate your Smart Healthcare account", """
				Hi %s,

				Thanks for signing up for Smart Healthcare.
				Open the link below to activate your account. It expires in %d hours and can be used only once.

				%s

				If you did not sign up, you can safely ignore this email.
				""".formatted(user.getFullName(), EmailVerificationService.TOKEN_LIFETIME.toHours(), link), link);
	}
}
