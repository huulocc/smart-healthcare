package com.example.healthcare.backend.user;

import java.time.Instant;
import java.time.LocalDate;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 100)
	private String fullName;

	@Column(nullable = false, unique = true)
	private String email;

	@Column(nullable = false, length = 20)
	private String phone;

	private LocalDate dob;

	private String address;

	@Column(nullable = false)
	private String passwordHash;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Role role;

	// What the user asked to be at sign-up. Only an admin may turn it into the real role.
	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private Role requestedRole;

	// Nullable so accounts created before this feature existed are not locked out;
	// EmailVerificationBackfill turns those nulls into true on the next start-up.
	private Boolean emailVerified;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public boolean isEmailVerified() {
		return Boolean.TRUE.equals(emailVerified);
	}
}
