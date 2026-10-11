package com.example.healthcare.backend.auth.dto;

import com.example.healthcare.backend.user.dto.UserResponse;

public record LoginResponse(
		String accessToken,
		String tokenType,
		long expiresIn,
		UserResponse user) {
}
