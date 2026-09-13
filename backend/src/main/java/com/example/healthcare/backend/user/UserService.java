package com.example.healthcare.backend.user;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.healthcare.backend.common.ApiException;
import com.example.healthcare.backend.user.dto.UserResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserService {

	private final UserRepository userRepository;

	@Transactional(readOnly = true)
	public UserResponse getProfile(Long userId) {
		return UserResponse.from(findUser(userId));
	}

	private User findUser(Long userId) {
		// The token can outlive the account (e.g. account deleted after login).
		return userRepository.findById(userId)
				.orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Your account no longer exists. Please log in again."));
	}
}
