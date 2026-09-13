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

	public JwtService(
			@Value("${app.jwt.secret}") String secret,
			@Value("${app.jwt.expiration-seconds}") long expirationSeconds) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
		this.expirationSeconds = expirationSeconds;
	}

	public String generateToken(User user) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(user.getId().toString())
				.claim("email", user.getEmail())
				.claim("role", user.getRole().name())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusSeconds(expirationSeconds)))
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
}
