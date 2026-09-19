package com.example.healthcare.backend.auth.jwt;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.example.healthcare.backend.auth.AuthenticatedUser;
import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {

	private final SecretKey key;
	private final long expirationSeconds;
	private final long rememberMeExpirationSeconds;

	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-seconds}") long expirationSeconds,
			@Value("${app.jwt.remember-me-expiration-seconds}") long rememberMeExpirationSeconds) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.expirationSeconds = expirationSeconds;
		this.rememberMeExpirationSeconds = rememberMeExpirationSeconds;
	}

	public String generateToken(User user) {
		return generateToken(user, false);
	}

	/** A token from "remember me" lives for 30 days instead of one hour. */
	public String generateToken(User user, boolean rememberMe) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(user.getId().toString())
				.claim("email", user.getEmail())
				.claim("role", user.getRole().name())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusSeconds(getExpirationSeconds(rememberMe))))
				.signWith(key, Jwts.SIG.HS256)
				.compact();
	}

	/**
	 * Checks the signature and expiry of the token.
	 *
	 * @throws JwtException if the token is invalid, tampered with or expired
	 */
	public AuthenticatedUser parseToken(String token) {
		Claims claims = Jwts.parser()
				.verifyWith(key)
				.build()
				.parseSignedClaims(token)
				.getPayload();

		return new AuthenticatedUser(
				Long.valueOf(claims.getSubject()),
				claims.get("email", String.class),
				Role.valueOf(claims.get("role", String.class)));
	}

	public long getExpirationSeconds() {
		return expirationSeconds;
	}

	public long getExpirationSeconds(boolean rememberMe) {
		return rememberMe ? rememberMeExpirationSeconds : expirationSeconds;
	}
}
