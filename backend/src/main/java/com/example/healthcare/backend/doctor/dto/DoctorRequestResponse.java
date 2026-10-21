package com.example.healthcare.backend.doctor.dto;

import java.time.Instant;

import com.example.healthcare.backend.user.User;

/** Someone who signed up asking to be a doctor and is waiting for an admin. */
public record DoctorRequestResponse(
		Long userId,
		String fullName,
		String email,
		String phone,
		// Shown so the admin knows why Approve will refuse an account that is not activated yet.
		boolean emailVerified,
		// When the account was created. Asking to be a doctor happens at sign-up and is not
		// recorded as an event of its own, so there is no separate "applied at".
		Instant registeredAt) {

	public static DoctorRequestResponse from(User user) {
		return new DoctorRequestResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
				user.isEmailVerified(), user.getCreatedAt());
	}
}
