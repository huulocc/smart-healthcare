package com.example.healthcare.backend.user.dto;

import java.time.LocalDate;

import com.example.healthcare.backend.user.Role;
import com.example.healthcare.backend.user.User;

public record UserResponse(
		Long id,
		String fullName,
		String email,
		String phone,
		LocalDate dob,
		String address,
		Role role) {

	public static UserResponse from(User user) {
		return new UserResponse(
				user.getId(),
				user.getFullName(),
				user.getEmail(),
				user.getPhone(),
				user.getDob(),
				user.getAddress(),
				user.getRole());
	}
}
