package com.example.healthcare.backend.auth.reset;

import org.springframework.stereotype.Component;

import com.example.healthcare.backend.common.Mailer;
import com.example.healthcare.backend.user.User;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class PasswordResetMailer {

	private final Mailer mailer;

	public void sendResetLink(User user, String link) {
		mailer.send(user.getEmail(), "Reset your Smart Healthcare password", """
				Hi %s,

				We received a request to reset your Smart Healthcare password.
				Open the link below to choose a new password. It expires in %d minutes and can be used only once.

				%s

				If you did not request this, you can safely ignore this email.
				""".formatted(user.getFullName(), PasswordResetService.TOKEN_LIFETIME.toMinutes(), link), link);
	}
}
