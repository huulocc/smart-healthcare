package com.example.healthcare.backend.auth.reset;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import com.example.healthcare.backend.user.User;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
public class PasswordResetMailer {

	private final JavaMailSender mailSender;
	private final String fromAddress;

	public PasswordResetMailer(JavaMailSender mailSender, @Value("${spring.mail.username:}") String fromAddress) {
		this.mailSender = mailSender;
		this.fromAddress = fromAddress;
	}

	public void sendResetLink(User user, String link) {
		// Lets teammates without Gmail credentials still test the flow locally.
		if (fromAddress.isBlank()) {
			log.info("MAIL_USERNAME is not set, so no email was sent. Password reset link for {}: {}", user.getEmail(), link);
			return;
		}

		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(fromAddress);
		message.setTo(user.getEmail());
		message.setSubject("Reset your Smart Healthcare password");
		message.setText("""
				Hi %s,

				We received a request to reset your Smart Healthcare password.
				Open the link below to choose a new password. It expires in %d minutes and can be used only once.

				%s

				If you did not request this, you can safely ignore this email.
				""".formatted(user.getFullName(), PasswordResetService.TOKEN_LIFETIME.toMinutes(), link));

		try {
			mailSender.send(message);
		} catch (MailException ex) {
			// The API still answers 202 so it never reveals whether an email address is registered.
			log.error("Could not send password reset email to {}", user.getEmail(), ex);
		}
	}
}
