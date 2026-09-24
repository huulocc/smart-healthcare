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
		Instant requestedAt) {

	public static DoctorRequestResponse from(User user) {
		return new DoctorRequestResponse(user.getId(), user.getFullName(), user.getEmail(), user.getPhone(),
				user.isEmailVerified(), user.getCreatedAt());
	}
}
