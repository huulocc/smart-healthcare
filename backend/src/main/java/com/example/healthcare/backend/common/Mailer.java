package com.example.healthcare.backend.common;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import lombok.extern.slf4j.Slf4j;

/** Sends the plain-text emails of the app, or logs the link when Gmail is not configured. */
@Slf4j
@Component
public class Mailer {

	private final JavaMailSender mailSender;
	private final String fromAddress;

	public Mailer(JavaMailSender mailSender, @Value("${spring.mail.username:}") String fromAddress) {
		this.mailSender = mailSender;
		this.fromAddress = fromAddress;
	}

	/**
	 * @param linkForLog printed instead of sending when MAIL_USERNAME is empty, so a teammate
	 *                   without Gmail credentials can still copy the link out of the console.
	 */
	public void send(String to, String subject, String body, String linkForLog) {
		if (fromAddress.isBlank()) {
			log.info("MAIL_USERNAME is not set, so no email was sent. Link for {}: {}", to, linkForLog);
			return;
		}

		SimpleMailMessage message = new SimpleMailMessage();
		message.setFrom(fromAddress);
		message.setTo(to);
		message.setSubject(subject);
		message.setText(body);

		try {
			mailSender.send(message);
		} catch (MailException ex) {
			// Never fail the request: the API answers the same way whether or not the email exists.
			log.error("Could not send \"{}\" to {}", subject, to, ex);
		}
	}
}
